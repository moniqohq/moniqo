package user_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	tc "github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	appmw "github.com/moniqohq/moniqo/apps/backend/internal/middleware"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

// testEnv holds shared state for the entire test suite.
type testEnv struct {
	pool *pgxpool.Pool
	dsn  string
}

var env *testEnv

func TestMain(m *testing.M) {
	ctx := context.Background()

	pgc, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("moniqo_test"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		tc.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		panic("start postgres container: " + err.Error())
	}
	defer pgc.Terminate(ctx) //nolint:errcheck

	dsn, err := pgc.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		panic("connection string: " + err.Error())
	}

	if err := migrateUp(dsn); err != nil {
		panic("run migrations: " + err.Error())
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		panic("pgxpool: " + err.Error())
	}
	defer pool.Close()

	env = &testEnv{pool: pool, dsn: dsn}
	m.Run()
}

func migrateUp(dsn string) error {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return err
	}
	defer db.Close()
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.Up(db, "../../db/migrations")
}

// newServer creates a fresh Echo instance wired to the real DB, sharing the
// container pool but using its own HTTP layer.
func newServer(t *testing.T) *echo.Echo {
	t.Helper()
	e := echo.New()
	e.HideBanner = true

	repo := user.NewRepo(env.pool)
	svc := user.NewService(repo, 4) // cost 4 for test speed
	h := user.NewHandler(svc)

	reg := e.Group("/api/v1/users")
	reg.POST("", h.Register)
	return e
}

// truncateUsers resets the users table between tests.
func truncateUsers(t *testing.T) {
	t.Helper()
	_, err := env.pool.Exec(context.Background(), "TRUNCATE users RESTART IDENTITY CASCADE")
	require.NoError(t, err)
}

func post(t *testing.T, e *echo.Echo, body any) *httptest.ResponseRecorder {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", bytes.NewReader(b))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

// ---- Happy path -------------------------------------------------------

func TestRegister_HappyPath(t *testing.T) {
	truncateUsers(t)
	e := newServer(t)

	rec := post(t, e, map[string]any{
		"username": "saqibtest",
		"password": "SecurePass1",
		"email":    "saqib@example.com",
		"name":     "Saqib Test",
	})

	require.Equal(t, http.StatusCreated, rec.Code)

	var resp httpx.Response
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.True(t, resp.Success)
	assert.Equal(t, "user created successfully", resp.Msg)

	data, ok := resp.Data.(map[string]any)
	require.True(t, ok)

	assert.Equal(t, "saqibtest", data["username"])
	assert.Equal(t, "saqib@example.com", data["email"])
	assert.Equal(t, "Saqib Test", data["name"])
	assert.Equal(t, "", data["picture"])
	assert.Equal(t, "pending_verification", data["status"])
	assert.Nil(t, data["last_login"])
	assert.NotEmpty(t, data["created_at"])
	assert.NotEmpty(t, data["id"])

	// Ensure hash is never present in the response
	body := rec.Body.String()
	assert.NotContains(t, body, "hash")
	assert.NotContains(t, body, "updated_at")
	assert.NotContains(t, body, "deleted_at")
}

func TestRegister_NameOmitted(t *testing.T) {
	truncateUsers(t)
	e := newServer(t)

	rec := post(t, e, map[string]any{
		"username": "nonamuser",
		"password": "SecurePass1",
		"email":    "noname@example.com",
	})
	require.Equal(t, http.StatusCreated, rec.Code)

	var resp httpx.Response
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	data := resp.Data.(map[string]any)
	assert.Nil(t, data["name"])
}

// ---- Username validation -----------------------------------------------

func TestRegister_Username_Validations(t *testing.T) {
	e := newServer(t)

	cases := []struct {
		label    string
		username string
		wantErr  string
	}{
		{"too short (7)", "short1a", "must be between 8 and 12 characters"},
		{"too long (13)", "toolongusername", "must be between 8 and 12 characters"},
		{"starts with digit", "1startdig", "must start with a letter"},
		{"trailing underscore", "trailund_", "must start with a letter"},
		{"trailing hyphen", "trailhyph-", "must start with a letter"},
		{"consecutive separators", "ab__cdefgh", "must start with a letter"},
		{"illegal char @", "user@name1", "must start with a letter"},
	}

	for _, tc := range cases {
		t.Run(tc.label, func(t *testing.T) {
			rec := post(t, e, map[string]any{
				"username": tc.username,
				"password": "SecurePass1",
				"email":    "valid@example.com",
			})
			assert.Equal(t, http.StatusBadRequest, rec.Code)
			assert.Contains(t, rec.Body.String(), tc.wantErr)
		})
	}
}

// ---- Password validation ------------------------------------------------

func TestRegister_Password_TooShort(t *testing.T) {
	e := newServer(t)

	rec := post(t, e, map[string]any{
		"username": "validuser",
		"password": "short",
		"email":    "v@example.com",
	})
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "at least 8 characters")
}

func TestRegister_Password_TooLong(t *testing.T) {
	e := newServer(t)

	rec := post(t, e, map[string]any{
		"username": "validuser",
		"password": strings.Repeat("a", 73),
		"email":    "v@example.com",
	})
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "must not exceed 72 characters")
}

// ---- Email validation ---------------------------------------------------

func TestRegister_Email_Required(t *testing.T) {
	e := newServer(t)

	rec := post(t, e, map[string]any{
		"username": "validuser",
		"password": "SecurePass1",
	})
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), `"field":"email"`)
}

func TestRegister_Email_InvalidFormat(t *testing.T) {
	e := newServer(t)

	rec := post(t, e, map[string]any{
		"username": "validuser",
		"password": "SecurePass1",
		"email":    "not-an-email",
	})
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "invalid email format")
}

// ---- Name validation ----------------------------------------------------

func TestRegister_Name_ExplicitlyEmpty(t *testing.T) {
	e := newServer(t)

	rec := post(t, e, map[string]any{
		"username": "validuser",
		"password": "SecurePass1",
		"email":    "v@example.com",
		"name":     "",
	})
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "must not be empty if provided")
}

func TestRegister_Name_TooLong(t *testing.T) {
	e := newServer(t)

	rec := post(t, e, map[string]any{
		"username": "validuser",
		"password": "SecurePass1",
		"email":    "v@example.com",
		"name":     strings.Repeat("a", 101),
	})
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "must not exceed 100 characters")
}

// ---- Conflict -----------------------------------------------------------

func TestRegister_DuplicateUsername_Returns409(t *testing.T) {
	truncateUsers(t)
	e := newServer(t)

	body := map[string]any{
		"username": "dupusrtest",
		"password": "SecurePass1",
		"email":    "first@example.com",
	}
	require.Equal(t, http.StatusCreated, post(t, e, body).Code)

	body["email"] = "second@example.com"
	rec := post(t, e, body)
	assert.Equal(t, http.StatusConflict, rec.Code)
	assert.Contains(t, rec.Body.String(), "username or email already exists")
}

func TestRegister_DuplicateEmail_Returns409(t *testing.T) {
	truncateUsers(t)
	e := newServer(t)

	body := map[string]any{
		"username": "firstuser1",
		"password": "SecurePass1",
		"email":    "shared@example.com",
	}
	require.Equal(t, http.StatusCreated, post(t, e, body).Code)

	body["username"] = "secondusr1"
	rec := post(t, e, body)
	assert.Equal(t, http.StatusConflict, rec.Code)
	assert.Contains(t, rec.Body.String(), "username or email already exists")
}

func TestRegister_Conflict_MessageIdentical_PreventEnumeration(t *testing.T) {
	truncateUsers(t)
	e := newServer(t)

	base := map[string]any{
		"username": "baseusrxx1",
		"password": "SecurePass1",
		"email":    "base@example.com",
	}
	require.Equal(t, http.StatusCreated, post(t, e, base).Code)

	// Username collision
	recUser := post(t, e, map[string]any{
		"username": "baseusrxx1",
		"password": "SecurePass1",
		"email":    "other@example.com",
	})

	// Email collision
	recEmail := post(t, e, map[string]any{
		"username": "otherusr11",
		"password": "SecurePass1",
		"email":    "base@example.com",
	})

	assert.Equal(t, http.StatusConflict, recUser.Code)
	assert.Equal(t, http.StatusConflict, recEmail.Code)
	// Messages must be byte-identical — prevents enumeration of which field conflicted
	assert.Equal(t, recUser.Body.String(), recEmail.Body.String())
}

func TestRegister_CaseInsensitiveUniqueness(t *testing.T) {
	truncateUsers(t)
	e := newServer(t)

	require.Equal(t, http.StatusCreated, post(t, e, map[string]any{
		"username": "Aliceusr1",
		"password": "SecurePass1",
		"email":    "alice@example.com",
	}).Code)

	rec := post(t, e, map[string]any{
		"username": "aliceusr1", // lowercase variant
		"password": "SecurePass1",
		"email":    "other2@example.com",
	})
	assert.Equal(t, http.StatusConflict, rec.Code)
}

func TestRegister_SoftDeletedRow_BlocksReregistration(t *testing.T) {
	truncateUsers(t)
	e := newServer(t)

	body := map[string]any{
		"username": "softdelus1",
		"password": "SecurePass1",
		"email":    "softdel@example.com",
	}
	require.Equal(t, http.StatusCreated, post(t, e, body).Code)

	// Soft-delete the user directly
	_, err := env.pool.Exec(context.Background(),
		"UPDATE users SET deleted_at = now() WHERE username = 'softdelus1'")
	require.NoError(t, err)

	// Re-registration must still be rejected
	rec := post(t, e, body)
	assert.Equal(t, http.StatusConflict, rec.Code)
}

// ---- Concurrency --------------------------------------------------------

func TestRegister_ConcurrentDuplicates_ExactlyOneSucceeds(t *testing.T) {
	truncateUsers(t)
	e := newServer(t)

	const n = 10
	var (
		mu      sync.Mutex
		created int
		wg      sync.WaitGroup
	)

	for i := range n {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			rec := post(t, e, map[string]any{
				"username": "raceusr001",
				"password": "SecurePass1",
				"email":    fmt.Sprintf("race%d@example.com", i),
			})
			if rec.Code == http.StatusCreated {
				mu.Lock()
				created++
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()

	assert.Equal(t, 1, created, "exactly one goroutine should have succeeded")
}

// ---- Rate limiting ------------------------------------------------------

func TestRegister_RateLimitExceeded_Returns429(t *testing.T) {
	truncateUsers(t)

	e := echo.New()
	e.HideBanner = true
	repo := user.NewRepo(env.pool)
	svc := user.NewService(repo, 4)
	h := user.NewHandler(svc)
	reg := e.Group("/api/v1/users")
	reg.Use(appmw.RegisterRateLimiter())
	reg.POST("", h.Register)

	// Send 11 requests from same fake IP (first 10 use burst, 11th is rejected)
	var lastCode int
	for i := range 11 {
		body, _ := json.Marshal(map[string]any{
			"username": fmt.Sprintf("rluser%03d", i),
			"password": "SecurePass1",
			"email":    fmt.Sprintf("rl%d@example.com", i),
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/users", bytes.NewReader(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		req.Header.Set("X-Real-IP", "10.0.0.1")
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		lastCode = rec.Code
	}

	assert.Equal(t, http.StatusTooManyRequests, lastCode)
}

// ---- Malformed body -----------------------------------------------------

func TestRegister_MalformedJSON_Returns400(t *testing.T) {
	e := newServer(t)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", strings.NewReader("{bad json}"))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

// ---- Multiple field errors in single response --------------------------

func TestRegister_MultipleErrors_AllReported(t *testing.T) {
	e := newServer(t)

	rec := post(t, e, map[string]any{
		"username": "x",       // too short
		"password": "short",   // too short
		"email":    "notmail", // invalid
	})
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var resp httpx.Response
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	data := resp.Data.(map[string]any)
	fields := data["fields"].([]any)
	assert.GreaterOrEqual(t, len(fields), 3, "should report all three errors at once")
}
