# Bag of

Bag of is a shared party loot manager for TTRPGs. It is accountless by design: one DM link and one link per player.

Built with a retro 8-bit UI style using [8bitcn/ui](https://8bitcn.com).

## Quickstart (Local Dev)

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Set `LOCAL_POSTGRES_URL` in `.env.local` to your local Postgres database.

4. Run:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` - start local dev server
- `pnpm test` - run tests once
- `pnpm test:watch` - run tests in watch mode
- `pnpm build` - production build
- `pnpm lint` - lint project

## Environment and Databases

See `docs/environment.md` for full details.

At a glance:

- Local/dev runtime prefers `LOCAL_POSTGRES_URL` (or `POSTGRES_URL_LOCAL`).
- Vercel runtime uses `POSTGRES_URL`.
- During `pnpm build`, DB migration attempts are safely skipped when DB is unreachable so builds can still complete.

## API Docs

- `docs/api.md` - current endpoint contracts, request/response examples, and notes

## Architecture Overview

Core flow:

1. DM creates a session on `/`.
2. App generates one DM link and one player link per member.
3. DM dashboard (`/dm/[token]`) manages party bag, member inventories, and currency operations.
4. Player dashboard (`/p/[token]`) manages personal inventory, party bag interactions, and activity.

Main areas:

- `app/api/*`: route handlers for session, items, gold, members, refresh, activity, import/export.
- `components/*`: UI and feature components.
- `db/*`: DB client setup and query layer.
- `lib/*`: shared utilities (rate limit, helpers, local storage helpers).
- `types/*`: shared TypeScript types.

## Contributing

Please read `CONTRIBUTING.md` before opening a PR.

## Deploying

Vercel is the primary deployment target.

1. Push to GitHub.
2. Import repo in Vercel.
3. Configure production env vars (`POSTGRES_URL`, secrets).
4. Deploy.

## Known Tradeoffs

- Query logic currently lives in `db/queries.ts` (large file; planned split by domain).
- API routes are all dynamic to avoid static build-time DB coupling.
- Build can pass even if DB is unreachable, but runtime still requires DB connectivity.

## Roadmap (Short Term)

- Split `db/queries.ts` into domain-focused modules.
- Normalize API response shape and error structure.
- Expand integration-style tests for key user flows.
