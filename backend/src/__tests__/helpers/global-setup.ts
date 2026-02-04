/**
 * Global Setup for Vitest
 * 
 * Runs ONCE before all test files.
 * Use for expensive one-time setup like compiling schemas.
 */

export default async function globalSetup() {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Suppress console logs during tests (optional)
  // process.env.LOG_LEVEL = 'error';
  
  console.log('\n🧪 Starting test suite...\n');
}

export async function teardown() {
  console.log('\n✅ Test suite complete.\n');
}

