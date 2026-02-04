#!/usr/bin/env npx tsx
/**
 * Database Seed Script
 * 
 * Run this script to populate the database with initial reference data.
 * 
 * Usage:
 *   npm run db:seed
 *   
 * Or directly:
 *   npx tsx src/db/run-seed.ts
 */

import { db, closeDatabase } from './index';
import { seedDatabase } from './seed';

async function main() {
  console.log('Starting database seed...\n');
  
  try {
    await seedDatabase(db);
    console.log('\n✓ Database seeded successfully!');
  } catch (error) {
    console.error('\n✗ Error seeding database:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

main();

