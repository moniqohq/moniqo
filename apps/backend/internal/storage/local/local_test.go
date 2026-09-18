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

package local_test

import (
	"bytes"
	"errors"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/storage"
	"github.com/moniqohq/moniqo/apps/backend/internal/storage/local"
)

func newStore(t *testing.T) *local.Local {
	t.Helper()
	st, err := local.New(t.TempDir(), zap.NewNop())
	require.NoError(t, err)
	return st
}

func TestPutGetRoundTrip(t *testing.T) {
	st := newStore(t)
	ctx := t.Context()

	err := st.Put(ctx, "avatars/00/1/abc.webp", bytes.NewReader([]byte("hello world")), storage.ObjectMeta{})
	require.NoError(t, err)

	r, meta, err := st.Get(ctx, "avatars/00/1/abc.webp")
	require.NoError(t, err)
	defer r.Close()

	data, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "hello world", string(data))
	assert.Equal(t, int64(len("hello world")), meta.Size)
}

func TestGetMissingKeyReturnsErrNotFound(t *testing.T) {
	st := newStore(t)

	_, _, err := st.Get(t.Context(), "avatars/00/1/missing.webp")
	assert.True(t, errors.Is(err, storage.ErrNotFound))
}

func TestDeleteIsIdempotent(t *testing.T) {
	st := newStore(t)
	ctx := t.Context()

	require.NoError(t, st.Put(ctx, "avatars/00/1/a.webp", bytes.NewReader([]byte("x")), storage.ObjectMeta{}))
	require.NoError(t, st.Delete(ctx, "avatars/00/1/a.webp"))
	// Deleting again must not error.
	assert.NoError(t, st.Delete(ctx, "avatars/00/1/a.webp"))

	_, _, err := st.Get(ctx, "avatars/00/1/a.webp")
	assert.True(t, errors.Is(err, storage.ErrNotFound))
}

func TestPutOverwritesAtomically(t *testing.T) {
	st := newStore(t)
	ctx := t.Context()

	require.NoError(t, st.Put(ctx, "avatars/00/1/a.webp", bytes.NewReader([]byte("first")), storage.ObjectMeta{}))
	require.NoError(t, st.Put(ctx, "avatars/00/1/a.webp", bytes.NewReader([]byte("second")), storage.ObjectMeta{}))

	r, _, err := st.Get(ctx, "avatars/00/1/a.webp")
	require.NoError(t, err)
	defer r.Close()
	data, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "second", string(data))
}

func TestPathTraversalIsRejected(t *testing.T) {
	st := newStore(t)
	ctx := t.Context()

	cases := []string{
		"../../etc/passwd",
		"/etc/passwd",
		"a/../../b",
		"avatars/../../../etc/passwd",
		"",
	}
	for _, key := range cases {
		t.Run(key, func(t *testing.T) {
			err := st.Put(ctx, key, bytes.NewReader([]byte("x")), storage.ObjectMeta{})
			assert.True(t, errors.Is(err, storage.ErrInvalidKey), "Put(%q): got %v", key, err)

			_, _, err = st.Get(ctx, key)
			assert.True(t, errors.Is(err, storage.ErrInvalidKey), "Get(%q): got %v", key, err)

			err = st.Delete(ctx, key)
			assert.True(t, errors.Is(err, storage.ErrInvalidKey), "Delete(%q): got %v", key, err)
		})
	}
}

func TestNewCreatesRootDirectory(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "avatars")
	_, err := local.New(dir, zap.NewNop())
	require.NoError(t, err)

	info, err := os.Stat(dir)
	require.NoError(t, err)
	assert.True(t, info.IsDir())
}
