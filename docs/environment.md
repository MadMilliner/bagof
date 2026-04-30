# Environment and Database Behavior

## Variables

### Local/dev

- `LOCAL_POSTGRES_URL` (preferred)
- `POSTGRES_URL_LOCAL` (legacy fallback)

### Production

- `POSTGRES_URL`

## Selection logic

- Outside Vercel runtime:
  - If `LOCAL_POSTGRES_URL` or `POSTGRES_URL_LOCAL` is set, it is used.
  - Otherwise, `POSTGRES_URL` is used as fallback.
- In Vercel runtime:
  - `POSTGRES_URL` is used.

## Build behavior

During `pnpm build`, DB migration (`migrate()`) is attempted at module import time.

If DB is unreachable in build environments, migration errors are skipped so build can still succeed. Runtime requests still require a reachable DB.

You may see one warning like:

`[db] Skipping migrate() during build: ...`

This is expected when build cannot reach your DB host.
