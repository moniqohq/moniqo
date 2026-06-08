package validator_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
)

func ptr(s string) *string { return &s }

func valid() validator.RegisterInput {
	return validator.RegisterInput{
		Username: "saqibtest",
		Password: "SecurePass1",
		Email:    "saqib@example.com",
	}
}

func TestValidateRegister(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		assert.Empty(t, validator.ValidateRegister(valid()))
	})

	t.Run("success with optional name", func(t *testing.T) {
		in := valid()
		in.Name = ptr("Saqib Abdul")
		assert.Empty(t, validator.ValidateRegister(in))
	})

	t.Run("aggregates all field errors", func(t *testing.T) {
		in := validator.RegisterInput{
			Username: "x",     // too short
			Password: "short", // too short
			Email:    "",      // required
		}
		errs := validator.ValidateRegister(in)
		fields := make(map[string]bool)
		for _, e := range errs {
			fields[e.Field] = true
		}
		assert.True(t, fields["username"], "expected username error")
		assert.True(t, fields["password"], "expected password error")
		assert.True(t, fields["email"], "expected email error")
	})

	t.Run("username", func(t *testing.T) {
		cases := []struct {
			label    string
			username string
			wantErr  string
		}{
			{"too short (7 chars)", "short1a", "must be between 8 and 12 characters"},
			{"too long (13 chars)", "toolongusrname", "must be between 8 and 12 characters"},
			{"exactly 8 chars", "abcde123", ""},
			{"exactly 12 chars", "abcde1234567", ""},
			{"starts with digit", "1startdig1", "must start with a letter"},
			{"trailing underscore", "username_", "must start with a letter"},
			{"trailing hyphen", "username-", "must start with a letter"},
			{"consecutive separators", "ab__cdefgh", "must start with a letter"},
			{"illegal char @", "user@name1", "must start with a letter"},
			{"valid with hyphen", "my-user01", ""},
			{"valid with underscore", "my_user01", ""},
		}

		for _, tc := range cases {
			t.Run(tc.label, func(t *testing.T) {
				in := valid()
				in.Username = tc.username
				errs := validator.ValidateRegister(in)
				if tc.wantErr == "" {
					assert.Empty(t, errs)
					return
				}
				found := false
				for _, e := range errs {
					if e.Field == "username" && strings.Contains(e.Error, tc.wantErr) {
						found = true
					}
				}
				assert.True(t, found, "expected username error %q, got %v", tc.wantErr, errs)
			})
		}
	})

	t.Run("password", func(t *testing.T) {
		cases := []struct {
			label    string
			password string
			wantErr  string
		}{
			{"too short (7)", "short1a", "must be at least 8 characters"},
			{"exactly 8", "Secure1!", ""},
			{"exactly 72 bytes", strings.Repeat("a", 72), ""},
			{"73 bytes", strings.Repeat("a", 73), "must not exceed 72 characters"},
		}

		for _, tc := range cases {
			t.Run(tc.label, func(t *testing.T) {
				in := valid()
				in.Password = tc.password
				errs := validator.ValidateRegister(in)
				if tc.wantErr == "" {
					assert.Empty(t, errs)
					return
				}
				found := false
				for _, e := range errs {
					if e.Field == "password" && strings.Contains(e.Error, tc.wantErr) {
						found = true
					}
				}
				assert.True(t, found, "expected password error %q, got %v", tc.wantErr, errs)
			})
		}
	})

	t.Run("email", func(t *testing.T) {
		cases := []struct {
			label   string
			email   string
			wantErr string
		}{
			{"empty", "", "required"},
			{"invalid format", "notanemail", "invalid email format"},
			{"exceeds 254 chars", strings.Repeat("a", 250) + "@b.co", "must not exceed 254 characters"},
			{"valid", "user@example.com", ""},
		}

		for _, tc := range cases {
			t.Run(tc.label, func(t *testing.T) {
				in := valid()
				in.Email = tc.email
				errs := validator.ValidateRegister(in)
				if tc.wantErr == "" {
					assert.Empty(t, errs)
					return
				}
				found := false
				for _, e := range errs {
					if e.Field == "email" && strings.Contains(e.Error, tc.wantErr) {
						found = true
					}
				}
				assert.True(t, found, "expected email error %q, got %v", tc.wantErr, errs)
			})
		}
	})

	t.Run("name", func(t *testing.T) {
		cases := []struct {
			label   string
			name    *string
			wantErr string
		}{
			{"nil (omitted)", nil, ""},
			{"empty string", ptr(""), "must not be empty if provided"},
			{"exceeds 100 chars", ptr(strings.Repeat("a", 101)), "must not exceed 100 characters"},
			{"valid", ptr("Saqib"), ""},
		}

		for _, tc := range cases {
			t.Run(tc.label, func(t *testing.T) {
				in := valid()
				in.Name = tc.name
				errs := validator.ValidateRegister(in)
				if tc.wantErr == "" {
					assert.Empty(t, errs)
					return
				}
				found := false
				for _, e := range errs {
					if e.Field == "name" && strings.Contains(e.Error, tc.wantErr) {
						found = true
					}
				}
				assert.True(t, found, "expected name error %q, got %v", tc.wantErr, errs)
			})
		}
	})
}
