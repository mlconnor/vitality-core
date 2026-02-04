/**
 * Per-File Setup for Vitest
 * 
 * Runs before each test FILE (not each test).
 * Use for resetting state between test files.
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { resetTestDatabase, closeTestDatabase, clearTestData } from './test-db.js';

// Reset database before each test file
beforeAll(async () => {
  console.log('\n🧪 Starting test suite...\n');
  await resetTestDatabase();
});

// Clear user data before each test for isolation
beforeEach(() => {
  clearTestData();
});

// Close database connection after all tests in file
afterAll(async () => {
  await closeTestDatabase();
});

