// Package migrations embeds SQL migration files for use by the database migrator.
package migrations

import "embed"

// Migrations holds the embedded SQL migration files.
//
//go:embed *
var Migrations embed.FS
