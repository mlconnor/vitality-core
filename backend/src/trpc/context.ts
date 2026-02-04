/**
 * tRPC Context
 * 
 * The context is created for each request and contains:
 * - Database connection
 * - Authenticated user info (from JWT)
 * - Tenant info (derived from user)
 * 
 * This context is automatically available in all tRPC procedures,
 * so services don't need to manually pass tenant IDs around.
 */

import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { tenants } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * User payload extracted from JWT
 */
export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
}

/**
 * Tenant info loaded from database
 */
export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  status: string;
}

/**
 * The context available to all tRPC procedures
 */
export interface Context {
  db: typeof db;
  user: AuthUser | null;
  tenant: TenantInfo | null;
}

/**
 * Extract and verify JWT from Authorization header
 */
function extractUserFromToken(authHeader: string | undefined): AuthUser | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    // Invalid or expired token
    return null;
  }
}

/**
 * Load tenant info from database
 */
async function loadTenant(tenantId: string): Promise<TenantInfo | null> {
  const result = await db
    .select({
      tenantId: tenants.tenantId,
      tenantName: tenants.tenantName,
      tenantCode: tenants.tenantCode,
      status: tenants.status,
    })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Create context for each tRPC request
 * 
 * This is called for every incoming request. It:
 * 1. Extracts user info from JWT (if present)
 * 2. Loads tenant info from database (if user is authenticated)
 * 3. Returns context that's available to all procedures
 */
export async function createContext({ req }: CreateExpressContextOptions): Promise<Context> {
  const user = extractUserFromToken(req.headers.authorization);
  
  let tenant: TenantInfo | null = null;
  if (user?.tenantId) {
    tenant = await loadTenant(user.tenantId);
  }

  return {
    db,
    user,
    tenant,
  };
}

export type CreateContext = typeof createContext;

// Alias for service layer usage
export type TRPCContext = Context & {
  user: AuthUser;  // Services require authenticated user
};

