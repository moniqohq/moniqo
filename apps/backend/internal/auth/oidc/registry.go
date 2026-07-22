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

package oidc

// Registry is a ProviderRegistry backed by a simple map. It is populated
// once at startup via Register and read concurrently thereafter — it is not
// safe for concurrent Register calls after startup.
type Registry struct {
	providers map[string]IdentityProvider
}

// NewRegistry returns an empty Registry.
func NewRegistry() *Registry {
	return &Registry{providers: make(map[string]IdentityProvider)}
}

// Register adds p to the registry under p.Name(), overwriting any provider
// previously registered under the same name.
func (r *Registry) Register(p IdentityProvider) {
	r.providers[p.Name()] = p
}

// Provider returns the provider registered under name, or ErrUnknownProvider
// if none is registered — which is also the result for a provider that was
// never configured (see internal/auth's registry construction).
//
//nolint:ireturn // returning the Strategy interface, not a concrete type, is the entire point of a provider registry
func (r *Registry) Provider(name string) (IdentityProvider, error) {
	p, ok := r.providers[name]
	if !ok {
		return nil, ErrUnknownProvider
	}
	return p, nil
}
