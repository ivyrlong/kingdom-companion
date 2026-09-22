# syntax=docker/dockerfile:1
# Kingdom Companion — Next 16 (standalone) + Prisma 7 (@prisma/adapter-pg).
# Multi-stage: deps → builder → runner. Final image is node:20-slim so
# Prisma's default linux-x64 engine binaries work without musl workarounds.

# ---------- deps ----------
FROM node:20-slim AS deps
WORKDIR /app
# openssl is Prisma's runtime dep; libc is already glibc on -slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
# Schema is needed here because `postinstall` (if present) or later
# `prisma generate` in the builder stage assumes it sits next to the
# node_modules we install from this stage's cache.
COPY prisma ./prisma
RUN npm ci

# ---------- builder ----------
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma client must be generated before `next build` so any server
# component that imports @prisma/client type-checks and traces cleanly.
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs --home /app nextjs

# Next's standalone output ships its own trimmed node_modules; we copy it
# plus .next/static and public into the runner's working dir.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# Prisma runtime bits that the tracer doesn't always pick up, plus the
# CLI + migrations so the entrypoint can run `prisma migrate deploy`
# against the db container at startup.
COPY --from=builder --chown=nextjs:nodejs /app/prisma                     ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma       ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma       ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma        ./node_modules/prisma
# prisma.config.ts imports "dotenv/config", so dotenv must resolve at
# runtime when the entrypoint runs `prisma migrate deploy`. It is a
# transitive install today; copy it explicitly so a future dep
# reshuffle can't quietly break the container start.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv        ./node_modules/dotenv

COPY --chown=nextjs:nodejs docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nextjs
# Standalone's server.js reads HOSTNAME + PORT. 0.0.0.0 so the docker
# network can reach it; Caddy on the host talks to us over 127.0.0.1:8804
# which docker-proxy maps to this container's 3000.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["/entrypoint.sh"]
