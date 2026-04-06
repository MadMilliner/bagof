# 👜 Bag of

A shared party loot manager for TTRPGs — styled with [8bitcn/ui](https://8bitcn.com).

No accounts. No external database. One link per person.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| UI | 8bitcn/ui (shadcn-compatible 8-bit components) |
| Font | Press Start 2P (Google Fonts) |
| Styling | Tailwind CSS v3 |

The SQLite database is a single file (`bag-of.db`) that lives in your project root. No Postgres, no Supabase, no Docker — just run it.

---

## Setup

### 1. Bootstrap a Next.js project

```bash
npx create-next-app@latest bag-of --typescript --tailwind --app
cd bag-of
```

### 2. Install dependencies

```bash
npm install better-sqlite3 drizzle-orm \
  @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-tabs \
  class-variance-authority clsx lucide-react tailwind-merge

npm install -D @types/better-sqlite3 drizzle-kit
```

### 3. Copy scaffold files

Drop all files from this scaffold into your project root, preserving the folder structure.

### 4. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local if needed (defaults work for local dev)
```

### 5. Run

```bash
npm run dev
```

The SQLite database and all tables are created automatically on first run — no migration step needed.

---

## How it works

1. **DM visits `/session/create`** — enters a campaign name and party member names
2. **Links are generated** — one DM link, one per player. No accounts, no passwords.
3. **DM link** (`/dm/:token`) — add loot to party pool, split gold, view all inventories
4. **Player links** (`/p/:token`) — manage personal inventory, claim from party pool

---

## File structure

```
/app
  /session/create/page.tsx   ← Session creation form
  /dm/[token]/page.tsx       ← DM dashboard (server component)
  /p/[token]/page.tsx        ← Player dashboard (server component)
  /api/session/route.ts      ← POST: create session
  /api/items/route.ts        ← POST/PATCH/DELETE: item management
  /api/gold/route.ts         ← PATCH: gold operations
  globals.css                ← Tailwind + CSS variables

/components
  /ui/8bit/                  ← 8bitcn components (inlined, no CLI needed)
    button.tsx
    card.tsx
    badge.tsx
    input.tsx
    select.tsx
    tabs.tsx
    textarea.tsx
  /inventory/
    ItemCard.tsx
    AddItemForm.tsx
  /gold/
    GoldPanel.tsx
  CreateSessionForm.tsx
  PlayerDashboard.tsx
  DMDashboard.tsx

/db
  schema.ts                  ← Drizzle schema (sessions, members, items)
  index.ts                   ← SQLite connection + auto-migrate
  queries.ts                 ← All DB helper functions

/lib
  utils.ts                   ← cn() helper

/types
  index.ts                   ← Shared TypeScript types
```

---

## Deploying

The app is stateless except for the SQLite file. To deploy:

- **Fly.io / Railway**: Mount a persistent volume and set `DB_PATH=/data/bag-of.db`
- **Vercel**: SQLite won't persist across serverless cold starts — use [Turso](https://turso.tech) (libSQL, drop-in SQLite replacement) instead
- **VPS / self-hosted**: Just run `npm run build && npm start`, SQLite file persists naturally

---

## 8bitcn components

Components are inlined in `/components/ui/8bit/` so you don't need the shadcn CLI to install them. If you want to add more components from the library:

```bash
pnpm dlx shadcn@latest add @8bitcn/[component-name]
```

They'll land in the same folder and use the same `font-press-start` class and box-shadow conventions.
