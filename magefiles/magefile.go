//go:build mage

package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"

	"github.com/magefile/mage/mg"
	"github.com/magefile/mage/sh"
)

// composeProject is the compose project name (derived from the working
// directory) that podman-compose uses to prefix container names as
// <project>_<service>_1.
const composeProject = "moniqo"

// usingPodman reports whether compose commands should run through
// podman-compose. Podman is the preferred tool: it is used whenever
// podman-compose is on PATH. Set COMPOSE_TOOL=podman-compose to force it, or
// COMPOSE_TOOL=docker to force "docker compose" instead.
func usingPodman() bool {
	switch os.Getenv("COMPOSE_TOOL") {
	case "podman-compose":
		return true
	case "docker":
		return false
	}
	_, err := exec.LookPath("podman-compose")
	return err == nil
}

// runCompose runs a podman-compose / docker compose command, preferring Podman.
func runCompose(args ...string) error {
	if usingPodman() {
		return sh.RunV("podman-compose", args...)
	}
	return sh.RunV("docker", append([]string{"compose"}, args...)...)
}

// composeUp starts the given services detached, idempotently.
//
// `docker compose up` already no-ops on running containers, but podman-compose
// 1.0.6 shells out to `podman run` and aborts with a noisy "name is already in
// use" error when a container of that name exists. To keep `make dev` quiet on
// reruns we inspect each service's container first: skip the ones already
// running, `podman start` the ones that exist but are stopped, and only hand
// the genuinely-missing services to `up`.
func composeUp(services ...string) error {
	if !usingPodman() {
		return runCompose(append([]string{"up", "-d"}, services...)...)
	}

	var toCreate []string
	for _, svc := range services {
		name := composeProject + "_" + svc + "_1"
		state, err := podmanContainerState(name)
		if err != nil {
			return err
		}
		switch state {
		case "running":
			fmt.Printf("compose service %q already running; skipping\n", svc)
		case "":
			toCreate = append(toCreate, svc)
		default:
			fmt.Printf("compose service %q exists (%s); starting\n", svc, state)
			if err := sh.RunV("podman", "start", name); err != nil {
				return err
			}
		}
	}
	if len(toCreate) == 0 {
		return nil
	}
	return runCompose(append([]string{"up", "-d"}, toCreate...)...)
}

// podmanContainerState returns the state ("running", "exited", "created", …) of
// the container with the exact given name, or "" if no such container exists.
func podmanContainerState(name string) (string, error) {
	out, err := sh.Output("podman", "ps", "-a", "--filter", "name=^"+name+"$", "--format", "{{.State}}")
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(out), nil
}

// DockerComposeUp starts the local data services (Postgres + Mailpit).
//
// The backend and web services live behind the "app" compose profile and are
// intentionally excluded: `make dev` runs them natively. We name db and mailpit
// explicitly rather than relying on profile exclusion so the behaviour is
// identical under both `docker compose` and podman-compose (podman-compose
// 1.0.6 does not honour profiles and would otherwise try to build the app
// images). To run the fully containerised stack, use the "app" profile directly.
func DockerComposeUp() error {
	return composeUp("db", "mailpit")
}

// DockerComposeDown stops the Docker Compose stack.
func DockerComposeDown() error {
	return runCompose("down")
}

// MailpitUp starts the Mailpit email testing service.
func MailpitUp() error {
	return composeUp("mailpit")
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
