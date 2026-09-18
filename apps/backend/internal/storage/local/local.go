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

// Package local is a filesystem-backed implementation of storage.Storage.
package local

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/storage"
)

const (
	dirPerm  = 0o700 // rwx for the owning process only
	filePerm = 0o600 // rw for the owning process only
)

// Local stores objects as files under root.
type Local struct {
	root string
	log  *zap.Logger
}

// New returns a Local store rooted at root, creating the directory
// (and any missing parents) if it does not already exist.
func New(root string, log *zap.Logger) (*Local, error) {
	if root == "" {
		return nil, errors.New("local storage: root must not be empty")
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("local storage: resolve root: %w", err)
	}
	if err := os.MkdirAll(abs, dirPerm); err != nil {
		return nil, fmt.Errorf("local storage: create root: %w", err)
	}
	return &Local{root: abs, log: log}, nil
}

// Put writes r to key atomically: it writes to a temporary file in the same
// directory, then renames it into place, so a concurrent Get never observes
// a partially written object.
func (l *Local) Put(_ context.Context, key string, r io.Reader, _ storage.ObjectMeta) error {
	path, err := l.resolve(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), dirPerm); err != nil {
		return fmt.Errorf("local storage: create dir: %w", err)
	}

	tmp, err := os.CreateTemp(filepath.Dir(path), ".tmp-*")
	if err != nil {
		return fmt.Errorf("local storage: create temp file: %w", err)
	}
	tmpPath := tmp.Name()
	defer func() { _ = os.Remove(tmpPath) }() // no-op once renamed

	if _, err := io.Copy(tmp, r); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("local storage: write temp file: %w", err)
	}
	if err := tmp.Chmod(filePerm); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("local storage: chmod temp file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("local storage: close temp file: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("local storage: rename into place: %w", err)
	}
	return nil
}

// Get opens the object at key. ContentType and ETag are left zero-valued;
// callers that need them (e.g. the user avatar feature) keep that metadata
// in the database rather than relying on this package to persist it.
func (l *Local) Get(_ context.Context, key string) (io.ReadCloser, storage.ObjectMeta, error) {
	path, err := l.resolve(key)
	if err != nil {
		return nil, storage.ObjectMeta{}, err
	}
	f, err := os.Open(path) //nolint:gosec // path is produced by resolve(), which rejects traversal/absolute keys
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, storage.ObjectMeta{}, storage.ErrNotFound
		}
		return nil, storage.ObjectMeta{}, fmt.Errorf("local storage: open: %w", err)
	}
	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, storage.ObjectMeta{}, fmt.Errorf("local storage: stat: %w", err)
	}
	return f, storage.ObjectMeta{Size: info.Size(), ModTime: info.ModTime()}, nil
}

// Delete removes the object at key. Deleting a key that does not exist is
// not an error, so callers can treat cleanup as idempotent.
func (l *Local) Delete(_ context.Context, key string) error {
	path, err := l.resolve(key)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("local storage: remove: %w", err)
	}
	return nil
}

// hasInvalidKeySyntax reports whether key is empty, contains a NUL byte, is
// absolute, or contains a "." or ".." path segment.
//
//nolint:revive // a short, flat list of syntax checks reads more clearly as one function than split up
func hasInvalidKeySyntax(key string) bool {
	if key == "" || strings.Contains(key, "\x00") {
		return true
	}
	if filepath.IsAbs(key) || strings.HasPrefix(key, "/") {
		return true
	}
	for seg := range strings.SplitSeq(filepath.ToSlash(key), "/") {
		if seg == ".." || seg == "." || seg == "" {
			return true
		}
	}
	return false
}

// resolve maps a logical key to an absolute filesystem path, rejecting any
// key with invalid syntax (see hasInvalidKeySyntax) and, as a
// belt-and-suspenders check, any key that would still resolve outside root
// after joining. This is the load-bearing security check in this package:
// even though keys are minted server-side today, a future caller must not
// be able to read or write arbitrary files by passing a crafted key.
func (l *Local) resolve(key string) (string, error) {
	if hasInvalidKeySyntax(key) {
		return "", storage.ErrInvalidKey
	}
	joined := filepath.Join(l.root, key)
	rel, err := filepath.Rel(l.root, joined)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", storage.ErrInvalidKey
	}
	return joined, nil
}

// RandomKeySuffix returns n random hex bytes, suitable for building a
// collision-resistant object key (see the package doc in storage.go for the
// avatar key layout convention).
func RandomKeySuffix(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("local storage: generate random suffix: %w", err)
	}
	return hex.EncodeToString(b), nil
}
