# Railway HTTP + WebSocket Split

This project now supports three backend runtime modes via `backend/start.sh`:

- `APP_SERVER_MODE=all`
  - Compatibility mode.
  - Runs Django HTTP + WebSocket traffic together on `daphne`.
- `APP_SERVER_MODE=http`
  - Runs Django HTTP API on `gunicorn` / WSGI.
  - Best choice for API latency and DB connection reuse.
- `APP_SERVER_MODE=ws`
  - Runs WebSocket traffic on `daphne` / ASGI.

## Recommended Railway setup

Create two backend services from the same `backend/` directory:

1. `backend-http`
   - Start command: `./start.sh`
   - Variables:
     - `APP_SERVER_MODE=http`
     - `RUN_STARTUP_TASKS=1`

2. `backend-ws`
   - Start command: `./start.sh`
   - Variables:
     - `APP_SERVER_MODE=ws`
     - `RUN_STARTUP_TASKS=0`

Keep the existing Celery worker separate.

## Frontend variables

Point API traffic and WebSocket traffic to the correct service origins:

- `BACKEND_ORIGIN=https://<backend-http-domain>`
- `BACKEND_WS_ORIGIN=https://<backend-ws-domain>`
- `NEXT_PUBLIC_BACKEND_ORIGIN=https://<backend-http-domain>`
- `NEXT_PUBLIC_BACKEND_WS_ORIGIN=https://<backend-ws-domain>`

`frontend/next.config.js` will now proxy:

- `/api/*` -> `BACKEND_ORIGIN`
- `/media/*` -> `BACKEND_ORIGIN`
- `/ws/*` -> `BACKEND_WS_ORIGIN` (fallbacks to `BACKEND_ORIGIN` if unset)

This keeps cookies first-party from the browser's perspective because the browser still talks to the frontend origin.

## Rollout suggestion

1. Deploy the new backend code first in compatibility mode (`APP_SERVER_MODE=all`).
2. Create `backend-http` and `backend-ws` Railway services from the same repo root directory.
3. Set the frontend env vars to route `/api` and `/ws` separately.
4. Validate:
   - Google login
   - `/api/auth/me/`
   - `/api/auth/messaging/conversations/`
   - `/ws/notifications/`
5. Once stable, retire the old all-in-one backend service.
