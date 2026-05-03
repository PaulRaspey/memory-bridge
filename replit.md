# Memory Bridge

A personal structured handoff tool for Claude sessions. Captures session context — active work, decisions, open questions, context snippets, emotional state — and generates a prompt for the next Claude session.

## Architecture

### Frontend — `artifacts/memory-bridge` (React + Vite + TypeScript + Tailwind)
- **Port**: assigned by Replit via `$PORT` env var
- **Routes**: `/` (Dashboard), `/new` (Compose), `/threads/:name` (ThreadView), `/settings`
- **Proxy**: Vite dev proxy forwards `/v1` and `/p` to `localhost:8082` (API server)
- **Theme**: Dark — bg `#0F1419`, accent `#A78BFA` (violet), text `#E8E6E1`
- **Auth**: Bearer token stored in `localStorage` under key `bridge_token`, defaults to env `BRIDGE_TOKEN`

### Backend — `artifacts/api-server` (FastAPI + Python 3.11 + SQLite)
- **Port**: 8082 (NOT 8080/8081 — those are occupied by Replit's internal proxy)
- **Entry point**: `artifacts/api-server/run.py` → `uvicorn backend.main:app`
- **Database**: SQLite at `artifacts/api-server/data/bridge.db`
- **Auth**: Single bearer token, checked against `BRIDGE_TOKEN` env var
- **Docs**: `/v1/docs` (Swagger), `/v1/redoc`

### Key API Routes
- `GET /v1/healthz` — health check (no auth)
- `GET/POST /v1/handoffs` — list/create handoffs
- `GET/PUT/DELETE /v1/handoffs/{id}` — single handoff CRUD
- `GET /v1/handoffs/{id}/as-prompt` — returns full markdown prompt
- `GET /v1/threads` — list thread names with counts
- `GET /p/{thread_name}/latest` — latest handoff (no auth, for Claude)
- `GET /p/{id}` — specific handoff by ID (no auth)
- `GET /v1/config` — returns base URL for settings page

## Environment Variables / Secrets
- `BRIDGE_TOKEN` — required on server; must match token stored in frontend's localStorage
- `SESSION_SECRET` — available but not currently used (reserved)

## Critical Notes
- **Port 8080 is occupied by Replit's proxy** — never use it for services. Use 8082+.
- **watchfiles must NOT be installed** — `uvicorn[standard]` ships watchfiles which causes auto-reload even with `reload=False`, triggering EADDRINUSE. It was uninstalled manually.
- If watchfiles gets reinstalled: `python3 -m pip uninstall watchfiles -y`
- The `run.py` script uses `loop="asyncio"` and `http="h11"` to avoid httptools/uvloop from `[standard]` extras.

## File Structure
```
artifacts/
  api-server/
    backend/
      main.py          # FastAPI app, mounts all routers
      auth.py          # Bearer token middleware
      db.py            # SQLAlchemy setup, SQLite
      models.py        # ORM models
      schemas.py       # Pydantic schemas
      ids.py           # Nanoid-style ID generation
      utils.py         # Prompt generation
      routes/
        handoffs.py    # CRUD routes
        threads.py     # Thread listing
        public.py      # Auth-free public read routes
    data/
      bridge.db        # SQLite database
    run.py             # Startup script (no watchfiles, port 8082)
  memory-bridge/
    src/
      api/client.ts    # API client with field normalization
      hooks/queries.ts # React Query hooks
      pages/
        dashboard.tsx       # 3-panel: threads / sessions / detail
        compose.tsx         # New handoff form
        handoff-detail.tsx  # Read-only handoff view
        thread-view.tsx     # Thread-scoped session list + detail
        settings.tsx        # Token config, public URLs, thread list
        not-found.tsx
      components/
        layout.tsx          # Nav header with New Session + Settings buttons
        relative-time.tsx   # Auto-refreshing timestamp
        ui/                 # shadcn/ui components
```
