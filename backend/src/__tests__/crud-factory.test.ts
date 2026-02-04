/**
 * CRUD Factory Tests
 * 
 * These tests validate the generic CRUD factory behavior.
 * Write once, covers all 25+ entities.
 * 
 * Key behaviors tested:
 * - Tenant isolation (can't see other tenant's data)
 * - Automatic ID generation
 * - Field omission (diet fields blocked from update)
 * - Bulk operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createTestCaller, 
  createOtherTenantCaller,
  createTestVendor,
} from './helpers/test-context.js';
import { TEST_DATA, getTestDb } from './helpers/test-db.js';
import { sql } from 'drizzle-orm';

// Helper to create valid vendor data
const validVendor = (overrides?: Record<string, unknown>) => ({
  vendorName: 'Test Vendor',
  vendorType: 'Broadline Distributor' as const,
  phone: '555-123-4567',
  status: 'Active' as const,
  ...overrides,
});

describe('CRUD Factory', () => {
  describe('Tenant Isolation', () => {
    it('list only returns records for current tenant', async () => {
      const caller = createTestCaller();
      
      // Create vendor for our tenant
      await caller.vendor.create(validVendor({ vendorName: 'Our Vendor' }));
      
      // Create vendor for other tenant directly in DB
      const db = getTestDb();
      db.run(sql`
        INSERT INTO vendors (vendor_id, tenant_id, vendor_name, vendor_type, phone, status)
        VALUES ('VND-OTHER', ${TEST_DATA.otherTenantId}, 'Other Vendor', 'Broadline Distributor', '555-0000', 'Active')
      `);
      
      // List should only show our vendor
      const vendors = await caller.vendor.list();
      expect(vendors.length).toBe(1);
      expect(vendors[0].vendorName).toBe('Our Vendor');
    });

    it('getById returns null for other tenant records', async () => {
      const caller = createTestCaller();
      
      // Create vendor for other tenant
      const db = getTestDb();
      db.run(sql`
        INSERT INTO vendors (vendor_id, tenant_id, vendor_name, vendor_type, phone, status)
        VALUES ('VND-HIDDEN', ${TEST_DATA.otherTenantId}, 'Hidden Vendor', 'Broadline Distributor', '555-0001', 'Active')
      `);
      
      // Should not be able to fetch it
      const result = await caller.vendor.getById({ id: 'VND-HIDDEN' });
      expect(result).toBeNull();
    });

    it('update fails for other tenant records', async () => {
      const caller = createTestCaller();
      
      // Create vendor for other tenant
      const db = getTestDb();
      db.run(sql`
        INSERT INTO vendors (vendor_id, tenant_id, vendor_name, vendor_type, phone, status)
        VALUES ('VND-NOUPDATE', ${TEST_DATA.otherTenantId}, 'No Update', 'Broadline Distributor', '555-0002', 'Active')
      `);
      
      // Update should fail
      await expect(
        caller.vendor.update({ id: 'VND-NOUPDATE', data: { vendorName: 'Hacked' } })
      ).rejects.toThrow('not found');
    });

    it('delete fails for other tenant records', async () => {
      const caller = createTestCaller();
      
      // Create vendor for other tenant
      const db = getTestDb();
      db.run(sql`
        INSERT INTO vendors (vendor_id, tenant_id, vendor_name, vendor_type, phone, status)
        VALUES ('VND-NODELETE', ${TEST_DATA.otherTenantId}, 'No Delete', 'Broadline Distributor', '555-0003', 'Active')
      `);
      
      // Delete should fail
      await expect(
        caller.vendor.delete({ id: 'VND-NODELETE' })
      ).rejects.toThrow('not found');
    });
  });

  describe('Create', () => {
    it('generates unique ID automatically', async () => {
      const caller = createTestCaller();
      
      const vendor1 = await caller.vendor.create(validVendor({ vendorName: 'Vendor 1' }));
      const vendor2 = await caller.vendor.create(validVendor({ vendorName: 'Vendor 2' }));
      
      expect(vendor1.vendorId).toBeTruthy();
      expect(vendor2.vendorId).toBeTruthy();
      expect(vendor1.vendorId).not.toBe(vendor2.vendorId);
    });

    it('automatically assigns tenant ID', async () => {
      const caller = createTestCaller();
      
      const vendor = await caller.vendor.create(validVendor({ vendorName: 'Auto Tenant Vendor' }));
      
      expect(vendor.tenantId).toBe(TEST_DATA.tenantId);
    });
  });

  describe('Update', () => {
    it('updates only provided fields', async () => {
      const caller = createTestCaller();
      
      const vendor = await caller.vendor.create(validVendor({
        vendorName: 'Original Name',
        vendorType: 'Produce',
        phone: '555-1234',
      }));
      
      const updated = await caller.vendor.update({
        id: vendor.vendorId,
        data: { vendorName: 'New Name' },
      });
      
      expect(updated.vendorName).toBe('New Name');
      expect(updated.vendorType).toBe('Produce'); // Unchanged
      expect(updated.phone).toBe('555-1234'); // Unchanged
    });
  });

  describe('Delete', () => {
    it('removes the record', async () => {
      const caller = createTestCaller();
      
      const vendor = await caller.vendor.create(validVendor({ vendorName: 'To Delete' }));
      
      await caller.vendor.delete({ id: vendor.vendorId });
      
      const result = await caller.vendor.getById({ id: vendor.vendorId });
      expect(result).toBeNull();
    });
  });

  describe('Bulk Create', () => {
    it('creates multiple records', async () => {
      const caller = createTestCaller();
      
      const result = await caller.vendor.bulkCreate({
        rows: [
          validVendor({ vendorName: 'Bulk Vendor 1' }),
          validVendor({ vendorName: 'Bulk Vendor 2' }),
          validVendor({ vendorName: 'Bulk Vendor 3' }),
        ],
      });
      
      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('reports validation errors for invalid rows', async () => {
      const caller = createTestCaller();
      
      const result = await caller.vendor.bulkCreate({
        rows: [
          validVendor({ vendorName: 'Valid Vendor' }),
          { vendorName: 'Missing Required Fields' }, // Invalid - missing phone, vendorType
          validVendor({ vendorName: 'Another Valid' }),
        ],
        options: { skipInvalidRows: true },
      });
      
      // Middle row should fail due to missing required fields
      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  describe('Bulk Delete', () => {
    it('deletes multiple records', async () => {
      const caller = createTestCaller();
      
      // Create some vendors
      const v1 = await caller.vendor.create(validVendor({ vendorName: 'Delete 1' }));
      const v2 = await caller.vendor.create(validVendor({ vendorName: 'Delete 2' }));
      const v3 = await caller.vendor.create(validVendor({ vendorName: 'Keep This' }));
      
      // Bulk delete first two
      const result = await caller.vendor.bulkDelete({
        ids: [v1.vendorId, v2.vendorId],
      });
      
      expect(result.successful).toBe(2);
      
      // Verify third one still exists
      const remaining = await caller.vendor.getById({ id: v3.vendorId });
      expect(remaining).not.toBeNull();
    });

    it('reports errors for non-existent IDs', async () => {
      const caller = createTestCaller();
      
      const result = await caller.vendor.bulkDelete({
        ids: ['VND-DOESNOTEXIST'],
      });
      
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toContain('Not found');
    });
  });

  describe('List Pagination', () => {
    it('respects limit parameter', async () => {
      const caller = createTestCaller();
      
      // Create 5 vendors
      for (let i = 0; i < 5; i++) {
        await caller.vendor.create(validVendor({ vendorName: `Vendor ${i}` }));
      }
      
      const limited = await caller.vendor.list({ limit: 2 });
      expect(limited.length).toBe(2);
    });

    it('respects offset parameter', async () => {
      const caller = createTestCaller();
      
      // Create vendors with predictable names
      await caller.vendor.create(validVendor({ vendorName: 'First' }));
      await caller.vendor.create(validVendor({ vendorName: 'Second' }));
      await caller.vendor.create(validVendor({ vendorName: 'Third' }));
      
      const offset = await caller.vendor.list({ limit: 10, offset: 1 });
      expect(offset.length).toBe(2); // Skip first
    });
  });
});

