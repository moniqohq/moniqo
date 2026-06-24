# Moniqo is a personal finance management application designed to help users
# track, manage, and optimize their financial activities.
#
# Copyright (C) 2026 Moniqo <support@moniqo.in>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
