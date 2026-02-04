/**
 * Test Database Setup
 * 
 * Creates an in-memory SQLite database for testing by copying
 * the schema from the production database.
 * 
 * Usage:
 *   import { getTestDb, resetTestDatabase } from './test-db';
 *   const db = getTestDb();
 */

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from '../../db/schema/index.js';
import { seedDatabase } from '../../db/seed.js';
import * as path from 'path';
import * as fs from 'fs';

// In-memory database instance
let sqlite: Database.Database | null = null;
let db: BetterSQLite3Database<typeof schema> | null = null;

// Path to production database (for schema)
const PROD_DB_PATH = path.resolve(process.cwd(), 'food_service.db');

/**
 * Get or create the test database
 */
export function getTestDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    // Create in-memory database
    sqlite = new Database(':memory:');
    
    // Disable foreign keys during setup (re-enabled after seeding)
    sqlite.exec('PRAGMA foreign_keys = OFF');
    
    // Copy schema from production database
    copySchemaFromProdDb(sqlite);
    
    // Create Drizzle instance
    db = drizzle(sqlite, { schema });
  }
  return db;
}

/**
 * Copy schema (table definitions) from production database
 */
function copySchemaFromProdDb(targetDb: Database.Database): void {
  if (!fs.existsSync(PROD_DB_PATH)) {
    throw new Error(
      `Production database not found at ${PROD_DB_PATH}. ` +
      `Run 'npm run db:push' first to create it.`
    );
  }

  // Open production database
  const prodDb = new Database(PROD_DB_PATH, { readonly: true });
  
  try {
    // Get all CREATE TABLE and CREATE INDEX statements
    const schemaStatements = prodDb.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE sql IS NOT NULL 
      AND type IN ('table', 'index')
      AND name NOT LIKE 'sqlite_%'
      ORDER BY type DESC, name
    `).all() as { sql: string }[];

    // Execute each statement in the test database
    for (const { sql: statement } of schemaStatements) {
      try {
        targetDb.exec(statement);
      } catch (err) {
        // Ignore "already exists" errors (indexes might reference tables)
        if (!(err instanceof Error && err.message.includes('already exists'))) {
          console.warn(`Warning: Could not execute: ${statement.substring(0, 50)}...`);
        }
      }
    }
  } finally {
    prodDb.close();
  }
}

/**
 * Get the raw SQLite connection (for raw SQL if needed)
 */
export function getTestSqlite(): Database.Database {
  if (!sqlite) {
    getTestDb(); // Initialize if needed
  }
  return sqlite!;
}

/**
 * Reset database to clean state with fresh test data
 */
export async function resetTestDatabase(): Promise<void> {
  // Close existing connection and create fresh one
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
  
  // Get fresh database (FK disabled by default)
  const testDb = getTestDb();
  const rawSqlite = getTestSqlite();
  
  // Seed test-specific data FIRST (tenants, sites)
  // These are needed for FK constraints in reference data
  await seedTestData(testDb);
  
  // Seed reference data (diet types, allergens, etc.)
  try {
    await seedDatabase(testDb as any);
  } catch (err) {
    // Ignore duplicate key errors
    if (!(err instanceof Error && err.message.includes('UNIQUE constraint'))) {
      throw err;
    }
  }
  
  // Re-enable foreign keys now that all data is seeded
  rawSqlite.exec('PRAGMA foreign_keys = ON');
}

/**
 * Close database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

/**
 * Seed test-specific data (tenants, sites, employees)
 * Note: Foreign keys should be disabled before calling this
 */
async function seedTestData(db: BetterSQLite3Database<typeof schema>): Promise<void> {
  const rawSqlite = getTestSqlite();
  
  // Test tenant
  rawSqlite.exec(`
    INSERT OR IGNORE INTO tenants (tenant_id, tenant_name, tenant_code, status, subscription_tier, created_date)
    VALUES ('TEN-TEST001', 'Test Healthcare', 'TEST', 'Active', 'Standard', '2024-01-01')
  `);

  // Second tenant (for isolation testing)
  rawSqlite.exec(`
    INSERT OR IGNORE INTO tenants (tenant_id, tenant_name, tenant_code, status, subscription_tier, created_date)
    VALUES ('TEN-OTHER', 'Other Org', 'OTHER', 'Active', 'Standard', '2024-01-01')
  `);

  // Test site for main tenant
  rawSqlite.exec(`
    INSERT OR IGNORE INTO sites (
      site_id, tenant_id, site_name, site_type, status, address, has_production_kitchen
    ) VALUES (
      'SITE-TEST001', 'TEN-TEST001', 'Main Kitchen', 'Production Kitchen', 'Active',
      '123 Test St', 1
    )
  `);

  // Site for other tenant (for isolation testing)
  rawSqlite.exec(`
    INSERT OR IGNORE INTO sites (
      site_id, tenant_id, site_name, site_type, status, address, has_production_kitchen
    ) VALUES (
      'SITE-OTHER', 'TEN-OTHER', 'Other Kitchen', 'Production Kitchen', 'Active',
      '456 Other St', 1
    )
  `);

  // Test employee
  rawSqlite.exec(`
    INSERT OR IGNORE INTO employees (
      employee_id, tenant_id, first_name, last_name, primary_site_id, 
      job_title, hire_date, status
    ) VALUES (
      'EMP-TEST001', 'TEN-TEST001', 'Test', 'User', 'SITE-TEST001',
      'Manager', '2024-01-01', 'Active'
    )
  `);
}

/**
 * Clear all user-created test data (keeps reference data and tenants/sites)
 * Call this in beforeEach to isolate tests
 */
export function clearTestData(): void {
  const rawSqlite = getTestSqlite();
  
  // Disable foreign keys temporarily
  rawSqlite.exec('PRAGMA foreign_keys = OFF');
  
  try {
    // Clear user-created data tables (order matters due to FK)
    // Only clear tables that actually exist
    rawSqlite.exec('DELETE FROM diet_assignments');
    rawSqlite.exec('DELETE FROM diners');
    rawSqlite.exec('DELETE FROM vendors');
    rawSqlite.exec('DELETE FROM po_line_items');
    rawSqlite.exec('DELETE FROM purchase_orders');
    rawSqlite.exec('DELETE FROM product_specifications');
    rawSqlite.exec('DELETE FROM meal_orders');
    rawSqlite.exec('DELETE FROM inventory');
    rawSqlite.exec('DELETE FROM receiving');
    rawSqlite.exec('DELETE FROM storeroom_issues');
  } finally {
    rawSqlite.exec('PRAGMA foreign_keys = ON');
  }
}

// Export test data IDs for easy reference in tests
export const TEST_DATA = {
  tenantId: 'TEN-TEST001',
  otherTenantId: 'TEN-OTHER',
  siteId: 'SITE-TEST001',
  otherSiteId: 'SITE-OTHER',
  employeeId: 'EMP-TEST001',
  dietTypes: {
    regular: 'DIET-REG',
    diabetic: 'DIET-DIAB',
    renal: 'DIET-RENAL',
    cardiac: 'DIET-CARDIAC',
    lowSodium: 'DIET-LOWNA',
    vegan: 'DIET-VEGAN',
    glutenFree: 'DIET-GF',
  },
  allergens: {
    milk: 'ALG-MILK',
    eggs: 'ALG-EGG',
    peanuts: 'ALG-PEANUTS',
    treeNuts: 'ALG-TREENUTS',
    wheat: 'ALG-WHEAT',
  },
} as const;
