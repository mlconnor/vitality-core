/**
 * tRPC Initialization
 * 
 * Sets up the tRPC instance with:
 * - Context type inference
 * - Procedures (public and protected)
 * - Error handling with superjson for rich types
 */

import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context.js';

/**
 * Initialize tRPC with our context type
 * 
 * superjson allows us to send Date objects, Maps, Sets, etc.
 * without manual serialization
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Add custom error data here if needed
      },
    };
  },
});

/**
 * Router - groups procedures together
 */
export const router = t.router;

/**
 * Middleware - runs before procedures
 */
export const middleware = t.middleware;

/**
 * Public procedure - no authentication required
 * Use for: health checks, public data, login
 */
export const publicProcedure = t.procedure;

/**
 * Middleware that enforces authentication
 */
const enforceAuth = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  if (!ctx.tenant) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Your tenant account is not active or not found',
    });
  }

  // Narrow the types - user and tenant are now guaranteed non-null
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenant: ctx.tenant,
    },
  });
});

/**
 * Protected procedure - requires authentication + active tenant
 * Use for: all tenant-specific operations
 * 
 * In protected procedures, ctx.user and ctx.tenant are guaranteed non-null
 */
export const protectedProcedure = t.procedure.use(enforceAuth);

/**
 * Type for protected context (user and tenant guaranteed)
 */
export type ProtectedContext = Context & {
  user: NonNullable<Context['user']>;
  tenant: NonNullable<Context['tenant']>;
};

