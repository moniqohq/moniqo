//go:build mage

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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

// BuildBackend builds a production backend binary (stripped, no cgo) into
// OUT_DIR (default dist/build/backend), cleaning it first. GOOS/GOARCH are
// read from the environment so this same target cross-compiles: goreleaser's
// before-hooks invoke it once per release platform with those variables (and
// a platform-specific OUT_DIR) set, instead of goreleaser building Go itself.
func BuildBackend() error {
	outDir := os.Getenv("OUT_DIR")
	if outDir == "" {
		outDir = filepath.Join("dist", "build", "backend")
	}
	if err := os.RemoveAll(outDir); err != nil {
		return fmt.Errorf("removing %s: %w", outDir, err)
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return fmt.Errorf("creating %s: %w", outDir, err)
	}

	binary := "moniqo"
	if os.Getenv("GOOS") == "windows" {
		binary += ".exe"
	}
	out, err := filepath.Abs(filepath.Join(outDir, binary))
	if err != nil {
		return err
	}

	env := map[string]string{"CGO_ENABLED": "0"}
	for _, k := range []string{"GOOS", "GOARCH"} {
		if v := os.Getenv(k); v != "" {
			env[k] = v
		}
	}
	if err := sh.RunWithV(
		env, "go", "build", "-C", "apps/backend", "-ldflags=-s -w", "-o", out, "./cmd/server",
	); err != nil {
		return err
	}
	fmt.Printf("backend binary ready at %s\n", out)
	return nil
}

// releaseHeaderEnv reads release/RELEASE_HEADER.md and returns it as the env
// map goreleaser expects RELEASE_HEADER in (see the `release.header` comment
// in .goreleaser.yaml for why it's passed this way instead of inline).
func releaseHeaderEnv() (map[string]string, error) {
	header, err := os.ReadFile(filepath.Join("release", "RELEASE_HEADER.md"))
	if err != nil {
		return nil, fmt.Errorf("reading release header: %w", err)
	}
	return map[string]string{"RELEASE_HEADER": string(header)}, nil
}

// ReleaseSnapshot builds multi-platform backend binaries and the web
// standalone bundle (via before-hooks in .goreleaser.yaml, which shell out to
// `make build-backend` / `make build-web`), then packages them into
// dist/artifacts without publishing anything (no git tag or remote release
// required).
func ReleaseSnapshot() error {
	env, err := releaseHeaderEnv()
	if err != nil {
		return err
	}
	return sh.RunWithV(env, "goreleaser", "release", "--snapshot", "--clean")
}

// Release cuts an actual release: builds multi-platform backend binaries and
// the web standalone bundle, then packages and publishes them to GitHub
// Releases via goreleaser. Requires the current commit to be tagged (e.g.
// `git tag v1.2.3 && git push --tags`) and a GITHUB_TOKEN with repo write
// access in the environment.
func Release() error {
	env, err := releaseHeaderEnv()
	if err != nil {
		return err
	}
	return sh.RunWithV(env, "goreleaser", "release", "--clean")
}

// BuildWeb builds the Next.js web app and assembles a production-ready,
// self-contained deployable into dist/build/web. Next's standalone output
// nests the app under apps/web (since apps/web is a pnpm workspace package
// traced from the monorepo root), so this flattens that nesting away: the
// app's own node_modules symlinks are re-pointed into the shared
// dist/build/web/node_modules, and server.js/.next/package.json are copied
// straight into dist/build/web. Run it as `node dist/build/web/server.js`.
func BuildWeb() error {
	if err := pnpm("--filter", "@moniqo/web", "run", "build"); err != nil {
		return err
	}

	standaloneDir := filepath.Join("apps/web", ".next", "standalone")
	appDir := filepath.Join(standaloneDir, "apps/web")
	outDir := filepath.Join("dist", "build", "web")

	if err := os.RemoveAll(outDir); err != nil {
		return fmt.Errorf("removing %s: %w", outDir, err)
	}
	sharedSrc := filepath.Join(standaloneDir, "node_modules")
	sharedDst := filepath.Join(outDir, "node_modules")
	if err := copyDir(sharedSrc, sharedDst); err != nil {
		return fmt.Errorf("copying shared node_modules: %w", err)
	}
	if err := relinkNodeModules(filepath.Join(appDir, "node_modules"), sharedDst, sharedSrc, sharedDst); err != nil {
		return fmt.Errorf("relinking app node_modules: %w", err)
	}
	if err := copyDir(filepath.Join(appDir, ".next"), filepath.Join(outDir, ".next")); err != nil {
		return fmt.Errorf("copying .next output: %w", err)
	}
	if err := sh.Copy(filepath.Join(outDir, "server.js"), filepath.Join(appDir, "server.js")); err != nil {
		return fmt.Errorf("copying server.js: %w", err)
	}
	if err := sh.Copy(filepath.Join(outDir, "package.json"), filepath.Join(appDir, "package.json")); err != nil {
		return fmt.Errorf("copying package.json: %w", err)
	}
	if err := copyDir(filepath.Join("apps/web", ".next", "static"), filepath.Join(outDir, ".next/static")); err != nil {
		return fmt.Errorf("copying static assets: %w", err)
	}
	if err := copyDir(filepath.Join("apps/web", "public"), filepath.Join(outDir, "public")); err != nil {
		return fmt.Errorf("copying public assets: %w", err)
	}
	fmt.Printf("web deployable ready at %s (run: node server.js)\n", outDir)
	return nil
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

// relinkNodeModules recreates the symlinks under src (an app-level
// node_modules directory from Next's standalone output, e.g.
// apps/web/node_modules) inside dst, pointing into sharedDst (the already
// self-contained copy of the shared standalone node_modules, e.g.
// dist/build/web/node_modules) rather than back at the original build tree.
// It can't reuse copyDir's verbatim symlink copy because src and dst sit at
// different depths relative to the pnpm store, so the original relative
// link text would resolve to the wrong place once moved; nor can it just
// resolve the symlink and re-point at the resolved path, since that would
// leave the deployable bundle referencing the ephemeral apps/web/.next
// build output instead of its own copy.
func relinkNodeModules(src, dst, sharedSrc, sharedDst string) error {
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)

		switch {
		case d.Type()&os.ModeSymlink != 0:
			resolved, err := filepath.EvalSymlinks(path)
			if err != nil {
				return err
			}
			relToShared, err := filepath.Rel(sharedSrc, resolved)
			if err != nil {
				return err
			}
			newTarget, err := filepath.Rel(filepath.Dir(target), filepath.Join(sharedDst, relToShared))
			if err != nil {
				return err
			}
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			return os.Symlink(newTarget, target)
		case d.IsDir():
			return os.MkdirAll(target, 0o755)
		default:
			return sh.Copy(target, path)
		}
	})
}

// copyDir recursively copies src onto dst, creating directories as needed and
// preserving symlinks (Next's standalone output symlinks pnpm-hoisted deps).
func copyDir(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)

		switch {
		case d.Type()&os.ModeSymlink != 0:
			link, err := os.Readlink(path)
			if err != nil {
				return err
			}
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			return os.Symlink(link, target)
		case d.IsDir():
			return os.MkdirAll(target, 0o755)
		default:
			return sh.Copy(target, path)
		}
	})
}

func runInDir(dir string, name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
