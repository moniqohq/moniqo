# Primary developer interface for the Moniqo monorepo.
# All targets delegate to Mage internally.
# Mage is installed automatically via `go install` if not found on PATH.

MAGE := mage

.PHONY: _mage-install docker-compose-up docker-compose-down lint fmt \
        build build-backend build-web build-desktop build-mobile \
        dev dev-backend dev-web \
        test generate \
        migrate-up migrate-down \
        clean help

_mage-install:
	@which mage > /dev/null 2>&1 || (echo "mage not found, installing..." && go install github.com/magefile/mage@latest)

docker-compose-up: _mage-install    ## Start Docker Compose stack
	@$(MAGE) dockerComposeUp

docker-compose-down: _mage-install  ## Stop Docker Compose stack
	@$(MAGE) dockerComposeDown

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
