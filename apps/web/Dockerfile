FROM node:22-alpine AS deps

WORKDIR /app

# TODO: in the monorepo layout the lockfile lives at the repo root, not here — revisit this COPY when the web app is scaffolded
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

RUN adduser -D -u 1001 appuser

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
