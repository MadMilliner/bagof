import { sql } from '@vercel/postgres'

export { sql }

export async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      dm_token TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      public_gold INTEGER NOT NULL DEFAULT 0,
      private_gold INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      owner_id TEXT REFERENCES members(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'Other'
        CHECK(type IN ('Weapon','Armor','Consumable','Other')),
      private BOOLEAN NOT NULL DEFAULT FALSE,
      offered_to_party BOOLEAN NOT NULL DEFAULT FALSE,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_members_session ON members(session_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_members_token ON members(token)`
  await sql`CREATE INDEX IF NOT EXISTS idx_items_session ON items(session_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_dm_token ON sessions(dm_token)`
}
