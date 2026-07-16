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
#
# Build context for this Dockerfile is the monorepo root (the pnpm
# workspace lockfile lives there), e.g.:
#   docker build -f apps/web/Dockerfile .

FROM docker.io/library/node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter=@moniqo/web...

FROM docker.io/library/node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY --from=deps /app ./
COPY apps/web ./apps/web
RUN pnpm --filter=@moniqo/web run build

FROM docker.io/library/node:22-alpine AS runner

RUN apk add --no-cache wget && \
    adduser -D -u 1001 appuser

WORKDIR /app

ENV NODE_ENV=production
# Next's standalone server binds to $HOSTNAME if set, and Docker sets
# $HOSTNAME to the container ID by default — pin it to all interfaces so
# the server is reachable on 127.0.0.1 (needed for the in-container healthcheck).
ENV HOSTNAME=0.0.0.0

# The standalone output's node_modules symlinks are relative and assume the
# workspace's original depth (apps/web/... alongside root node_modules), so
# it's copied as-is rather than flattened.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

RUN chown -R appuser:appuser /app

USER appuser

WORKDIR /app/apps/web

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
