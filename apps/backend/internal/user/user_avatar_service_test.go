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
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/storage"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

func newAvatarSvc(repo *internalmock.UserRepository, store *internalmock.Storage) *user.Svc {
	svc := user.NewSvc(repo, newNoopMailer(), 4, "http://localhost:3000", []byte("test-secret"), zap.NewNop())
	svc.SetStorage(store)
	return svc
}

func TestSvc_SetPicture_PutsBeforeDBWrite(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	store := internalmock.NewStorage()

	repo.On("GetAvatarMeta", int64(1)).Return(user.AvatarMeta{}, "", nil)
	repo.On("SetAvatar", mock.AnythingOfType("SetAvatarParams")).
		Return(models.User{ID: 1, Picture: "/api/v1/users/1/picture"}, nil)

	svc := newAvatarSvc(repo, store)
	pub, err := svc.SetPicture(context.Background(), 1, user.PictureUpload{
		Data:        []byte("fake-png-bytes"),
		ContentType: "image/png",
		ETag:        "etag1",
	})

	require.NoError(t, err)
	assert.Equal(t, "/api/v1/users/1/picture", pub.Picture)
	assert.Len(t, store.Keys(), 1, "the new object must have been written to storage")
	repo.AssertExpectations(t)
}

func TestSvc_SetPicture_DBFailureCleansUpNewObject(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	store := internalmock.NewStorage()

	repo.On("GetAvatarMeta", int64(1)).Return(user.AvatarMeta{}, "", nil)
	repo.On("SetAvatar", mock.AnythingOfType("SetAvatarParams")).Return(models.User{}, errors.New("db down"))

	svc := newAvatarSvc(repo, store)
	_, err := svc.SetPicture(context.Background(), 1, user.PictureUpload{
		Data:        []byte("fake-png-bytes"),
		ContentType: "image/png",
		ETag:        "etag1",
	})

	require.Error(t, err)
	assert.Empty(t, store.Keys(), "the newly written object must be cleaned up after a DB failure")
	repo.AssertExpectations(t)
}

func TestSvc_SetPicture_PutFailureMeansNoDBWrite(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	store := internalmock.NewStorage()
	store.PutErr = errors.New("disk full")

	repo.On("GetAvatarMeta", int64(1)).Return(user.AvatarMeta{}, "", nil)
	// SetAvatar is deliberately not stubbed — if the service calls it despite
	// the Put failure, testify's mock will panic on the unexpected call.

	svc := newAvatarSvc(repo, store)
	_, err := svc.SetPicture(context.Background(), 1, user.PictureUpload{
		Data:        []byte("fake-png-bytes"),
		ContentType: "image/png",
		ETag:        "etag1",
	})

	require.Error(t, err)
	repo.AssertNotCalled(t, "SetAvatar", mock.Anything)
}

func TestSvc_SetPicture_ReplacesOldKey(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	store := internalmock.NewStorage()
	require.NoError(t, store.Put(context.Background(), "avatars/00/1/old.png", strings.NewReader("old bytes"), storage.ObjectMeta{}))

	repo.On("GetAvatarMeta", int64(1)).Return(user.AvatarMeta{Key: "avatars/00/1/old.png", ETag: "old-etag"}, "", nil)
	repo.On("SetAvatar", mock.AnythingOfType("SetAvatarParams")).
		Return(models.User{ID: 1, Picture: "/api/v1/users/1/picture"}, nil)

	svc := newAvatarSvc(repo, store)
	_, err := svc.SetPicture(context.Background(), 1, user.PictureUpload{
		Data:        []byte("new bytes"),
		ContentType: "image/png",
		ETag:        "new-etag",
	})

	require.NoError(t, err)
	assert.False(t, store.Has("avatars/00/1/old.png"), "the replaced object must be deleted")
	assert.Len(t, store.Keys(), 1, "exactly the new object should remain")
}

func TestSvc_SetPicture_SkipsWriteWhenETagMatches(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	store := internalmock.NewStorage()

	repo.On("GetAvatarMeta", int64(1)).Return(user.AvatarMeta{Key: "avatars/00/1/existing.png", ETag: "same-etag"}, "", nil)
	repo.On("GetByID", int64(1)).Return(models.User{ID: 1, Picture: "/api/v1/users/1/picture"}, nil)
	// SetAvatar is deliberately not stubbed: re-uploading identical bytes
	// must not touch the DB or storage at all.

	svc := newAvatarSvc(repo, store)
	pub, err := svc.SetPicture(context.Background(), 1, user.PictureUpload{
		Data:        []byte("identical bytes"),
		ContentType: "image/png",
		ETag:        "same-etag",
	})

	require.NoError(t, err)
	assert.Equal(t, "/api/v1/users/1/picture", pub.Picture)
	repo.AssertNotCalled(t, "SetAvatar", mock.Anything)
	assert.Empty(t, store.Keys(), "no new object should have been written")
}

func TestSvc_SetPicture_StorageUnavailable(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	svc := user.NewSvc(repo, newNoopMailer(), 4, "http://localhost:3000", []byte("test-secret"), zap.NewNop())
	// Deliberately no SetStorage call.

	_, err := svc.SetPicture(context.Background(), 1, user.PictureUpload{Data: []byte("x"), ContentType: "image/png", ETag: "e"})
	assert.ErrorIs(t, err, user.ErrStorageUnavailable)
}

func TestSvc_DeletePicture_ClearsDBBeforeStorage(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	store := internalmock.NewStorage()
	require.NoError(t, store.Put(context.Background(), "avatars/00/1/a.png", strings.NewReader("bytes"), storage.ObjectMeta{}))

	repo.On("GetAvatarMeta", int64(1)).Return(user.AvatarMeta{Key: "avatars/00/1/a.png"}, "", nil)
	repo.On("ClearAvatar", int64(1)).Return(models.User{ID: 1, Picture: ""}, nil)

	svc := newAvatarSvc(repo, store)
	pub, err := svc.DeletePicture(context.Background(), 1)

	require.NoError(t, err)
	assert.Equal(t, "", pub.Picture)
	assert.False(t, store.Has("avatars/00/1/a.png"))
	repo.AssertExpectations(t)
}

func TestSvc_DeletePicture_StorageFailureIsNonFatal(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	store := internalmock.NewStorage()
	store.DeleteErr = errors.New("disk error")

	repo.On("GetAvatarMeta", int64(1)).Return(user.AvatarMeta{Key: "avatars/00/1/a.png"}, "", nil)
	repo.On("ClearAvatar", int64(1)).Return(models.User{ID: 1}, nil)

	svc := newAvatarSvc(repo, store)
	_, err := svc.DeletePicture(context.Background(), 1)

	assert.NoError(t, err, "a storage delete failure must not fail the request — the DB has already been cleared")
}

func TestSvc_Delete_RemovesAvatarObject(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	store := internalmock.NewStorage()
	require.NoError(t, store.Put(context.Background(), "avatars/00/1/a.png", strings.NewReader("bytes"), storage.ObjectMeta{}))

	repo.On("GetAvatarMeta", int64(1)).Return(user.AvatarMeta{Key: "avatars/00/1/a.png"}, "", nil)
	repo.On("ClearAvatar", int64(1)).Return(models.User{ID: 1}, nil)
	repo.On("SoftDelete", int64(1)).Return(nil)

	svc := newAvatarSvc(repo, store)
	err := svc.Delete(context.Background(), 1)

	require.NoError(t, err)
	assert.False(t, store.Has("avatars/00/1/a.png"), "the avatar object must be removed when the user is soft-deleted")
	repo.AssertExpectations(t)
}
