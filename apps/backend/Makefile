.PHONY: build run test sqlc-generate migrate-up migrate-down

build:
	go build ./cmd/server

run:
	go run ./cmd/server

test:
	go test -v -count=1 ./...

sqlc-generate:
	cd db && sqlc generate

migrate-up:
	goose -dir db/migrations postgres "$(DATABASE_URL)" up

migrate-down:
	goose -dir db/migrations postgres "$(DATABASE_URL)" down
