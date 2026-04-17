# 👜 Bag of

A shared party loot manager for TTRPGs — styled with [8bitcn/ui](https://8bitcn.com).

No accounts. One link per person.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Vercel Postgres (`@vercel/postgres`) — raw SQL |
| UI | 8bitcn/ui (shadcn-compatible 8-bit components) |
| Font | Press Start 2P (Google Fonts) |
| Styling | Tailwind CSS v3 |
| Package Manager | pnpm |

Tables are auto-created on first request — no migration step needed.

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url> bag-of
cd bag-of
pnpm install
```

### 2. Configure environment

Create `.env.local` with your Vercel Postgres connection string:

```bash
cp .env.example .env.local
# Edit .env.local with your POSTGRES_URL
```

> **Tip:** If you've linked the project to Vercel (`vercel link`), the CLI can pull these values automatically with `vercel env pull .env.local`.

### 3. Run

```bash
pnpm dev
```

The database tables are created automatically on first run.

### 4. Test

```bash
pnpm test
```

---

## How it works

1. **DM visits `/`** — enters a campaign name and party member names
2. **Links are generated** — one DM link, one per player. No accounts, no passwords.
3. **DM link** (`/dm/:token`) — add loot to party pool, split gold, view all inventories, activity log
4. **Player links** (`/p/:token`) — manage personal inventory, claim from party pool, transfer gold

---

## File structure

```
/app
  /api
    /session/route.ts        ← POST: create session + members
    /items/route.ts          ← POST/PATCH/DELETE: item management
    /gold/route.ts           ← PATCH: gold operations (split, give, adjust, transfer)
    /members/route.ts        ← POST: add member; PATCH: rename member
    /refresh/route.ts        ← GET: dashboard data refresh (polling)
    /activity/route.ts       ← GET: session activity log
  /dm/[token]/page.tsx       ← DM dashboard (server component → client)
  /p/[token]/page.tsx        ← Player dashboard (server component → client)
  page.tsx                   ← Session creation form (home page)
  globals.css                ← Tailwind + CSS variables (light/dark themes)
  layout.tsx                 ← Root layout: font, theme, footer
  not-found.tsx              ← 404 page


/components
  /ui/8bit/                  ← 8bitcn components (inlined, no CLI needed)
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
    ItemCard.tsx              ← Item display with actions (claim/offer/edit/drop)
    AddItemForm.tsx           ← Reusable item creation form
    ItemFilter.tsx            ← Search bar + type filter for item lists
  /gold/
    GoldPanel.tsx             ← Currency display + adjustment (shared by DM & player)
  CreateSessionForm.tsx       ← Two-step form: create → share links
  DMDashboard.tsx             ← DM view: party pool, members tab, gold tab, log tab
  PlayerDashboard.tsx         ← Player view: inventory, party bag, other members
  DiceRoller.tsx              ← Modal dice roller (parses NdN notation)
  ThemeProvider.tsx            ← Light/dark theme context + toggle

/db
  index.ts                    ← Vercel Postgres `sql` + `connect` exports + `migrate()` + env validation
  queries.ts                  ← All database helper functions (mappers + CRUD + activity log)

/lib
  utils.ts                    ← cn() helper (clsx + tailwind-merge)
  rateLimit.ts                ← In-memory rate limiter (IP-based, per-route limits)
  savedSessions.ts            ← localStorage persistence for DM session links

/types
  index.ts                    ← Shared TypeScript types: Item, Member, Session, etc.
```

---

## Deploying

The app is designed for [Vercel](https://vercel.com) with Vercel Postgres:

1. Push to GitHub
2. Import in Vercel
3. Add a Vercel Postgres store (Storage → Create → Postgres)
4. Deploy — env vars are auto-configured

For other platforms, you'll need a Postgres-compatible database and the `POSTGRES_URL` connection string env var.

---

## 8bitcn components

Components are inlined in `/components/ui/8bit/` so you don't need the shadcn CLI to install them. If you want to add more components from the library:

```bash
pnpm dlx shadcn@latest add @8bitcn/[component-name]
```

They'll land in the same folder and use the same `font-press-start` class and box-shadow conventions.
