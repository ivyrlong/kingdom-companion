#!/bin/sh
# Container entrypoint. Runs pending Prisma migrations against the db,
# then boots the Next standalone server. `migrate deploy` is idempotent
# and safe to run on every start; it applies only migrations not yet
# recorded in the _prisma_migrations table.
set -e

echo "[entrypoint] Applying database migrations..."
npx --no-install prisma migrate deploy

echo "[entrypoint] Starting Next.js standalone server on :$PORT"
exec node server.js
