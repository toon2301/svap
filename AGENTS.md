# Agents

## Cursor Cloud specific instructions

### Overview

Swaply is a skills exchange platform ("Tinder for skills") with a **Django** backend and **Next.js 14** frontend. The UI is primarily in Slovak.

### Services

| Service | Port | How to start |
|---------|------|-------------|
| Backend (Django) | 8000 | See below |
| Frontend (Next.js) | 3000 | `cd frontend && npm run dev` |

### Critical environment variables

The VM may inject production env vars (`DATABASE_URL`, `DEBUG=False`, `ALLOWED_HOSTS=*`) that **break local dev**. Always override them when running backend commands:

```bash
cd /workspace/backend && source venv/bin/activate
unset DATABASE_URL
export DEBUG=True
export ALLOWED_HOSTS="localhost,127.0.0.1,0.0.0.0"
export CAPTCHA_ENABLED=False
export SAFESEARCH_ENABLED=False
```

Then run: `python manage.py runserver 0.0.0.0:8000`

For the frontend: `cd /workspace/frontend && NEXT_PUBLIC_API_URL=http://localhost:8000/api npm run dev`

### Database

In dev, Django falls back to SQLite (no PostgreSQL required). Just run `python manage.py migrate` with `DATABASE_URL` unset.

### Gotchas

- **`setuptools` version**: `djangorestframework-simplejwt` uses `pkg_resources` which was removed in `setuptools>=82`. The venv pins `setuptools<81` to work around this.
- **ESLint config**: The repo ships without `.eslintrc.json`. If `next lint` prompts interactively, create `frontend/.eslintrc.json` with `{"extends": "next/core-web-vitals"}`.
- **CORS**: When running backend and frontend on separate ports, set `CORS_ALLOWED_ORIGINS=http://localhost:3000` on the backend.

### Lint / Test / Build

- **Backend lint**: `cd backend && source venv/bin/activate && python -m ruff check .`
- **Backend tests**: `cd backend && source venv/bin/activate && python -m pytest` (requires env overrides above)
- **Backend format**: `cd backend && source venv/bin/activate && python -m black .`
- **Frontend lint**: `cd frontend && npx next lint`
- **Frontend tests**: `cd frontend && npx jest --ci --watchAll=false`
- **Frontend build**: `cd frontend && npm run build`
- **All backend checks**: `make check-all` (from repo root; see `Makefile`)
