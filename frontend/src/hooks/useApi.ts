/**
 * API Hooks
 * 
 * Custom hooks for fetching data from the tRPC API using React Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpcQuery, trpcMutation, queryKey } from '../utils/api';
import { useAuth } from '../utils/auth';

/**
 * Generic query hook for any tRPC procedure
 */
export function useApiQuery<T = any>(
  procedure: string,
  input?: Record<string, any>,
  options?: { enabled?: boolean }
) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: queryKey(procedure, input),
    queryFn: () => trpcQuery<T>(procedure, input, { token }),
    enabled: options?.enabled !== false,
  });
}

/**
 * Generic mutation hook for any tRPC procedure
 */
export function useApiMutation<T = any, V extends Record<string, any> = Record<string, any>>(
  procedure: string
) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: V) => trpcMutation<T>(procedure, input, { token }),
    onSuccess: () => {
      // Invalidate related queries
      // Default: invalidate everything (safe, but can be refined per entity)
      queryClient.invalidateQueries();
    },
  });
}

// ============================================================================
// Typed Hooks for Common Entities
// ============================================================================

// Sites
export function useSites() {
  return useApiQuery('site.list', {});
}

// Employees
export function useEmployees() {
  return useApiQuery('employee.list', {});
}

// Diners
export function useDiners() {
  return useApiQuery('diner.list', {});
}

// Diet Types
export function useDietTypes() {
  return useApiQuery('dietType.list', {});
}

// Ingredients
export function useIngredients() {
  return useApiQuery('ingredient.list', {});
}

// Recipes
export function useRecipes() {
  return useApiQuery('recipe.list', {});
}

// Vendors
export function useVendors() {
  return useApiQuery('vendor.list', {});
}

// Allergens
export function useAllergens() {
  return useApiQuery('allergen.list', {});
}

// Units
export function useUnits() {
  return useApiQuery('unit.list', {});
}

// Food Categories
export function useFoodCategories() {
  return useApiQuery('foodCategory.list', {});
}

// Stations
export function useStations() {
  return useApiQuery('station.list', {});
}

// Receiving
export function useReceiving() {
  return useApiQuery('receiving.list', {});
}

// ============================================================================
// Create/Update Mutations
// ============================================================================

/**
 * Generic create mutation
 */
export function useCreateMutation<T = any>(entityProcedure: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: Record<string, any>) => 
      trpcMutation<T>(`${entityProcedure}.create`, input, { token }),
    onSuccess: () => {
      // Narrow invalidation for high-traffic entities where possible
      if (entityProcedure === 'site') {
        queryClient.invalidateQueries({ queryKey: ['site.list'] });
        return;
      }
      queryClient.invalidateQueries();
    },
  });
}

/**
 * Generic update mutation
 */
export function useUpdateMutation<T = any>(entityProcedure: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    // Most backend routers (crud-factory + custom routers) expect: { id, data: {...fields} }
    // Many pages naturally build: { id, ...fields } - we normalize here.
    mutationFn: (input: Record<string, any>) => {
      const { id, data, ...rest } = input ?? {};
      const payload = data != null ? { id, data } : { id, data: rest };
      return trpcMutation<T>(`${entityProcedure}.update`, payload, { token });
    },
    onSuccess: () => {
      if (entityProcedure === 'site') {
        queryClient.invalidateQueries({ queryKey: ['site.list'] });
        // We don't know what input shape the caller used; invalidate all site.getById variants.
        queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'site.getById' });
        return;
      }
      queryClient.invalidateQueries();
    },
  });
}

// ============================================================================
// Delete Mutations
// ============================================================================

/**
 * Generic delete mutation for bulk deleting by IDs
 */
export function useDeleteMutation(entityProcedure: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ids: string[]) => 
      trpcMutation(`${entityProcedure}.bulkDelete`, { ids }, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

// Typed delete hooks for each entity
export function useDeleteSites() {
  return useDeleteMutation('site');
}

export function useDeleteEmployees() {
  return useDeleteMutation('employee');
}

export function useDeleteDiners() {
  return useDeleteMutation('diner');
}

export function useDeleteDietTypes() {
  return useDeleteMutation('dietType');
}

export function useDeleteIngredients() {
  return useDeleteMutation('ingredient');
}

export function useDeleteRecipes() {
  return useDeleteMutation('recipe');
}

export function useDeleteVendors() {
  return useDeleteMutation('vendor');
}

export function useDeleteAllergens() {
  return useDeleteMutation('allergen');
}

export function useDeleteUnits() {
  return useDeleteMutation('unit');
}

export function useDeleteStations() {
  return useDeleteMutation('station');
}

export function useDeleteFoodCategories() {
  return useDeleteMutation('foodCategory');
}

