FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

FROM alpine:3.21

RUN apk add --no-cache wget && \
    adduser -D -u 1001 appuser

WORKDIR /app

COPY --from=builder /app/server .

RUN chown appuser:appuser /app/server

USER appuser

EXPOSE 8080

CMD ["./server"]
