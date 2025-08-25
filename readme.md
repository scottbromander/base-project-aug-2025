# Base Project — FastAPI + Postgres + React (Vite) + Docker Compose

One-command local stack with:

- **Postgres 16** (containerized, mapped to host `55432`)
- **FastAPI** + **SQLAlchemy 2.0** + **Alembic** (API & migrations)
- **React + Vite + Zustand** (frontend, hot-reload in Docker)
- **Idempotent DB bootstrap** (`ensure-db` makes sure `appuser/appdb` exist even on reused volumes)

Perfect for “clone → up → build stuff”.

---

## TL;DR (Quickstart)

```bash
# 0) prerequisites: Docker Desktop installed & running

# 1) create .env at repo root
echo "POSTGRES_PASSWORD=postgrespass" > .env

# 2) bring up the stack
docker compose up -d --build

# 3) open:
# API docs:    http://localhost:8000/docs
# Frontend:    http://localhost:5173
# Postgres DSN (from host tools like Postico):
#   host=localhost port=55432 db=appdb user=appuser password=apppass
```

---

## What’s inside

### Services

| Service     | Purpose                          | Host URL / Port                    | In-cluster host |
| ----------- | -------------------------------- | ---------------------------------- | --------------- |
| `db`        | Postgres 16 (Alpine)             | `localhost:55432` → container 5432 | `db:5432`       |
| `ensure-db` | One-shot role/db creator         | _n/a_ (exits after success)        | hits `db`       |
| `api`       | FastAPI (+ SQLAlchemy + Alembic) | `http://localhost:8000`            | `api:8000`      |
| `web`       | React + Vite (Zustand)           | `http://localhost:5173`            | `web:5173`      |

> `ensure-db` makes first-run painless **and** fixes old volumes: it creates `appuser` and `appdb` if missing.

### Directory layout

```
.
├─ compose.yaml
├─ .env
├─ db/
│  └─ init.sql                  # first-boot SQL (safe, idempotent)
├─ backend/
│  ├─ Dockerfile
│  ├─ requirements.txt
│  └─ app/
│     ├─ main.py                # /, /health, /api/items (GET/POST)
│     ├─ database.py            # SQLAlchemy engine/session Base
│     ├─ models.py              # Item model
│     └─ schemas.py             # Pydantic (ItemIn/ItemOut)
└─ frontend/
   ├─ Dockerfile
   ├─ package.json
   ├─ tsconfig.json
   ├─ vite.config.ts
   └─ src/
      ├─ main.tsx
      ├─ App.tsx
      └─ store.ts               # Zustand store (fetch/add items)
```

---

## Environment

- Create a repo-root **`.env`** (used by `db` and `ensure-db`):

```env
POSTGRES_PASSWORD=postgrespass
```

- API uses this connection string (in `compose.yaml`):

```
postgresql+psycopg://appuser:apppass@db:5432/appdb
```

- Frontend talks to API via env `VITE_API_URL` (already set in `compose.yaml` to `http://localhost:8000`).

> Want different app creds? Edit `db/init.sql` and the `ensure-db` command block to match, plus `DATABASE_URL` for `api`.

---

## Run, Stop, Reset

```bash
# up (build if needed)
docker compose up -d --build

# logs
docker compose logs -f db
docker compose logs -f api
docker compose logs -f web

# status
docker compose ps

# stop
docker compose down

# nuke db data (fresh init next boot)
docker compose down -v
```

---

## API Endpoints (starter)

- `GET /` → `{"message":"FastAPI is alive"}`
- `GET /health` → `{"ok": true}` when DB reachable
- `GET /api/items` → list items
- `POST /api/items` → create `{ "name": "Your item" }`

Open **Swagger** at `http://localhost:8000/docs`.

---

## Database Access (from your host)

- **Postico** favorite:

```
Host:     localhost
Port:     55432
Database: appdb
User:     appuser
Password: apppass
SSL:      Default/Disable
```

- **psql**:

```bash
psql -h localhost -p 55432 -U appuser -d appdb -c "\dt"
```

> Why `55432`? It avoids clashes with a local Postgres on `5432`.

---

## Migrations (Alembic)

Migrations run inside the **api** container.

```bash
# shell into api
docker compose exec api bash

# one-time (if not already initialized)
alembic init alembic
# edit alembic.ini:
#   sqlalchemy.url = postgresql+psycopg://appuser:apppass@db:5432/appdb
# edit alembic/env.py to use:
#   from app.database import Base
#   from app import models
#   target_metadata = Base.metadata

# autogenerate new migration from models
alembic revision --autogenerate -m "your change"

# apply
alembic upgrade head

exit
```

> Tip: for a fully hands-off dev flow, you can add a small `migrate` service that runs `alembic upgrade head` on boot.

---

## Frontend Dev Notes

- The web container runs Vite dev server (`0.0.0.0:5173`) with hot reload.
- For VS Code IntelliSense **on your host**, it helps to have local deps (optional for runtime):

```bash
cd frontend
npm ci
# if you see "Cannot find module '@vitejs/plugin-react'":
#   npm i -D @vitejs/plugin-react
```

- If TypeScript shows `Property 'env' does not exist on type 'ImportMeta'`, add Vite types in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

---

## Troubleshooting

**Port already in use**  
Change host mappings in `compose.yaml` (e.g., `55432:5432`, `8001:8000`, `5174:5173`).

**Postico login fails / role missing**  
The stack ensures `appuser/appdb` via `db/init.sql` on first boot and `ensure-db` on every boot.  
If you changed creds, update them in both places and in `DATABASE_URL`, then `docker compose up -d --build`.

**Rollup optional dependency error (`@rollup/rollup-*-*` not found)**

```bash
# regenerate lockfile for Linux inside a Node container, then rebuild
docker run --rm -it -v "$PWD/frontend:/work" -w /work node:20-bookworm-slim sh -lc   'rm -rf node_modules package-lock.json && npm install'
docker compose build --no-cache web && docker compose up -d web
```

Or set `ROLLUP_SKIP_NODEJS_NATIVE=true` on the `web` service env.

**CORS errors in browser**  
Ensure `CORS_ORIGINS` for `api` includes `http://localhost:5173`.  
Recreate the `api` service after edits: `docker compose up -d --build api`.

**Editor can’t resolve React/Vite types**  
`cd frontend && npm ci`  
VS Code → “TypeScript: Select TypeScript Version” → “Use Workspace Version”.

---

## Roadmap ideas

- WebSockets (FastAPI) for live updates
- TanStack Query or keep Zustand + optimistic updates
- Auth (JWT/sessions), RBAC, rate limiting
- CI (GitHub Actions): lint/test/build/push images
- Prod profile: Nginx SPA, Gunicorn/Uvicorn workers, TLS via Caddy/Traefik
- Observability: Prometheus metrics + Sentry

---

## License

This project is released under the **Zero-Clause BSD (0BSD)** license — a no-strings-attached permissive license.
You may use, copy, modify, and distribute this software **with or without fee** and **without attribution**.
See [LICENSE](./LICENSE) for full text. **No warranty** is provided.

---

Happy building! 🚀
