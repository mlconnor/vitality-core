/**
 * Diner Service Tests
 * 
 * Tests the domain-specific business logic for diners:
 * - Create with initial diet assignment
 * - Diet change with audit trail
 * - Discharge workflow
 * 
 * These tests validate the custom service logic that goes
 * beyond what the generic CRUD factory provides.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DinerService, createDinerService } from '../../services/diner.service.js';
import { 
  createTestContext, 
  createOtherTenantContext,
  createTestDiner,
} from '../helpers/test-context.js';
import { TEST_DATA, getTestDb } from '../helpers/test-db.js';
import { sql } from 'drizzle-orm';

describe('DinerService', () => {
  let service: DinerService;

  beforeEach(() => {
    service = createDinerService(createTestContext());
  });

  describe('create', () => {
    it('creates diner with initial diet assignment', async () => {
      const diner = await service.create({
        firstName: 'John',
        lastName: 'Doe',
        siteId: TEST_DATA.siteId,
        dinerType: 'Patient',
        primaryDietTypeId: TEST_DATA.dietTypes.regular,
      });

      expect(diner.dinerId).toBeTruthy();
      expect(diner.firstName).toBe('John');
      expect(diner.status).toBe('Active');

      // Verify diet assignment was created
      const db = getTestDb();
      const assignments = db.all(sql`
        SELECT * FROM diet_assignments WHERE diner_id = ${diner.dinerId}
      `) as any[];

      expect(assignments.length).toBe(1);
      expect(assignments[0].diet_type_id).toBe(TEST_DATA.dietTypes.regular);
      expect(assignments[0].reason).toBe('Initial admission diet order');
    });

    it('validates site belongs to tenant', async () => {
      await expect(
        service.create({
          firstName: 'Jane',
          lastName: 'Doe',
          siteId: TEST_DATA.otherSiteId, // Other tenant's site
          dinerType: 'Patient',
          primaryDietTypeId: TEST_DATA.dietTypes.regular,
        })
      ).rejects.toThrow("doesn't belong to your organization");
    });

    it('validates diet type exists', async () => {
      await expect(
        service.create({
          firstName: 'Jane',
          lastName: 'Doe',
          siteId: TEST_DATA.siteId,
          dinerType: 'Patient',
          primaryDietTypeId: 'DIET-NONEXISTENT',
        })
      ).rejects.toThrow('not found');
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Create some test diners
      await service.create({
        firstName: 'Active',
        lastName: 'Patient',
        siteId: TEST_DATA.siteId,
        dinerType: 'Patient',
        primaryDietTypeId: TEST_DATA.dietTypes.regular,
      });

      const diner2 = await service.create({
        firstName: 'Discharged',
        lastName: 'Patient',
        siteId: TEST_DATA.siteId,
        dinerType: 'Resident',
        primaryDietTypeId: TEST_DATA.dietTypes.diabetic,
      });

      // Discharge the second one
      await service.discharge(diner2.dinerId);
    });

    it('returns all diners by default', async () => {
      const diners = await service.list();
      expect(diners.length).toBe(2);
    });

    it('filters by status', async () => {
      const active = await service.list({ status: 'Active' });
      expect(active.length).toBe(1);
      expect(active[0].firstName).toBe('Active');

      const discharged = await service.list({ status: 'Discharged' });
      expect(discharged.length).toBe(1);
      expect(discharged[0].firstName).toBe('Discharged');
    });

    it('filters by diner type', async () => {
      const patients = await service.list({ dinerType: 'Patient' });
      expect(patients.length).toBe(1);
      expect(patients[0].dinerType).toBe('Patient');
    });

    it('respects limit and offset', async () => {
      const limited = await service.list({ limit: 1 });
      expect(limited.length).toBe(1);

      const offset = await service.list({ limit: 10, offset: 1 });
      expect(offset.length).toBe(1);
    });
  });

  describe('changeDiet', () => {
    let dinerId: string;

    beforeEach(async () => {
      const diner = await service.create({
        firstName: 'Diet',
        lastName: 'Change',
        siteId: TEST_DATA.siteId,
        dinerType: 'Patient',
        primaryDietTypeId: TEST_DATA.dietTypes.regular,
      });
      dinerId = diner.dinerId;
    });

    it('creates new diet assignment', async () => {
      const assignment = await service.changeDiet({
        dinerId,
        dietTypeId: TEST_DATA.dietTypes.diabetic,
        effectiveDate: '2026-01-21',
        orderedBy: 'Dr. Smith',
        reason: 'New diagnosis',
      });

      expect(assignment.assignmentId).toBeTruthy();
      expect(assignment.dietTypeId).toBe(TEST_DATA.dietTypes.diabetic);
      expect(assignment.reason).toBe('New diagnosis');
    });

    it('closes previous diet assignment', async () => {
      // Change diet
      await service.changeDiet({
        dinerId,
        dietTypeId: TEST_DATA.dietTypes.diabetic,
        effectiveDate: '2026-01-21',
        orderedBy: 'Dr. Smith',
      });

      // Check old assignment was closed
      const db = getTestDb();
      const assignments = db.all(sql`
        SELECT * FROM diet_assignments 
        WHERE diner_id = ${dinerId}
        ORDER BY effective_date DESC
      `) as any[];

      expect(assignments.length).toBe(2);
      
      // Old assignment should have end date
      const oldAssignment = assignments.find(a => a.diet_type_id === TEST_DATA.dietTypes.regular);
      expect(oldAssignment.end_date).toBe('2026-01-21');

      // New assignment should be open
      const newAssignment = assignments.find(a => a.diet_type_id === TEST_DATA.dietTypes.diabetic);
      expect(newAssignment.end_date).toBeNull();
    });

    it('updates diner primary diet', async () => {
      await service.changeDiet({
        dinerId,
        dietTypeId: TEST_DATA.dietTypes.renal,
        effectiveDate: '2026-01-21',
        orderedBy: 'Dr. Smith',
      });

      // Verify diner was updated
      const db = getTestDb();
      const [diner] = db.all(sql`
        SELECT * FROM diners WHERE diner_id = ${dinerId}
      `) as any[];

      expect(diner.primary_diet_type_id).toBe(TEST_DATA.dietTypes.renal);
    });

    it('validates diet type exists', async () => {
      await expect(
        service.changeDiet({
          dinerId,
          dietTypeId: 'DIET-FAKE',
          effectiveDate: '2026-01-21',
          orderedBy: 'Dr. Smith',
        })
      ).rejects.toThrow('not found');
    });

    it('validates diner belongs to tenant', async () => {
      // Create diner for other tenant
      const db = getTestDb();
      db.run(sql`
        INSERT INTO diners (diner_id, tenant_id, first_name, last_name, site_id, diner_type, status, primary_diet_type_id)
        VALUES ('DNR-OTHER', ${TEST_DATA.otherTenantId}, 'Other', 'Diner', ${TEST_DATA.otherSiteId}, 'Patient', 'Active', 'DIET-REG')
      `);

      await expect(
        service.changeDiet({
          dinerId: 'DNR-OTHER',
          dietTypeId: TEST_DATA.dietTypes.diabetic,
          effectiveDate: '2026-01-21',
          orderedBy: 'Dr. Smith',
        })
      ).rejects.toThrow('not found');
    });
  });

  describe('getDietHistory', () => {
    let dinerId: string;

    beforeEach(async () => {
      // Create diner with admission date earlier than diet changes
      const diner = await service.create({
        firstName: 'History',
        lastName: 'Test',
        siteId: TEST_DATA.siteId,
        dinerType: 'Patient',
        primaryDietTypeId: TEST_DATA.dietTypes.regular,
        admissionDate: '2026-01-01', // Earlier than diet changes
      });
      dinerId = diner.dinerId;

      // Add diet changes (chronological order)
      await service.changeDiet({
        dinerId,
        dietTypeId: TEST_DATA.dietTypes.diabetic,
        effectiveDate: '2026-01-15',
        orderedBy: 'Dr. A',
        reason: 'First change',
      });

      await service.changeDiet({
        dinerId,
        dietTypeId: TEST_DATA.dietTypes.renal,
        effectiveDate: '2026-01-20',
        orderedBy: 'Dr. B',
        reason: 'Second change',
      });
    });

    it('returns all diet assignments in order', async () => {
      const history = await service.getDietHistory(dinerId);

      expect(history.length).toBe(3);
      // Should be in descending order by effective date (newest first)
      expect(history[0].dietTypeId).toBe(TEST_DATA.dietTypes.renal);    // 2026-01-20
      expect(history[1].dietTypeId).toBe(TEST_DATA.dietTypes.diabetic); // 2026-01-15
      expect(history[2].dietTypeId).toBe(TEST_DATA.dietTypes.regular);  // 2026-01-01
    });
  });

  describe('discharge', () => {
    let dinerId: string;

    beforeEach(async () => {
      const diner = await service.create({
        firstName: 'To',
        lastName: 'Discharge',
        siteId: TEST_DATA.siteId,
        dinerType: 'Patient',
        primaryDietTypeId: TEST_DATA.dietTypes.regular,
      });
      dinerId = diner.dinerId;
    });

    it('sets status to Discharged', async () => {
      const discharged = await service.discharge(dinerId);

      expect(discharged.status).toBe('Discharged');
    });

    it('closes open diet assignments', async () => {
      await service.discharge(dinerId);

      const db = getTestDb();
      const assignments = db.all(sql`
        SELECT * FROM diet_assignments WHERE diner_id = ${dinerId}
      `) as any[];

      // All assignments should have end dates
      for (const assignment of assignments) {
        expect(assignment.end_date).not.toBeNull();
      }
    });
  });

  describe('getCountsByStatus', () => {
    beforeEach(async () => {
      // Create some diners with different statuses
      await service.create({
        firstName: 'Active1',
        lastName: 'Test',
        siteId: TEST_DATA.siteId,
        dinerType: 'Patient',
        primaryDietTypeId: TEST_DATA.dietTypes.regular,
      });

      await service.create({
        firstName: 'Active2',
        lastName: 'Test',
        siteId: TEST_DATA.siteId,
        dinerType: 'Patient',
        primaryDietTypeId: TEST_DATA.dietTypes.regular,
      });

      const toDischarge = await service.create({
        firstName: 'Discharged',
        lastName: 'Test',
        siteId: TEST_DATA.siteId,
        dinerType: 'Patient',
        primaryDietTypeId: TEST_DATA.dietTypes.regular,
      });
      await service.discharge(toDischarge.dinerId);
    });

    it('returns counts by status', async () => {
      const counts = await service.getCountsByStatus();

      expect(counts.Active).toBe(2);
      expect(counts.Discharged).toBe(1);
      expect(counts['On Leave']).toBe(0);
      expect(counts.total).toBe(3);
    });
  });
});

