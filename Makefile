# Primary developer interface for the Moniqo monorepo.
# All targets delegate to Mage internally.
#
# Install Mage: go install github.com/magefile/mage@latest

MAGE := mage

.PHONY: docker-compose-up docker-compose-down lint fmt \
        build build-backend build-web build-desktop build-mobile \
        dev dev-backend dev-web \
        test generate \
        migrate-up migrate-down \
        clean help

docker-compose-up:    ## Start Docker Compose stack
	@$(MAGE) dockerComposeUp

docker-compose-down:  ## Stop Docker Compose stack
	@$(MAGE) dockerComposeDown

lint:           ## Run all linters
	@$(MAGE) lint

fmt:            ## Auto-format all code
	@$(MAGE) fmt

build:          ## Build all apps
	@$(MAGE) build

build-backend:  ## Build the Go backend
	@$(MAGE) buildBackend

build-web:      ## Build the Next.js web app
	@$(MAGE) buildWeb

build-desktop:  ## Build the Tauri desktop app
	@$(MAGE) buildDesktop

build-mobile:   ## Build the React Native mobile app
	@$(MAGE) buildMobile

dev:            ## Start all apps in dev/watch mode
	@$(MAGE) dev

dev-backend:    ## Start the backend in dev mode
	@$(MAGE) devBackend

dev-web:        ## Start the Next.js web app in dev mode
	@$(MAGE) devWeb

test:           ## Run all tests
	@$(MAGE) test

generate:       ## Run all code generators (sqlc, openapi, etc.)
	@$(MAGE) generate

migrate-up:     ## Apply pending DB migrations
	@$(MAGE) migrateUp

migrate-down:   ## Roll back the last DB migration
	@$(MAGE) migrateDown

clean:          ## Remove all build artifacts
	@$(MAGE) clean

help:           ## List all available targets with descriptions
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' | sort
