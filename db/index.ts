import { sql } from '@vercel/postgres'

export { sql }
// Export the pool connector for transactions (BEGIN/COMMIT/ROLLBACK)
export const connect = sql.connect.bind(sql)

const isVercelRuntime = process.env.VERCEL === '1'
const localUrl = process.env.LOCAL_POSTGRES_URL || process.env.POSTGRES_URL_LOCAL

// Prefer a local database when running outside Vercel.
// This keeps dev/test traffic off the production Neon database.
if (!isVercelRuntime && localUrl) {
  process.env.POSTGRES_URL = localUrl
}

if (process.env.NODE_ENV !== 'production') {
  const dbSource = !isVercelRuntime && localUrl
    ? 'LOCAL_POSTGRES_URL'
    : 'POSTGRES_URL'
  console.info(`[db] Using ${dbSource} (${isVercelRuntime ? 'vercel runtime' : 'local runtime'})`)
}

// Validate that the selected database connection string is configured
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'Missing database URL. ' +
    'Set LOCAL_POSTGRES_URL (or POSTGRES_URL_LOCAL) for local/dev runs, ' +
    'or POSTGRES_URL for Vercel/production.'
  )
}

export async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      dm_token TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      currency_type TEXT NOT NULL DEFAULT 'dnd',
      party_gold INTEGER NOT NULL DEFAULT 0,
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
  // Add columns that may be missing from older table versions
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS currency_type TEXT NOT NULL DEFAULT 'dnd'`
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS party_gold INTEGER NOT NULL DEFAULT 0`
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dm_role TEXT NOT NULL DEFAULT 'Dungeon Master'`

  await sql`CREATE INDEX IF NOT EXISTS idx_members_session ON members(session_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_members_token ON members(token)`
  await sql`CREATE INDEX IF NOT EXISTS idx_members_session_created ON members(session_id, created_at ASC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_items_session ON items(session_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_items_session_created ON items(session_id, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_items_owner_private_created ON items(owner_id, private, created_at DESC)`
  await sql`
    CREATE INDEX IF NOT EXISTS idx_items_pool_visible_created
    ON items(session_id, created_at DESC)
    WHERE owner_id IS NULL AND private = FALSE
  `
  await sql`
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_activity_session ON activity_log(session_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(session_id, created_at DESC)`

  // Track when sessions are last accessed (for cleanup cron)
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ`
}
