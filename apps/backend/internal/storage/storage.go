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

// Package storage defines a small, storage-backend-agnostic interface for
// putting, getting, and deleting binary objects by key (currently used for
// user avatars). The local filesystem implementation lives in
// internal/storage/local; a future S3/MinIO implementation can satisfy the
// same interface without any caller or database changes, because callers
// never persist a filesystem path or bucket URL — only the opaque key.
//
// Key layout convention (established by the avatar feature, kept here so a
// future implementation or reconciliation job can rely on it):
//
//	avatars/{shard}/{ownerID}/{random}.{ext}
//
// where shard is the two-hex-digit low byte of the owner id. This keeps any
// single directory from growing unbounded and maps cleanly onto an S3 key
// prefix. A reconciliation/orphan-sweeper job can be built later by adding a
// List(ctx, prefix) method to Storage and cross-referencing stored keys
// against non-empty avatar_key values on the users table.
package storage

import (
	"context"
	"errors"
	"io"
	"time"
)

// ErrNotFound is returned by Get and by Delete callers that care to check it
// (Delete itself does not return ErrNotFound, since deletion is idempotent).
var ErrNotFound = errors.New("storage: object not found")

// ErrInvalidKey is returned when a key is malformed or attempts to escape
// the storage root (e.g. contains "..", or is an absolute path).
var ErrInvalidKey = errors.New("storage: invalid object key")

// ObjectMeta describes a stored object. Implementations are not required to
// persist ContentType or ETag themselves — callers of this package (e.g. the
// user avatar feature) keep that metadata in the database, which is what
// keeps this interface implementable by both a local filesystem and a
// content-addressed object store without a sidecar-metadata concept.
type ObjectMeta struct {
	ContentType string
	Size        int64
	ETag        string
	ModTime     time.Time
}

// Storage is a minimal object store: put, get, delete by opaque key.
// Implementations must treat Delete of a missing key as a success (no error)
// to keep callers' cleanup logic idempotent.
type Storage interface {
	// Put writes r to key, replacing any existing object at that key.
	Put(ctx context.Context, key string, r io.Reader, meta ObjectMeta) error

	// Get returns a reader for the object at key. The caller must Close the
	// returned ReadCloser. Returns ErrNotFound if key does not exist.
	Get(ctx context.Context, key string) (io.ReadCloser, ObjectMeta, error)

	// Delete removes the object at key. It returns nil if key does not
	// exist (idempotent).
	Delete(ctx context.Context, key string) error
}
