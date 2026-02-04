/**
 * Drizzle Kit Configuration
 * 
 * Used by drizzle-kit for:
 *   - Generating migrations: npx drizzle-kit generate
 *   - Pushing schema to DB: npx drizzle-kit push
 *   - Opening Drizzle Studio: npx drizzle-kit studio
 */

import type { Config } from 'drizzle-kit';

export default {
  // Schema location
  schema: './src/db/schema/index.ts',
  
  // Output directory for generated migrations
  out: './drizzle',
  
  // Database driver
  dialect: 'sqlite',
  
  // Database connection
  dbCredentials: {
    url: process.env.DATABASE_URL || './food_service.db',
  },
  
  // Verbose output during operations
  verbose: true,
  
  // Require confirmation for destructive operations
  strict: true,
} satisfies Config;

