//go:build mage

package main

import (
	"fmt"
	"os"
	"os/exec"
	"sync"

	"github.com/magefile/mage/mg"
	"github.com/magefile/mage/sh"
)

// runCompose runs a docker compose / podman-compose command.
// Set COMPOSE_TOOL=podman-compose to use Podman; defaults to "docker compose".
func runCompose(args ...string) error {
	if os.Getenv("COMPOSE_TOOL") == "podman-compose" {
		return sh.RunV("podman-compose", args...)
	}
	return sh.RunV("docker", append([]string{"compose"}, args...)...)
}

// DockerComposeUp starts the Docker Compose stack.
func DockerComposeUp() error {
	return runCompose("up", "-d")
}

// DockerComposeDown stops the Docker Compose stack.
func DockerComposeDown() error {
	return runCompose("down")
}

// MailpitUp starts the Mailpit email testing service.
func MailpitUp() error {
	return runCompose("up", "mailpit", "-d")
}

// MailpitDown stops the Mailpit email testing service.
func MailpitDown() error {
	return runCompose("stop", "mailpit")
}

// Lint runs all linters across the monorepo.
func Lint() error {
	mg.Deps(lintBackend, lintJS)
	return nil
}

// Fmt auto-formats all code across the monorepo.
func Fmt() error {
	mg.Deps(fmtBackend, fmtJS)
	return nil
}

// Build builds all apps.
func Build() error {
	mg.Deps(BuildBackend, BuildWeb, BuildDesktop, BuildMobile)
	return nil
}

// BuildBackend builds the Go backend.
func BuildBackend() error {
	return sh.RunV("go", "build", "-C", "apps/backend", "./...")
}

// BuildWeb builds the Next.js web app.
func BuildWeb() error {
	return pnpm("--filter", "@moniqo/web", "run", "build")
}

// BuildDesktop builds the Tauri desktop app.
func BuildDesktop() error {
	return pnpm("--filter", "@moniqo/desktop", "run", "tauri", "build")
}

// BuildMobile builds the React Native mobile app.
func BuildMobile() error {
	return pnpm("--filter", "@moniqo/mobile", "run", "build")
}

// Dev starts the database, backend, and web app in dev/watch mode concurrently.
func Dev() error {
	if err := DockerComposeUp(); err != nil {
		return err
	}

	var wg sync.WaitGroup
	errCh := make(chan error, 2)

	for _, fn := range []func() error{DevBackend, DevWeb} {
		fn := fn
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := fn(); err != nil {
				errCh <- err
			}
		}()
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		if err != nil {
			return err
		}
	}
	return nil
}

// DevBackend starts the Go backend in dev mode.
func DevBackend() error {
	return runInDir("apps/backend", "go", "run", "./cmd/server")
}

// DevWeb starts the Next.js web app in dev mode.
func DevWeb() error {
	return pnpm("--filter", "@moniqo/web", "run", "dev")
}

// Test runs all tests across the monorepo.
func Test() error {
	return sh.RunV("go", "test", "-C", "apps/backend", "./...")
}

// Generate runs all code generators (sqlc, openapi, etc.).
func Generate() error {
	return sh.RunV("go", "generate", "-C", "apps/backend", "./...")
}

// MigrateUp applies pending DB migrations.
func MigrateUp() error {
	return runInDir("apps/backend", "go", "run", "./cmd/migrate", "up")
}

// MigrateDown rolls back the last DB migration.
func MigrateDown() error {
	return runInDir("apps/backend", "go", "run", "./cmd/migrate", "down")
}

// Clean removes all build artifacts.
func Clean() error {
	dirs := []string{
		"apps/backend/bin",
		"apps/web/.next",
		"apps/web/out",
		"apps/desktop/src-tauri/target",
		"apps/mobile/.expo",
		"apps/mobile/dist",
	}
	for _, d := range dirs {
		if err := os.RemoveAll(d); err != nil {
			return fmt.Errorf("removing %s: %w", d, err)
		}
		fmt.Printf("removed %s\n", d)
	}
	return nil
}

// --- internal helpers ---

func lintBackend() error {
	return runInDir("apps/backend", "golangci-lint", "run")
}

func lintJS() error {
	return pnpm("lint")
}

func fmtBackend() error {
	return runInDir("apps/backend", "gofmt", "-w", ".")
}

func fmtJS() error {
	return pnpm("format")
}

func pnpm(args ...string) error {
	return sh.RunV("pnpm", args...)
}

func runInDir(dir string, name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
