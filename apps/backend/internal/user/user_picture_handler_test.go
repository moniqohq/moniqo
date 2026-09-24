/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

package user_test

import (
	"bytes"
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

// Minimal-but-valid magic bytes for each allowlisted format, padded so
// http.DetectContentType (which only inspects the first 512 bytes) has
// enough to work with.
var (
	pngBytes  = append([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}, make([]byte, 24)...)
	jpegBytes = append([]byte{0xFF, 0xD8, 0xFF, 0xE0}, make([]byte, 24)...)
	webpBytes = func() []byte {
		b := []byte("RIFF")
		b = append(b, 0, 0, 0, 0) // chunk size, unchecked by DetectContentType
		b = append(b, []byte("WEBPVP8 ")...)
		return append(b, make([]byte, 24)...)
	}()
	textBytes = []byte("this is definitely not an image, just plain text padding")
)

// newPictureUploadCtx builds a multipart/form-data PUT request for the
// picture upload endpoint. A nil fileContent omits the "file" part entirely
// (used to test the "missing file" validation case).
func newPictureUploadCtx(e *echo.Echo, pathID string, fileContent []byte, authedAs int64) (echo.Context, *httptest.ResponseRecorder) {
	body := &bytes.Buffer{}
	w := multipart.NewWriter(body)
	if fileContent != nil {
		part, err := w.CreateFormFile("file", "avatar.bin")
		if err != nil {
			panic(err)
		}
		if _, err := part.Write(fileContent); err != nil {
			panic(err)
		}
	}
	if err := w.Close(); err != nil {
		panic(err)
	}

	req := httptest.NewRequest(http.MethodPut, "/api/v1/users/"+pathID+"/picture", body)
	req.Header.Set(echo.HeaderContentType, w.FormDataContentType())
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues(pathID)
	if authedAs != 0 {
		withClaims(c, authedAs)
	}
	return c, rec
}

// newPictureGetCtx builds an unauthenticated GET request for the picture
// endpoint — matching how it is actually served in production (see
// newAuthSkipper in cmd/server/main.go).
func newPictureGetCtx(e *echo.Echo, pathID, ifNoneMatch string) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+pathID+"/picture", nil)
	if ifNoneMatch != "" {
		req.Header.Set("If-None-Match", ifNoneMatch)
	}
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues(pathID)
	return c, rec
}

func newPictureDeleteCtx(e *echo.Echo, pathID string, authedAs int64) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/users/"+pathID+"/picture", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues(pathID)
	if authedAs != 0 {
		withClaims(c, authedAs)
	}
	return c, rec
}

func TestDetectContentTypeRecognizesAllowlistedFormats(t *testing.T) {
	t.Parallel()

	cases := map[string][]byte{
		"image/png":  pngBytes,
		"image/jpeg": jpegBytes,
		"image/webp": webpBytes,
	}
	for want, data := range cases {
		t.Run(want, func(t *testing.T) {
			t.Parallel()
			got := http.DetectContentType(data)
			assert.Equal(t, want, got, "http.DetectContentType must recognize this format for the upload allowlist to work")
		})
	}
}

func TestHandler_UploadPicture(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	tests := []struct {
		name        string
		pathID      string
		authedAs    int64
		fileContent []byte
		limit       int64 // 0 means "use default"
		svc         user.Service
		wantStatus  int
		wantSuccess bool
		wantField   string
	}{
		{
			name:        "no auth claims returns 401",
			pathID:      "7",
			authedAs:    0,
			fileContent: pngBytes,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusUnauthorized,
			wantSuccess: false,
		},
		{
			name:        "id mismatch returns 403",
			pathID:      "99",
			authedAs:    testUserID,
			fileContent: pngBytes,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusForbidden,
			wantSuccess: false,
		},
		{
			name:        "missing file part returns 400",
			pathID:      "7",
			authedAs:    testUserID,
			fileContent: nil,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantField:   "file",
		},
		{
			name:        "non-image content returns 400",
			pathID:      "7",
			authedAs:    testUserID,
			fileContent: textBytes,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantField:   "file",
		},
		{
			name:        "oversized upload returns 400",
			pathID:      "7",
			authedAs:    testUserID,
			fileContent: pngBytes,
			limit:       8, // smaller than pngBytes
			svc:         &mock.UserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantField:   "file",
		},
		{
			name:        "user not found returns 404",
			pathID:      "7",
			authedAs:    testUserID,
			fileContent: pngBytes,
			svc: &mock.UserService{
				SetPictureFn: func(_ context.Context, _ int64, _ user.PictureUpload) (models.User, error) {
					return models.User{}, user.ErrNotFound
				},
			},
			wantStatus:  http.StatusNotFound,
			wantSuccess: false,
		},
		{
			name:        "success returns 200 with sniffed content type",
			pathID:      "7",
			authedAs:    testUserID,
			fileContent: pngBytes,
			svc: &mock.UserService{
				SetPictureFn: func(_ context.Context, id int64, in user.PictureUpload) (models.User, error) {
					assert.Equal(t, "image/png", in.ContentType)
					assert.NotEmpty(t, in.ETag)
					u := profileUser()
					u.Picture = "/api/v1/users/7/picture"
					return u, nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c, rec := newPictureUploadCtx(e, tc.pathID, tc.fileContent, tc.authedAs)
			h := user.NewHandler(tc.svc, "http://localhost:3000", log)
			if tc.limit > 0 {
				h.SetAvatarLimit(tc.limit)
			}
			require.NoError(t, h.UploadPicture(c))
			assert.Equal(t, tc.wantStatus, rec.Code)
			resp, data := parseEnvelope(t, rec.Body.String())
			assert.Equal(t, tc.wantSuccess, resp.Success)
			if tc.wantField != "" {
				fields, _ := data["fields"].([]any)
				require.NotEmpty(t, fields)
				first, _ := fields[0].(map[string]any)
				assert.Equal(t, tc.wantField, first["field"])
			}
		})
	}
}

func TestHandler_GetPicture(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	t.Run("stored picture returns 200 with ETag and streamed bytes", func(t *testing.T) {
		t.Parallel()
		svc := &mock.UserService{
			OpenPictureFn: func(_ context.Context, _ int64) (user.PictureResult, error) {
				return user.PictureResult{
					Kind: user.PictureStored,
					Body: io.NopCloser(bytes.NewReader(pngBytes)),
					Meta: user.AvatarMeta{ContentType: "image/png", ETag: "abc123", Size: int64(len(pngBytes))},
				}, nil
			},
		}
		c, rec := newPictureGetCtx(e, "7", "")
		h := user.NewHandler(svc, "http://localhost:3000", log)
		require.NoError(t, h.GetPicture(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, `"abc123"`, rec.Header().Get("ETag"))
		assert.Equal(t, "image/png", rec.Header().Get("Content-Type"))
		assert.Equal(t, pngBytes, rec.Body.Bytes())
	})

	t.Run("matching If-None-Match returns 304", func(t *testing.T) {
		t.Parallel()
		svc := &mock.UserService{
			OpenPictureFn: func(_ context.Context, _ int64) (user.PictureResult, error) {
				return user.PictureResult{
					Kind: user.PictureStored,
					Body: io.NopCloser(bytes.NewReader(pngBytes)),
					Meta: user.AvatarMeta{ContentType: "image/png", ETag: "abc123"},
				}, nil
			},
		}
		c, rec := newPictureGetCtx(e, "7", `"abc123"`)
		h := user.NewHandler(svc, "http://localhost:3000", log)
		require.NoError(t, h.GetPicture(c))
		assert.Equal(t, http.StatusNotModified, rec.Code)
	})

	t.Run("no picture returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &mock.UserService{
			OpenPictureFn: func(_ context.Context, _ int64) (user.PictureResult, error) {
				return user.PictureResult{}, user.ErrNoPicture
			},
		}
		c, rec := newPictureGetCtx(e, "7", "")
		h := user.NewHandler(svc, "http://localhost:3000", log)
		require.NoError(t, h.GetPicture(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("user not found returns 404, same as no picture", func(t *testing.T) {
		t.Parallel()
		svc := &mock.UserService{
			OpenPictureFn: func(_ context.Context, _ int64) (user.PictureResult, error) {
				return user.PictureResult{}, user.ErrNotFound
			},
		}
		c, rec := newPictureGetCtx(e, "7", "")
		h := user.NewHandler(svc, "http://localhost:3000", log)
		require.NoError(t, h.GetPicture(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("external picture redirects", func(t *testing.T) {
		t.Parallel()
		svc := &mock.UserService{
			OpenPictureFn: func(_ context.Context, _ int64) (user.PictureResult, error) {
				return user.PictureResult{Kind: user.PictureExternal, ExternalURL: "https://lh3.googleusercontent.com/a/avatar.png"}, nil
			},
		}
		c, rec := newPictureGetCtx(e, "7", "")
		h := user.NewHandler(svc, "http://localhost:3000", log)
		require.NoError(t, h.GetPicture(c))
		assert.Equal(t, http.StatusFound, rec.Code)
		assert.Equal(t, "https://lh3.googleusercontent.com/a/avatar.png", rec.Header().Get("Location"))
	})

	t.Run("non-numeric id returns 404", func(t *testing.T) {
		t.Parallel()
		c, rec := newPictureGetCtx(e, "not-a-number", "")
		h := user.NewHandler(&mock.UserService{}, "http://localhost:3000", log)
		require.NoError(t, h.GetPicture(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})
}

func TestHandler_DeletePicture(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	t.Run("no auth claims returns 401", func(t *testing.T) {
		t.Parallel()
		c, rec := newPictureDeleteCtx(e, "7", 0)
		h := user.NewHandler(&mock.UserService{}, "http://localhost:3000", log)
		require.NoError(t, h.DeletePicture(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("id mismatch returns 403", func(t *testing.T) {
		t.Parallel()
		c, rec := newPictureDeleteCtx(e, "99", testUserID)
		h := user.NewHandler(&mock.UserService{}, "http://localhost:3000", log)
		require.NoError(t, h.DeletePicture(c))
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("success is idempotent", func(t *testing.T) {
		t.Parallel()
		svc := &mock.UserService{
			DeletePictureFn: func(_ context.Context, _ int64) (models.User, error) {
				return profileUser(), nil
			},
		}
		h := user.NewHandler(svc, "http://localhost:3000", log)

		c1, rec1 := newPictureDeleteCtx(e, "7", testUserID)
		require.NoError(t, h.DeletePicture(c1))
		assert.Equal(t, http.StatusOK, rec1.Code)

		// Calling again (nothing left to delete) is still a 200.
		c2, rec2 := newPictureDeleteCtx(e, "7", testUserID)
		require.NoError(t, h.DeletePicture(c2))
		assert.Equal(t, http.StatusOK, rec2.Code)
	})

	t.Run("user not found returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &mock.UserService{
			DeletePictureFn: func(_ context.Context, _ int64) (models.User, error) {
				return models.User{}, user.ErrNotFound
			},
		}
		c, rec := newPictureDeleteCtx(e, "7", testUserID)
		h := user.NewHandler(svc, "http://localhost:3000", log)
		require.NoError(t, h.DeletePicture(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("service error returns 500", func(t *testing.T) {
		t.Parallel()
		svc := &mock.UserService{
			DeletePictureFn: func(_ context.Context, _ int64) (models.User, error) {
				return models.User{}, errors.New("db down")
			},
		}
		c, rec := newPictureDeleteCtx(e, "7", testUserID)
		h := user.NewHandler(svc, "http://localhost:3000", log)
		require.NoError(t, h.DeletePicture(c))
		assert.Equal(t, http.StatusInternalServerError, rec.Code)
	})
}
