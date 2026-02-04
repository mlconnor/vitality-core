/**
 * Database Connection and Setup
 * 
 * This module provides the database connection using Drizzle ORM with SQLite.
 * 
 * Usage:
 *   import { db } from './db';
 *   import { recipes } from './db/schema';
 *   
 *   const allRecipes = await db.select().from(recipes);
 */

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// Database file path - can be configured via environment variable
const DB_PATH = process.env.DATABASE_URL || './food_service.db';

// Create the SQLite database connection
const sqlite = new Database(DB_PATH);

// Enable foreign key support (important for SQLite)
sqlite.pragma('foreign_keys = ON');

// Create the Drizzle ORM instance with schema for type inference
export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, { schema });

// Export the raw sqlite connection for advanced use cases (migrations, raw SQL)
export { sqlite };

// Re-export schema for convenience
export * from './schema';

// Re-export seed functions
export { seedDatabase } from './seed';

/**
 * Close the database connection.
 * Call this during graceful shutdown.
 */
export function closeDatabase(): void {
  sqlite.close();
}

/**
 * Check if the database is connected and accessible.
 */
export function isDatabaseReady(): boolean {
  try {
    sqlite.pragma('quick_check');
    return true;
  } catch {
    return false;
  }
}

