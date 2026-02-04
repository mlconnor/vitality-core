/**
 * Auth tRPC Router
 * 
 * Handles authentication - generating JWTs for users.
 * 
 * This is a simple implementation for development/testing.
 * In production, you'd integrate with:
 * - Enterprise SSO (SAML, OIDC)
 * - Local user database with password hashing
 */

import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { router, publicProcedure } from '../index.js';
import { db } from '../../db/index.js';
import { tenants, employees } from '../../db/schema/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Login schema
 * 
 * For now, this is a simple tenant-code + email login.
 * In production, you'd add password verification.
 */
const loginSchema = z.object({
  tenantCode: z.string().min(1, 'Tenant code is required'),
  email: z.string().email('Valid email is required'),
  // password: z.string().min(8) - add this in production
});

/**
 * Auth Router
 * 
 * Uses publicProcedure since login doesn't require authentication
 */
export const authRouter = router({
  /**
   * Login and get a JWT token
   * 
   * For development, this accepts any valid tenant code + email.
   * In production, add password verification.
   * 
   * @example
   * const { token } = await trpc.auth.login.mutate({
   *   tenantCode: 'DEMO',
   *   email: 'admin@example.com',
   * });
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const { tenantCode, email } = input;

      // Find tenant by code
      const tenant = await db
        .select()
        .from(tenants)
        .where(and(
          eq(tenants.tenantCode, tenantCode),
          eq(tenants.status, 'Active')
        ))
        .limit(1);

      if (!tenant.length) {
        throw new Error('Invalid tenant code or tenant is not active');
      }

      // Find employee by email in this tenant
      const employee = await db
        .select()
        .from(employees)
        .where(and(
          eq(employees.tenantId, tenant[0].tenantId),
          eq(employees.email, email),
          eq(employees.status, 'Active')
        ))
        .limit(1);

      if (!employee.length) {
        throw new Error('Invalid email or user is not active');
      }

      // In production, verify password here:
      // const isValid = await bcrypt.compare(password, employee[0].passwordHash);

      // Determine role based on job title
      const roleMap: Record<string, 'admin' | 'manager' | 'staff' | 'viewer'> = {
        'Manager': 'admin',
        'Supervisor': 'manager',
        'Dietitian': 'manager',
        'Cook': 'staff',
        'Prep Cook': 'staff',
        'Server': 'staff',
        'Dishwasher': 'staff',
        'Receiving Clerk': 'staff',
        'Storeroom Clerk': 'staff',
        'Tray Assembler': 'staff',
        'Cashier': 'staff',
        'Utility Worker': 'staff',
      };

      const role = roleMap[employee[0].jobTitle] || 'viewer';

      // Generate JWT
      const payload = {
        userId: employee[0].employeeId,
        email: employee[0].email,
        tenantId: tenant[0].tenantId,
        role,
      };

      const token = jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_EXPIRES_IN 
      });

      return {
        token,
        user: {
          userId: employee[0].employeeId,
          email: employee[0].email,
          firstName: employee[0].firstName,
          lastName: employee[0].lastName,
          role,
        },
        tenant: {
          tenantId: tenant[0].tenantId,
          tenantName: tenant[0].tenantName,
          tenantCode: tenant[0].tenantCode,
        },
      };
    }),

  /**
   * Verify a token and get user info
   * 
   * Useful for checking if a stored token is still valid.
   * 
   * @example
   * const { user, tenant } = await trpc.auth.verify.query({ token });
   */
  verify: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      try {
        const decoded = jwt.verify(input.token, JWT_SECRET) as {
          userId: string;
          email: string;
          tenantId: string;
          role: string;
        };

        // Get fresh user and tenant data
        const tenant = await db
          .select()
          .from(tenants)
          .where(eq(tenants.tenantId, decoded.tenantId))
          .limit(1);

        const employee = await db
          .select()
          .from(employees)
          .where(eq(employees.employeeId, decoded.userId))
          .limit(1);

        if (!tenant.length || !employee.length) {
          throw new Error('User or tenant not found');
        }

        return {
          valid: true,
          user: {
            userId: employee[0].employeeId,
            email: employee[0].email,
            firstName: employee[0].firstName,
            lastName: employee[0].lastName,
            role: decoded.role,
          },
          tenant: {
            tenantId: tenant[0].tenantId,
            tenantName: tenant[0].tenantName,
            tenantCode: tenant[0].tenantCode,
          },
        };
      } catch (error) {
        return {
          valid: false,
          user: null,
          tenant: null,
        };
      }
    }),

  /**
   * Development-only: Create a test token for any tenant
   * 
   * This should be disabled in production!
   * 
   * @example
   * const { token } = await trpc.auth.devToken.mutate({
   *   tenantId: 'TEN-001',
   *   role: 'admin',
   * });
   */
  devToken: publicProcedure
    .input(z.object({
      tenantId: z.string(),
      role: z.enum(['admin', 'manager', 'staff', 'viewer']).default('admin'),
    }))
    .mutation(async ({ input }) => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('devToken is not available in production');
      }

      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, input.tenantId))
        .limit(1);

      if (!tenant.length) {
        throw new Error('Tenant not found');
      }

      const payload = {
        userId: 'dev-user',
        email: 'dev@example.com',
        tenantId: input.tenantId,
        role: input.role,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      return {
        token,
        payload,
        tenant: {
          tenantId: tenant[0].tenantId,
          tenantName: tenant[0].tenantName,
          tenantCode: tenant[0].tenantCode,
        },
      };
    }),
});

export type AuthRouter = typeof authRouter;

