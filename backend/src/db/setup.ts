#!/usr/bin/env npx tsx
/**
 * Database Setup Script
 * 
 * Creates the database, applies schema, and seeds initial data.
 * Run this once when setting up a new environment.
 * 
 * Usage:
 *   npm run db:setup
 *   
 * Or directly:
 *   npx tsx src/db/setup.ts
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { seedDatabase } from './seed';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.DATABASE_URL || './food_service.db';
const MIGRATIONS_PATH = './drizzle';

async function setup() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Food Service Database Setup               ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Check if database already exists
  const dbExists = fs.existsSync(DB_PATH);
  if (dbExists) {
    console.log(`⚠ Database already exists at: ${DB_PATH}`);
    console.log('  To start fresh, delete the file and run again.\n');
  } else {
    console.log(`✓ Creating new database at: ${DB_PATH}\n`);
  }

  // Create/connect to database
  const sqlite = new Database(DB_PATH);
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  
  const db = drizzle(sqlite, { schema });

  // Check if migrations folder exists
  const migrationsExist = fs.existsSync(MIGRATIONS_PATH) && 
    fs.readdirSync(MIGRATIONS_PATH).some(f => f.endsWith('.sql'));

  if (migrationsExist) {
    // Use migrations if available
    console.log('📦 Applying migrations...');
    try {
      migrate(db, { migrationsFolder: MIGRATIONS_PATH });
      console.log('✓ Migrations applied successfully!\n');
    } catch (error) {
      console.error('✗ Migration error:', error);
      sqlite.close();
      process.exit(1);
    }
  } else {
    // Create tables directly from schema (dev mode)
    console.log('📦 Creating tables from schema (no migrations found)...');
    console.log('   Tip: Run "npm run db:generate" to create migration files.\n');
    
    // For direct table creation, we need to use drizzle-kit push
    // or generate the SQL. For now, we'll note this.
    console.log('⚠ Please run "npm run db:push" first to create tables,');
    console.log('  then run this script again to seed data.\n');
    
    // Check if tables exist by trying to query one
    try {
      const result = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='units_of_measure'").get();
      if (!result) {
        console.log('Tables not found. Run: npm run db:push');
        sqlite.close();
        process.exit(1);
      }
    } catch {
      console.log('Tables not found. Run: npm run db:push');
      sqlite.close();
      process.exit(1);
    }
  }

  // Seed reference data
  console.log('🌱 Seeding reference data...');
  try {
    await seedDatabase(db);
    console.log('\n✓ Reference data seeded successfully!');
  } catch (error: unknown) {
    // Ignore "UNIQUE constraint" errors (data already exists)
    if (error instanceof Error && error.message?.includes('UNIQUE constraint')) {
      console.log('\n⚠ Some seed data already exists (skipped duplicates)');
    } else {
      console.error('\n✗ Seeding error:', error);
      sqlite.close();
      process.exit(1);
    }
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  Setup Complete!                           ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`
Database: ${path.resolve(DB_PATH)}

Next steps:
  • npm run db:studio   - Open visual database browser
  • npm run dev         - Start the development server

Query example:
  import { db, recipes } from './db';
  const allRecipes = await db.select().from(recipes);
`);

  sqlite.close();
}

setup().catch(console.error);

