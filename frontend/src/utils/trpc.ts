/**
 * tRPC-like API hooks
 * 
 * Provides React Query hooks that mimic tRPC's API style
 * for clean component code while using the simple fetch client.
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { trpcQuery, trpcMutation, queryKey } from './api';
import { useAuth } from './auth';

// Types for tree nodes (matching backend)
export interface TreeNode {
  id: string;
  name: string;
  type: string;
  icon?: string;
  count?: number;
  children?: TreeNode[];
  href?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * tRPC-style API object with hooks
 * Usage: trpc.tree.getEntityTree.useQuery()
 */
export const trpc = {
  tree: {
    getEntityTree: {
      useQuery: (input?: undefined, options?: Omit<UseQueryOptions<TreeNode[], Error>, 'queryKey' | 'queryFn'>) => {
        const { token } = useAuth();
        return useQuery<TreeNode[], Error>({
          queryKey: queryKey('tree.getEntityTree'),
          queryFn: () => trpcQuery<TreeNode[]>('tree.getEntityTree', undefined, { token }),
          ...options,
        });
      },
    },
    getNodeChildren: {
      useQuery: (
        input: { nodeId: string; nodeType: string },
        options?: Omit<UseQueryOptions<TreeNode[], Error>, 'queryKey' | 'queryFn'>
      ) => {
        const { token } = useAuth();
        return useQuery<TreeNode[], Error>({
          queryKey: queryKey('tree.getNodeChildren', input),
          queryFn: () => trpcQuery<TreeNode[]>('tree.getNodeChildren', input, { token }),
          ...options,
        });
      },
    },
  },
  
  // Add other routers as needed
  site: {
    list: {
      useQuery: (input?: any, options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>) => {
        const { token } = useAuth();
        return useQuery({
          queryKey: queryKey('site.list', input),
          queryFn: () => trpcQuery('site.list', input, { token }),
          ...options,
        });
      },
    },
  },
  
  recipe: {
    list: {
      useQuery: (input?: any, options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>) => {
        const { token } = useAuth();
        return useQuery({
          queryKey: queryKey('recipe.list', input),
          queryFn: () => trpcQuery('recipe.list', input, { token }),
          ...options,
        });
      },
    },
    getById: {
      useQuery: (input: { id: string }, options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
        const { token } = useAuth();
        return useQuery({
          queryKey: queryKey('recipe.getById', input),
          queryFn: () => trpcQuery('recipe.getById', input, { token }),
          ...options,
        });
      },
    },
  },
  
  diner: {
    list: {
      useQuery: (input?: any, options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>) => {
        const { token } = useAuth();
        return useQuery({
          queryKey: queryKey('diner.list', input),
          queryFn: () => trpcQuery('diner.list', input, { token }),
          ...options,
        });
      },
    },
  },
  
  employee: {
    list: {
      useQuery: (input?: any, options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>) => {
        const { token } = useAuth();
        return useQuery({
          queryKey: queryKey('employee.list', input),
          queryFn: () => trpcQuery('employee.list', input, { token }),
          ...options,
        });
      },
    },
  },
  
  vendor: {
    list: {
      useQuery: (input?: any, options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>) => {
        const { token } = useAuth();
        return useQuery({
          queryKey: queryKey('vendor.list', input),
          queryFn: () => trpcQuery('vendor.list', input, { token }),
          ...options,
        });
      },
    },
  },
  
  ingredient: {
    list: {
      useQuery: (input?: any, options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>) => {
        const { token } = useAuth();
        return useQuery({
          queryKey: queryKey('ingredient.list', input),
          queryFn: () => trpcQuery('ingredient.list', input, { token }),
          ...options,
        });
      },
    },
  },
};

