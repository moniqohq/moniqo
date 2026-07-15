# Moniqo is a personal finance management application designed to help users
# track, manage, and optimize their financial activities.
#
# Copyright (C) 2026 Moniqo <support@moniqo.in>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

# Primary developer interface for the Moniqo monorepo.
# All targets delegate to Mage internally.
# Mage is installed automatically via `go install` if not found on PATH.

GOPATH := $(shell go env GOPATH)
MAGE := $(GOPATH)/bin/mage

.PHONY: _mage-install docker-compose-up docker-compose-down \
        mailpit-up mailpit-down \
        lint fmt \
        build build-backend build-web build-desktop build-mobile \
        release-snapshot release \
        dev dev-backend dev-web \
        test generate \
        migrate-up migrate-down \
        clean help

_mage-install:
	@test -f $(MAGE) || (echo "mage not found, installing..." && go install github.com/magefile/mage@latest)

docker-compose-up: _mage-install    ## Start Docker Compose stack
	@$(MAGE) dockerComposeUp

docker-compose-down: _mage-install  ## Stop Docker Compose stack
	@$(MAGE) dockerComposeDown

mailpit-up: _mage-install           ## Start Mailpit email testing service
	@$(MAGE) mailpitUp

mailpit-down: _mage-install         ## Stop Mailpit email testing service
	@$(MAGE) mailpitDown

lint: _mage-install           ## Run all linters
	@$(MAGE) lint

fmt: _mage-install            ## Auto-format all code
	@$(MAGE) fmt

build: _mage-install          ## Build all apps
	@$(MAGE) build

build-backend: _mage-install  ## Build the Go backend
	@$(MAGE) buildBackend

build-web: _mage-install      ## Build the Next.js web app
	@$(MAGE) buildWeb

build-desktop: _mage-install  ## Build the Tauri desktop app
	@$(MAGE) buildDesktop

build-mobile: _mage-install   ## Build the React Native mobile app
	@$(MAGE) buildMobile

release-snapshot: _mage-install  ## Build backend + web release artifacts for all platforms (goreleaser, no publish)
	@$(MAGE) releaseSnapshot

release: _mage-install  ## Build and publish backend + web release artifacts (goreleaser, requires git tag + GITHUB_TOKEN)
	@$(MAGE) release

dev: _mage-install            ## Start all apps in dev/watch mode
	@$(MAGE) dev

dev-backend: _mage-install    ## Start the backend in dev mode
	@$(MAGE) devBackend

dev-web: _mage-install        ## Start the Next.js web app in dev mode
	@$(MAGE) devWeb

test: _mage-install           ## Run all tests
	@$(MAGE) test

generate: _mage-install       ## Run all code generators (sqlc, openapi, etc.)
	@$(MAGE) generate

migrate-up: _mage-install     ## Apply pending DB migrations
	@$(MAGE) migrateUp

migrate-down: _mage-install   ## Roll back the last DB migration
	@$(MAGE) migrateDown

clean: _mage-install          ## Remove all build artifacts
	@$(MAGE) clean

help:           ## List all available targets with descriptions
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' | sort
