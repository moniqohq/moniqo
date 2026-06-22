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
// Files: templates/<name>.html and templates/<name>.txt, both inside this package.
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
		return "", err
	}
	var buf bytes.Buffer
	if err := tmpl.ExecuteTemplate(&buf, "subject", data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func renderHTML(name TemplateName, data any) (string, error) {
	base := "templates/base.html"
	content := fmt.Sprintf("templates/%s.html", name)
	tmpl, err := htmltmpl.ParseFS(templateFS, base, content)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := tmpl.ExecuteTemplate(&buf, "base", data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func renderText(name TemplateName, data any) (string, error) {
	path := fmt.Sprintf("templates/%s.txt", name)
	tmpl, err := texttmpl.ParseFS(templateFS, path)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}
