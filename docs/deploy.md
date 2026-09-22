# Deploying Kingdom Companion

Production runs on a Hostinger KVM 4 VPS at `72.60.164.48`, in Docker
containers, behind the shared Caddy that already fronts the other apps
on that box. Public URL: **https://kc.blmfamily.com**.

Stack:

- **Caddy** (host) — TLS + reverse proxy on 80/443, auto Let's Encrypt.
- **web** (`kingdom-companion-web`) — Next 16 standalone, listens on 3000
  inside the container, published to `127.0.0.1:8804` on the host.
- **db** (`postgres:16-alpine`) — persistent volume `db-data`, published
  to `127.0.0.1:35432` on the host for tooling only.

Auto-deploy: any push to `master` triggers `.github/workflows/deploy.yml`,
which SSHes into the VPS and runs `git pull && docker compose up -d`.

---

## First-time setup

Do these steps once. Later deploys are just `git push origin master`.

### 1. DNS

In Squarespace → Domains → `blmfamily.com` → DNS Settings, add:

| Host | Type | Value          |
| ---- | ---- | -------------- |
| `kc` | A    | `72.60.164.48` |

Wait for propagation (usually a few minutes; check with
`dig kc.blmfamily.com` or https://dnschecker.org).

### 2. Clone the repo on the VPS

SSH in as `deploy` (or root, then `su - deploy`).

```bash
sudo mkdir -p /opt/kingdom-companion
sudo chown deploy:deploy /opt/kingdom-companion
cd /opt/kingdom-companion
git clone git@github.com:ivyrlong/kingdom-companion.git .
git checkout master
```

The `deploy` user needs a GitHub deploy key with read access to the
repo (Settings → Deploy keys → Add key; use `ssh-keygen -t ed25519`
on the VPS if it doesn't already have one).

### 3. Create `.env` with real secrets

```bash
cd /opt/kingdom-companion
cp .env.example .env
```

Then edit `.env` and set:

- `POSTGRES_PASSWORD` — a long random string. `openssl rand -base64 24`
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_URL=https://kc.blmfamily.com`

The other vars can keep their defaults. Never commit `.env`.

### 4. Bring up the stack

```bash
cd /opt/kingdom-companion
docker compose up -d --build
```

First build takes 3–5 minutes (npm ci + next build). The entrypoint
runs `prisma migrate deploy` automatically before the server starts;
the initial run creates all tables. Verify:

```bash
docker compose ps
docker compose logs -f web    # ctrl-c to detach
curl -s http://127.0.0.1:8804/api/auth/session
```

### 5. Add the Caddy site block

As root:

```bash
cat /opt/kingdom-companion/Caddyfile.kc | sudo tee -a /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy issues the Let's Encrypt cert on the first request (DNS must
resolve first — step 1). Watch it happen:

```bash
sudo journalctl -u caddy -f
```

Hit https://kc.blmfamily.com in a browser to confirm.

### 6. GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions → New repository
secret. Add:

| Name              | Value                                                 |
| ----------------- | ----------------------------------------------------- |
| `DEPLOY_SSH_HOST` | `72.60.164.48`                                        |
| `DEPLOY_SSH_USER` | `deploy`                                              |
| `DEPLOY_SSH_KEY`  | Private key for a deploy-only ed25519 keypair (below) |
| `DEPLOY_SITE_URL` | `https://kc.blmfamily.com`                            |

Generate a dedicated deploy keypair (not your personal key) so it can
be rotated without breaking anything else:

```bash
# On any machine — the private key goes in the GH secret, the public
# key goes on the VPS as /home/deploy/.ssh/authorized_keys entry.
ssh-keygen -t ed25519 -f deploy-key -N "" -C "gh-actions-kc"
```

Copy `deploy-key` (private) into `DEPLOY_SSH_KEY` in GitHub, then
paste `deploy-key.pub` into `/home/deploy/.ssh/authorized_keys` on
the VPS. Delete the local `deploy-key` files after.

### 7. Trigger the first automated deploy

Any push to `master` (or the manual **Run workflow** button on the
Actions tab) will now redeploy end-to-end.

---

## Everyday operations

### Deploy a change

```bash
git push origin master   # that's it — Actions handles the rest
```

Watch the run at https://github.com/ivyrlong/kingdom-companion/actions.

### Read production logs

```bash
ssh deploy@72.60.164.48
cd /opt/kingdom-companion
docker compose logs -f web       # app logs
docker compose logs -f db        # postgres logs
```

### Roll back to a previous commit

```bash
ssh deploy@72.60.164.48
cd /opt/kingdom-companion
git log --oneline -20
git reset --hard <sha>
docker compose up -d --build web
```

Note: this only rolls back application code, **not database
migrations**. A migration that was already applied stays applied.
For a real rollback that includes schema, restore the db volume
from a snapshot (see Backups below) before doing the git reset.

### Run one-off DB commands

```bash
ssh deploy@72.60.164.48
cd /opt/kingdom-companion
docker compose exec db psql -U kc -d kingdom_companion
# or from the host with a real psql client:
PGPASSWORD=<POSTGRES_PASSWORD> psql -h 127.0.0.1 -p 35432 -U kc kingdom_companion
```

### Backups

Volume snapshots via Hostinger's built-in snapshot feature cover the
full VM. For per-app dumps:

```bash
docker compose exec db pg_dump -U kc kingdom_companion \
  | gzip > "/opt/kingdom-companion/backups/kc-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
```

---

## Uploads

User-uploaded stickers / card art live on the host at
`/opt/kingdom-companion/data/uploads/` (bind-mounted into the web
container at `/app/public/uploads/`). They survive container rebuilds
and image pruning; they do **not** survive `docker volume rm` on the
`db-data` volume or `rm -rf data/uploads`. Back them up alongside the
DB.

---

## Troubleshooting

**Caddy shows `502 Bad Gateway`** — web container is down or unhealthy.
Check `docker compose ps` and `docker compose logs web`.

**`AUTH_URL is required` on startup** — `.env` on the VPS is missing
or the compose stack was started without loading it. Confirm
`docker compose config` shows the env values.

**Prisma migration fails on deploy** — the entrypoint runs
`prisma migrate deploy` and exits nonzero. Read the log, connect
manually (`docker compose exec db psql -U kc kingdom_companion`),
and either fix the migration file in a follow-up commit or
`prisma migrate resolve --applied <name>` from a shell in the web
container after correcting drift.

**Let's Encrypt cert didn't issue** — DNS hadn't propagated yet. Wait
and `sudo systemctl reload caddy`. Caddy retries automatically.
