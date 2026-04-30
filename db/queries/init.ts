import { migrate } from '../index'

declare global {
  // eslint-disable-next-line no-var
  var __bagofLoggedBuildMigrateSkip: boolean | undefined
}

// Run migrations on first import (creates tables if they don't exist)
try {
  await migrate()
} catch (err) {
  // Allow `next build` to finish in environments without DB access.
  // Runtime queries will still require a reachable database.
  if (process.env.npm_lifecycle_event !== 'build') {
    throw err
  }
  if (!globalThis.__bagofLoggedBuildMigrateSkip) {
    console.warn('[db] Skipping migrate() during build:', err)
    globalThis.__bagofLoggedBuildMigrateSkip = true
  }
}
