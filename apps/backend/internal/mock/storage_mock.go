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

package mock

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"sync"

	"github.com/moniqohq/moniqo/apps/backend/internal/storage"
)

// Storage is an in-memory test double for storage.Storage, backed by a map.
// Injectable Put/Get/DeleteErr let tests exercise failure paths (e.g.
// verifying a DB write failure cleans up the object it just wrote).
type Storage struct {
	mu   sync.Mutex
	data map[string][]byte

	PutErr    error
	GetErr    error
	DeleteErr error
}

// NewStorage returns an empty in-memory Storage.
func NewStorage() *Storage {
	return &Storage{data: make(map[string][]byte)}
}

// Put stores r's bytes under key, or returns PutErr if set.
func (s *Storage) Put(_ context.Context, key string, r io.Reader, _ storage.ObjectMeta) error {
	if s.PutErr != nil {
		return s.PutErr
	}
	data, err := io.ReadAll(r)
	if err != nil {
		return fmt.Errorf("read: %w", err)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[key] = data
	return nil
}

// Get returns the bytes stored under key, or GetErr / storage.ErrNotFound.
func (s *Storage) Get(_ context.Context, key string) (io.ReadCloser, storage.ObjectMeta, error) {
	if s.GetErr != nil {
		return nil, storage.ObjectMeta{}, s.GetErr
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	data, ok := s.data[key]
	if !ok {
		return nil, storage.ObjectMeta{}, storage.ErrNotFound
	}
	return io.NopCloser(bytes.NewReader(data)), storage.ObjectMeta{Size: int64(len(data))}, nil
}

// Delete removes key, or returns DeleteErr if set. Idempotent, matching the
// real Storage.Delete contract.
func (s *Storage) Delete(_ context.Context, key string) error {
	if s.DeleteErr != nil {
		return s.DeleteErr
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data, key)
	return nil
}

// Keys returns the set of keys currently stored, for test assertions such as
// "the old avatar object was deleted after a replace".
func (s *Storage) Keys() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	keys := make([]string, 0, len(s.data))
	for k := range s.data {
		keys = append(keys, k)
	}
	return keys
}

// Has reports whether key is currently stored.
func (s *Storage) Has(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.data[key]
	return ok
}
