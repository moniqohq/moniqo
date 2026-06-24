/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

package email

import (
	"bytes"
	"embed"
	"fmt"

	htmltmpl "html/template"
	texttmpl "text/template"
)

//go:embed templates
var templateFS embed.FS

// rendered holds the produced email bodies and subject line.
type rendered struct {
	Subject  string
	HTMLBody string
	TextBody string
}

// render produces HTML and plaintext bodies for the given template name and data.
// Files: templates/<name>.html and templates/<name>.tmpl, both inside this package.
func renderTemplate(name TemplateName, data any) (rendered, error) {
	subject, err := renderSubject(name, data)
	if err != nil {
		return rendered{}, fmt.Errorf("email render subject %s: %w", name, err)
	}

	htmlBody, err := renderHTML(name, data)
	if err != nil {
		return rendered{}, fmt.Errorf("email render html %s: %w", name, err)
	}

	textBody, err := renderText(name, data)
	if err != nil {
		return rendered{}, fmt.Errorf("email render text %s: %w", name, err)
	}

	return rendered{Subject: subject, HTMLBody: htmlBody, TextBody: textBody}, nil
}

func renderSubject(name TemplateName, data any) (string, error) {
	path := fmt.Sprintf("templates/%s.html", name)
	tmpl, err := htmltmpl.ParseFS(templateFS, path)
	if err != nil {
		return "", fmt.Errorf("parse subject template: %w", err)
	}
	var buf bytes.Buffer
	if err := tmpl.ExecuteTemplate(&buf, "subject", data); err != nil {
		return "", fmt.Errorf("execute subject template: %w", err)
	}
	return buf.String(), nil
}

func renderHTML(name TemplateName, data any) (string, error) {
	base := "templates/base.html"
	content := fmt.Sprintf("templates/%s.html", name)
	tmpl, err := htmltmpl.ParseFS(templateFS, base, content)
	if err != nil {
		return "", fmt.Errorf("parse html template: %w", err)
	}
	var buf bytes.Buffer
	if err := tmpl.ExecuteTemplate(&buf, "base", data); err != nil {
		return "", fmt.Errorf("execute html template: %w", err)
	}
	return buf.String(), nil
}

func renderText(name TemplateName, data any) (string, error) {
	path := fmt.Sprintf("templates/%s.tmpl", name)
	tmpl, err := texttmpl.ParseFS(templateFS, path)
	if err != nil {
		return "", fmt.Errorf("parse text template: %w", err)
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("execute text template: %w", err)
	}
	return buf.String(), nil
}
