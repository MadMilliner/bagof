# CONTEXT.md — Bag of

## Project Overview

**Bag of** is a shared party loot manager for tabletop RPGs (TTRPGs). It allows a DM to create a session, distribute unique links to players, and collaboratively manage party inventory and gold — no accounts or passwords required. The aesthetic is retro 8-bit, using the [8bitcn/ui](https://8bitcn.com) component library.

- **Live concept:** One DM link, one per player. No recovery if lost. Sessions auto-delete if never used within 31 days of creation, or not accessed for 366 days.
- **Flow:** DM visits `/session/create` → enters campaign name + member names → receives shareable links → DM manages loot pool / gold; players manage personal inventory, claim from pool, offer items back.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Vercel Postgres (`@vercel/postgres`) — raw SQL, no ORM |
| UI Components | 8bitcn/ui (shadcn-compatible 8-bit styled components, inlined) |
| Font | Press Start 2P (Google Fonts) |
| Styling | Tailwind CSS v3 + CSS variables for theming |
| Icons | `lucide-react`, `react-icons` (`gi`, `fa`, `fa6`) |
| Language | TypeScript (strict mode) |
| Package Manager | pnpm |

> ⚠️ **Note:** The README was updated to reflect the current stack (Vercel Postgres, Next.js 15, pnpm).

---

## File Structure

```
/app
  /api
    /session/route.ts      ← POST: create session + members
    /items/route.ts         ← POST/PATCH/DELETE: item CRUD
    /gold/route.ts          ← PATCH: gold operations (split, give, adjust, transfer)
    /members/route.ts       ← POST: add member; PATCH: rename member
    /refresh/route.ts       ← GET: dashboard data refresh (player + DM polling)
    /activity/route.ts      ← GET: session activity log
  /dm/[token]/page.tsx      ← DM dashboard (server component → client)
  /p/[token]/page.tsx       ← Player dashboard (server component → client)
  /session/create/page.tsx ← Session creation page
  globals.css               ← Tailwind + CSS custom properties (light/dark)
  layout.tsx                ← Root layout: font, theme, footer
  not-found.tsx             ← 404 page
  page.tsx                  ← Redirects to /session/create

/components
  /ui/8bit/                 ← Inlined 8bitcn/ui primitives
    alert-dialog.tsx
    badge.tsx
    button.tsx
    card.tsx
    input.tsx
    select.tsx
    sheet.tsx
    tabs.tsx
    textarea.tsx
  /inventory/
    AddItemForm.tsx          ← Reusable item creation form
    ItemCard.tsx             ← Item display with actions (claim/offer/edit/drop)
    ItemFilter.tsx           ← Search bar + type filter for item lists
  /gold/
    GoldPanel.tsx            ← Currency display + adjustment (shared by DM & player)
  CreateSessionForm.tsx      ← Two-step form: create → share links
  DMDashboard.tsx            ← DM view: party pool, members tab, gold tab
  PlayerDashboard.tsx        ← Player view: inventory, party bag, other members
  DiceRoller.tsx             ← Modal dice roller (parses NdN notation)
  ActivityLog.tsx             ← Chronological activity feed (icons, time-ago, expand)
  ThemeProvider.tsx           ← Light/dark theme context + toggle

/db
  index.ts                   ← Vercel Postgres `sql` + `connect` exports + `migrate()` (auto-creates tables)
  queries.ts                 ← All database helper functions (mappers + CRUD)

/lib
  utils.ts                   ← `cn()` helper (clsx + tailwind-merge)
  rateLimit.ts               ← In-memory rate limiter (IP-based, per-route limits)
  savedSessions.ts           ← localStorage persistence for DM session links

/types
  index.ts                   ← Shared TypeScript types: Item, Member, Session, etc.
```

---

## Database Schema

Four tables, auto-created on first request via `migrate()`:

### `sessions`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| dm_token | TEXT UNIQUE | UUID — used as DM auth |
| name | TEXT | Campaign name |
| currency_type | TEXT | `'dnd'` or `'wealth'` |
| dm_role | TEXT | e.g. `'Dungeon Master'`, `'Game Master'` |
| party_gold | INTEGER | Shared party gold (in copper pieces) |
| last_accessed_at | TIMESTAMPTZ | Updated on dashboard refresh (null = never accessed) |
| created_at | TIMESTAMPTZ | |

### `members`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| session_id | TEXT FK → sessions | CASCADE delete |
| name | TEXT | Player display name (editable) |
| token | TEXT UNIQUE | UUID — used as player auth |
| public_gold | INTEGER | Public gold (copper pieces) |
| private_gold | INTEGER | Hidden gold (copper pieces) |
| created_at | TIMESTAMPTZ | |

### `items`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| session_id | TEXT FK → sessions | CASCADE delete |
| owner_id | TEXT FK → members | NULL = in party pool; SET NULL on member delete |
| name | TEXT | |
| description | TEXT | Supports dice notation (e.g. `1d20+5`) and URLs |
| type | TEXT | CHECK: `'Weapon'`, `'Armor'`, `'Consumable'`, `'Other'` |
| private | BOOLEAN | If true, hidden from other players |
| offered_to_party | BOOLEAN | Tracking flag for offered items |
| quantity | INTEGER | |
| created_at | TIMESTAMPTZ | |

### `activity_log`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| session_id | TEXT FK → sessions | CASCADE delete |
| member_id | TEXT FK → members | NULL for DM actions; SET NULL on member delete |
| actor_name | TEXT | Display name of the actor (denormalized for performance) |
| action | TEXT | Action type key (e.g., `item_claim`, `gold_split`) |
| details | TEXT | Human-readable description of the action |
| created_at | TIMESTAMPTZ | |

### Indexes
- `idx_members_session`, `idx_members_token`, `idx_items_session`, `idx_items_owner`, `idx_sessions_dm_token`
- `idx_activity_session`, `idx_activity_created` (session_id + created_at DESC for efficient pagination)

---

## API Routes

### POST `/api/session`
Creates a session + member records. Returns session, DM URL, and member URLs.

### POST `/api/items`
Add an item. DM adds to party pool (qty>1 splits into individual records). Players add to personal inventory (quantity preserved as stack).

### PATCH `/api/items`
Actions: `claim` (player takes from pool — session-scoped to prevent cross-session IDOR), `offer` (player gives to pool — qty>1 splits), `update` (edit fields — validated: `quantity` clamped to 1–100, `type` checked against enum, `name`/`description` length-limited, unknown fields rejected).

### DELETE `/api/items`
Remove an item. Auth via `dmToken` (DM) or `token` (player).

### PATCH `/api/gold`
Actions: `split` (DM splits evenly among members), `give` (DM gives to specific member), `adjust` (player adjusts own gold), `party_adjust` (DM-only: add/subtract party gold), `transfer_to_pool` (player donates gold to party pool), `transfer_from_pool` (player takes gold from party pool). All amounts in copper pieces. `party_adjust` is restricted to DM tokens only — players must use `transfer_to_pool`/`transfer_from_pool` which deduct from their own balance, preventing infinite gold minting. Transfers use CTEs (`WITH deduct AS ...`) to deduct and credit atomically, preventing double-spend. Regular adjustments use `GREATEST(0, col + delta)` to prevent negative balances.

### POST `/api/members`
DM adds a new member to the session.

### PATCH `/api/members`
Player updates their display name.

### GET `/api/refresh`
Dashboard data refresh endpoint for polling. Accepts `token` and `role` (player/dm) query params. Returns fresh session, items, members, and gold data. Used by both dashboards for auto-sync.

### GET `/api/activity`
Session activity log. Accepts `token` and `role` (player/dm) query params. Returns the 50 most recent `ActivityEntry` records for the session. Used by the ActivityLog component on both dashboards.

### GET `/api/cleanup`
Session cleanup endpoint, invoked daily by Vercel Cron. Deletes sessions matching **either** criterion:
1. **Never-used within 31 days of creation** — session is >31 days old AND has no items, no activity_log entries (except `session_create`), and no members added after session creation. Catches sessions that were created but never actually played.
2. **Not accessed in 366+ days** — `last_accessed_at` is older than 366 days (long-dormant session).

Protected by `CRON_SECRET` env var (Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically). Rejects requests if `CRON_SECRET` is not configured. Returns `{ deleted: number }`.

---

## Authentication Model

**No user accounts.** Authentication is token-based via URL path segments:

- **DM:** `/dm/:dmToken` — the `dmToken` is stored in the `sessions` table. Possession of the link = full access.
- **Player:** `/p/:token` — each member has a unique `token`. Possession = that member's access.

Tokens are UUIDs, never expire, and cannot be recovered if lost. Both client and server components pass the token in API request bodies (not headers).

---

## Currency System

All gold values are stored as **copper pieces (cp)** internally:
- 1 gp = 100 cp
- 1 sp = 10 cp

Two currency display modes:
- **`dnd`** — Traditional D&D: input/display as gp/sp/cp
- **`wealth`** — Abstract: single integer ("Wealth")

Conversion helpers: `toCp()`, `fromCp()`, `formatCurrency()` in `GoldPanel.tsx`.

---

## Key Patterns & Conventions

### Rendering Architecture
- **Server components** in `app/*/page.tsx` fetch initial data, then pass it as props to **client components** (`'use client'`).
- Client components manage their own state with `useState`, making API calls and optimistically updating local state.
- **Optimistic updates with rollback:** All mutating actions apply state changes immediately, then roll back on API failure (e.g., claim item → remove from pool + add to inventory; if API fails → reverse both). Offer item also optimistically adds the item to the party pool (with temporary `__opt_` IDs) and replaces them with real server data on success. This prevents the UI from feeling stuck while waiting for network responses.
- **Auto-polling:** Both dashboards and the ActivityLog component poll their respective endpoints every 30 seconds. Polling is skipped while actions are in-flight (`loading === true`) to avoid overwriting optimistic updates with stale server data, and also skipped when the tab is not visible (`document.visibilityState !== 'visible'`) to avoid unnecessary network traffic. A manual ↻ refresh button is also provided on both dashboards.
- No global state management library — all state is component-local.
- **`otherMembers` state:** PlayerDashboard tracks other members' data as state (not just initial props), so it updates on refresh/poll.
- **Hydration guard:** Both `DMDashboard` and `PlayerDashboard` use a `mounted` state flag (`const [mounted, setMounted] = useState(false)` + early return `null`) to prevent hydration mismatches with theme-dependent rendering.
- **Dynamic metadata:** Both `/dm/[token]` and `/p/[token]` pages use `generateMetadata()` for dynamic page titles based on session/member data.
- **Next.js 15 async params:** Dynamic route pages use `params: Promise<{ token: string }>` (awaited before use), reflecting the Next.js 15 breaking change from synchronous params.

### Component Style
- All text uses `font-press-start` class (Press Start 2P font).
- 8-bit aesthetic: `border-radius: 0px`, `box-shadow: 8px 8px 0px`, sharp edges.
- Dark/light theme with CSS custom properties in `globals.css`.
- Theme persisted in `localStorage` key `bag-of-theme`.
- **FOUC prevention:** An inline `<script>` in `layout.tsx` reads `localStorage` and sets the `dark` class on `<html>` before React hydrates, preventing flash of wrong theme.

### Naming Conventions
- Files: PascalCase for components (`DMDashboard.tsx`), kebab-case for routes (`/session/create`).
- Exports: named exports (no default exports for components).
- Types: interfaces (not type aliases) in `types/index.ts`.

### Database Access
- Raw SQL via `@vercel/postgres` tagged template literals.
- Mapper functions (`mapSession`, `mapMember`, `mapItem`) convert snake_case DB rows to camelCase TypeScript objects.
- `migrate()` runs on every server start (CREATE TABLE IF NOT EXISTS + ALTER TABLE IF NOT EXISTS for schema evolution).
- **Transactions:** Multi-step operations (`offerItemSplit`, `splitGold`) use `sql.connect()` to acquire a pooled client, then `BEGIN`/`COMMIT`/`ROLLBACK` to ensure atomicity. Always `release()` the client in a `finally` block.
- **Session scoping:** Member-scoped updates require `sessionId` to prevent cross-session IDOR. Applies to `adjustMemberGold`, `claimItem`, and transfer operations.
- **Batch updates:** `splitGold` uses a single `UPDATE ... WHERE session_id = $1` instead of N individual UPDATEs.
- **Row locking:** `offerItemSplit` uses `SELECT ... FOR UPDATE` within its transaction to prevent race conditions when offering a quantity>1 item concurrently.
- **Input validation:** Item updates (`PATCH /api/items`, `action: 'update'`) are validated server-side: `quantity` is clamped to 1–100, `type` must be one of the CHECK constraint values, `name`/`description` are length-limited, and unknown fields are rejected. This prevents DB constraint violations and data corruption.
- **Rate limiting:** All API routes enforce rate limiting via `checkRateLimit()` at the top of each handler, with per-route limits (e.g., 10 session creates/min, 30 item deletes/min, 60 gold patches/min, 120 refreshes/min). Uses in-memory `Map` — persists across warm starts in the same Vercel lambda container, resets on cold starts. Not shared across instances.
- **Activity logging:** All API routes call `logActivity()` after successful mutations, writing human-readable entries to the `activity_log` table. The `getItemById` and `getMemberById` helpers look up names before logging (avoids UUIDs in the log). The `actorName` variable is resolved during auth and reused for all log entries in a handler.
- **Item search/filter:** The `ItemFilter` component provides text search + type filtering on party pool tabs. The `filterItems()` helper is a pure function that filters by name/description match and type. Computed once per render via `const filteredPool = filterItems(...)` to avoid double computation.
- **Responsive 8-bit typography:** CSS utility classes `text-8bit-lg`, `text-8bit-md`, `text-8bit-sm`, `text-8bit-xs` in `globals.css` scale up on mobile (`@media max-width: 640px`) for better readability. Used instead of raw `text-[10px]` / `text-[8px]` classes throughout components.

### Item Quantity Handling
- Party pool items are always quantity=1 (split into individual records when added by DM or offered by player).
- Personal inventory items can have quantity > 1 (stacks).

### Dice Notation
- Descriptions may contain dice notation like `1d20+5` or `2d6`.
- `ItemCard.tsx` parses these with regex and makes them clickable, opening `DiceRoller.tsx` modal.
- URLs in descriptions are also auto-linked.

---

## Environment & Deployment

- **Local dev:** `pnpm dev` — requires Vercel Postgres connection.
- **Required env vars:** `POSTGRES_URL` (validated at startup — app throws if missing). See `.env.example` for template. `CRON_SECRET` is required for the cleanup cron endpoint (set in Vercel Environment Variables). `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` are auto-configured when linked to a Vercel project.
- **Build:** `pnpm build` / `pnpm start`
- **Lint:** `pnpm lint` (Next.js ESLint)
- **Test:** `pnpm test` (Vitest)
- **Deploy:** Designed for Vercel (uses `@vercel/postgres`).

---

## Known Discrepancies

1. **README updated:** README now correctly documents Vercel Postgres + Next.js 15 + pnpm + `.env.example`. Previously it described SQLite/Drizzle/better-sqlite3 + Next.js 14.
2. **`dm_role` column:** Added via `ALTER TABLE IF NOT EXISTS` in migration, not in original `CREATE TABLE` — indicates iterative schema development.
3. **`offerItemSplit` function:** Wrapped in a database transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) using `sql.connect()` for a dedicated client. The `qty === 1` branch uses `client.sql` directly instead of calling `offerItem()` because `offerItem()` uses the global `sql` pool and would escape the transaction.
4. **`updateItem` function:** Builds dynamic SQL SET clauses with positional parameters — the only place where `sql.query()` is used for updates.
5. **Rate limiter on serverless:** The in-memory rate limiter (`lib/rateLimit.ts`) uses a `Map` that persists across warm starts within the same Vercel lambda container, but resets on cold starts and is not shared across instances. It provides per-instance protection. For production-grade rate limiting across instances, use Upstash Redis or similar.
6. **`after()` for background DB writes:** `touchSessionAccess()` is wrapped in Next.js `after()` (from `next/server`) instead of floating promises with `.catch()`. This ensures the DB write completes even after the response is sent in Vercel's serverless environment.
7. **Player `party_adjust` removed:** The `party_adjust` gold action was available to both DM and player tokens, allowing players to mint infinite party gold. It is now DM-only — players must use `transfer_to_pool`/`transfer_from_pool` which deduct from their own balance.

---

## Type Definitions (`types/index.ts`)

```typescript
ItemType = 'Weapon' | 'Armor' | 'Consumable' | 'Other'

Item { id, sessionId, ownerId, name, description, type, private, offeredToParty, quantity, createdAt }
Member { id, sessionId, name, token, publicGold, privateGold, createdAt }
Session { id, dmToken, name, currencyType, dmRole, partyGold, lastAccessedAt, createdAt }
CreateSessionPayload { sessionName, currencyType, dmRole, memberNames }
CreateSessionResponse { session, dmUrl, memberLinks[] }
ActivityEntry { id, sessionId, memberId, actorName, action, details, createdAt }

SavedSession { sessionId, sessionName, dmRole, dmToken, savedAt }  ← lib/savedSessions.ts (localStorage)
```

---

## Dependencies

### Runtime
- `@vercel/postgres` — database
- `@radix-ui/react-*` — headless UI primitives (alert-dialog, dialog, select, slot, tabs)
- `class-variance-authority` — component variant utility
- `clsx` + `tailwind-merge` — class merging
- `lucide-react` — icon library
- `react-icons` — additional icons (game-themed: dice, weapons, potions, coins)
- `tailwindcss-animate` — animation utilities

### Dev
- TypeScript 5, Tailwind CSS 3, PostCSS, Autoprefixer
- `vercel` CLI
- Vitest + @testing-library/react + jsdom — test framework (32 tests across 5 files)
- `pnpm test` to run, `pnpm test:watch` for watch mode
- **Session cleanup:** Vercel Cron hits `/api/cleanup` daily at 3 AM UTC (configured in `vercel.json`). Sessions are cascade-deleted if: (1) never used within 31 days of creation (no items, no activity beyond creation, no members added after creation), OR (2) not accessed in 366 days. The `touchSessionAccess()` query updates `last_accessed_at` on initial page load and every dashboard refresh.
