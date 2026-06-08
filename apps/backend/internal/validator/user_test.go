package validator_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
)

func strPtr(s string) *string { return &s }

func validInput() validator.RegisterInput {
	return validator.RegisterInput{
		Username: "saqibtest",
		Password: "SecurePass1",
		Email:    "saqib@example.com",
	}
}

func errFields(errs []httpx.FieldError) map[string]string {
	m := make(map[string]string, len(errs))
	for _, e := range errs {
		m[e.Field] = e.Error
	}
	return m
}

func TestValidateRegister_Success(t *testing.T) {
	t.Parallel()

	cases := []struct {
		label string
		input validator.RegisterInput
	}{
		{"all required fields", validInput()},
		{"with optional name", func() validator.RegisterInput { i := validInput(); i.Name = strPtr("Saqib Abdul"); return i }()},
		{"username 8 chars (min)", func() validator.RegisterInput { i := validInput(); i.Username = "abcde123"; return i }()},
		{"username 12 chars (max)", func() validator.RegisterInput { i := validInput(); i.Username = "abcde1234567"; return i }()},
		{"username with hyphen", func() validator.RegisterInput { i := validInput(); i.Username = "my-user01"; return i }()},
		{"username with underscore", func() validator.RegisterInput { i := validInput(); i.Username = "my_user01"; return i }()},
		{"password 8 bytes (min)", func() validator.RegisterInput { i := validInput(); i.Password = "Secure1!"; return i }()},
		{"password 72 bytes (max)", func() validator.RegisterInput { i := validInput(); i.Password = strings.Repeat("a", 72); return i }()},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.label, func(t *testing.T) {
			t.Parallel()
			assert.Empty(t, validator.ValidateRegister(tc.input))
		})
	}
}

func TestValidateRegister_Username(t *testing.T) {
	t.Parallel()

	cases := []struct {
		label    string
		username string
		wantMsg  string
	}{
		{"too short (7 chars)", "short1a", "must be between 8 and 12 characters"},
		{"too long (13 chars)", "toolongusrname", "must be between 8 and 12 characters"},
		{"starts with digit", "1startdig1", "must start with a letter"},
		{"trailing underscore", "username_", "must start with a letter"},
		{"trailing hyphen", "username-", "must start with a letter"},
		{"consecutive separators", "ab__cdefgh", "must start with a letter"},
		{"special char @", "user@name1", "must start with a letter"},
		{"spaces not allowed", "user name1", "must start with a letter"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.label, func(t *testing.T) {
			t.Parallel()
			in := validInput()
			in.Username = tc.username
			fields := errFields(validator.ValidateRegister(in))
			assert.Contains(t, fields["username"], tc.wantMsg)
		})
	}
}

func TestValidateRegister_Password(t *testing.T) {
	t.Parallel()

	cases := []struct {
		label    string
		password string
		wantMsg  string
	}{
		{"empty", "", "must be at least 8 characters"},
		{"too short (7)", "Short1!", "must be at least 8 characters"},
		{"too long (73 bytes)", strings.Repeat("a", 73), "must not exceed 72 characters"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.label, func(t *testing.T) {
			t.Parallel()
			in := validInput()
			in.Password = tc.password
			fields := errFields(validator.ValidateRegister(in))
			assert.Contains(t, fields["password"], tc.wantMsg)
		})
	}
}

func TestValidateRegister_Email(t *testing.T) {
	t.Parallel()

	cases := []struct {
		label   string
		email   string
		wantMsg string
	}{
		{"empty", "", "required"},
		{"invalid format no @", "notanemail", "invalid email format"},
		{"invalid format bare @", "user@", "invalid email format"},
		{"exceeds 254 chars", strings.Repeat("a", 250) + "@b.co", "must not exceed 254 characters"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.label, func(t *testing.T) {
			t.Parallel()
			in := validInput()
			in.Email = tc.email
			fields := errFields(validator.ValidateRegister(in))
			assert.Contains(t, fields["email"], tc.wantMsg)
		})
	}
}

func TestValidateRegister_Name(t *testing.T) {
	t.Parallel()

	cases := []struct {
		label   string
		name    *string
		wantErr bool
		wantMsg string
	}{
		{"nil (omitted) is valid", nil, false, ""},
		{"non-empty string is valid", strPtr("Saqib"), false, ""},
		{"empty string is invalid", strPtr(""), true, "must not be empty if provided"},
		{"exceeds 100 chars", strPtr(strings.Repeat("a", 101)), true, "must not exceed 100 characters"},
		{"exactly 100 chars is valid", strPtr(strings.Repeat("a", 100)), false, ""},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.label, func(t *testing.T) {
			t.Parallel()
			in := validInput()
			in.Name = tc.name
			fields := errFields(validator.ValidateRegister(in))
			if tc.wantErr {
				assert.Contains(t, fields["name"], tc.wantMsg)
			} else {
				assert.NotContains(t, fields, "name")
			}
		})
	}
}

func TestValidateRegister_AggregatesAllErrors(t *testing.T) {
	t.Parallel()

	in := validator.RegisterInput{
		Username: "x",     // too short
		Password: "short", // too short
		Email:    "",      // required
	}

	fields := errFields(validator.ValidateRegister(in))
	assert.Contains(t, fields, "username")
	assert.Contains(t, fields, "password")
	assert.Contains(t, fields, "email")
}

func TestValidateRegister_NilNameNotFlagged(t *testing.T) {
	t.Parallel()

	// Nil name means the field was omitted — must not produce an error.
	in := validInput()
	in.Name = nil
	assert.Empty(t, validator.ValidateRegister(in))
}
