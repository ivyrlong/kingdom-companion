#!/bin/sh
# Container entrypoint. Runs pending Prisma migrations against the db,
# then boots the Next standalone server. `migrate deploy` is idempotent
# and safe to run on every start; it applies only migrations not yet
# recorded in the _prisma_migrations table.
set -e

echo "[entrypoint] Applying database migrations..."
# Call prisma's build/index.js directly instead of via `npx prisma`.
# The .bin/ shim lives in the builder's node_modules and does not
# survive into the standalone runner, so PATH-based CLI lookup fails
# with "prisma: not found". The prisma package itself is copied into
# the runner (see Dockerfile), so this call is stable.
node ./node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Starting Next.js standalone server on :$PORT"
exec node server.js
