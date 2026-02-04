/**
 * Test Context Factory
 * 
 * Creates mock tRPC contexts for testing services and routers.
 * 
 * Usage:
 *   import { createTestContext, createTestCaller } from './test-context';
 *   
 *   // For service tests
 *   const ctx = createTestContext();
 *   const service = new DinerService(ctx);
 *   
 *   // For router tests
 *   const caller = createTestCaller();
 *   const result = await caller.diner.list();
 */

import { getTestDb, TEST_DATA } from './test-db.js';
import type { ProtectedContext } from '../../trpc/index.js';
import { appRouter } from '../../trpc/router.js';

/**
 * Create a mock protected context for testing
 * 
 * @param overrides - Override default values
 */
export function createTestContext(overrides?: {
  tenantId?: string;
  userId?: string;
  email?: string;
  role?: string;
}): ProtectedContext {
  const db = getTestDb();
  
  return {
    db,
    user: {
      userId: overrides?.userId ?? TEST_DATA.employeeId,
      email: overrides?.email ?? 'test@example.com',
      role: (overrides?.role ?? 'admin') as 'admin' | 'manager' | 'staff' | 'viewer',
      tenantId: overrides?.tenantId ?? TEST_DATA.tenantId,
    },
    tenant: {
      tenantId: overrides?.tenantId ?? TEST_DATA.tenantId,
      tenantName: 'Test Healthcare',
      tenantCode: 'TEST',
      status: 'Active',
      subscriptionTier: 'Standard',
      contactEmail: null,
      contactPhone: null,
      address: null,
      settings: null,
      createdDate: new Date().toISOString(),
      createdBy: null,
    },
  };
}

/**
 * Create a context for a different tenant (for isolation tests)
 */
export function createOtherTenantContext(): ProtectedContext {
  return createTestContext({
    tenantId: TEST_DATA.otherTenantId,
    email: 'other@example.com',
  });
}

/**
 * Create a tRPC caller for testing routers directly
 * 
 * This lets you call router procedures without HTTP:
 *   const caller = createTestCaller();
 *   const diners = await caller.diner.list({ limit: 10 });
 */
export function createTestCaller(overrides?: Parameters<typeof createTestContext>[0]) {
  const ctx = createTestContext(overrides);
  return appRouter.createCaller(ctx);
}

/**
 * Create a caller for a different tenant (for isolation tests)
 */
export function createOtherTenantCaller() {
  return createTestCaller({ tenantId: TEST_DATA.otherTenantId });
}

/**
 * Helper to create a test diner directly in DB
 * Returns the diner ID for use in tests
 */
export async function createTestDiner(overrides?: {
  dinerId?: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string;
  siteId?: string;
  dietTypeId?: string;
}): Promise<string> {
  const db = getTestDb();
  const dinerId = overrides?.dinerId ?? `DNR-TEST-${Date.now()}`;
  
  db.run({
    sql: `
      INSERT INTO diners (
        diner_id, tenant_id, first_name, last_name, site_id,
        diner_type, status, primary_diet_type_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      dinerId,
      overrides?.tenantId ?? TEST_DATA.tenantId,
      overrides?.firstName ?? 'Test',
      overrides?.lastName ?? 'Diner',
      overrides?.siteId ?? TEST_DATA.siteId,
      'Patient',
      'Active',
      overrides?.dietTypeId ?? TEST_DATA.dietTypes.regular,
    ],
  } as any);
  
  return dinerId;
}

/**
 * Helper to create a test vendor directly in DB
 */
export async function createTestVendor(overrides?: {
  vendorId?: string;
  vendorName?: string;
  tenantId?: string;
}): Promise<string> {
  const db = getTestDb();
  const vendorId = overrides?.vendorId ?? `VND-TEST-${Date.now()}`;
  
  db.run({
    sql: `
      INSERT INTO vendors (vendor_id, tenant_id, vendor_name, status)
      VALUES (?, ?, ?, ?)
    `,
    args: [
      vendorId,
      overrides?.tenantId ?? TEST_DATA.tenantId,
      overrides?.vendorName ?? 'Test Vendor',
      'Active',
    ],
  } as any);
  
  return vendorId;
}

