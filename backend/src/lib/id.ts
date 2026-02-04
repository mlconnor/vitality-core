/**
 * ID Generation Utilities
 * 
 * Generates readable, prefixed IDs for all entities.
 * Format: PREFIX-XXXXXXXXXX (prefix + 10 random alphanumeric chars)
 */

import { randomBytes } from 'crypto';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a random alphanumeric string
 */
function randomString(length: number): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

/**
 * Entity prefixes for readable IDs
 */
export const ID_PREFIXES = {
  // Organization
  tenant: 'TEN',
  site: 'SITE',
  station: 'STN',
  employee: 'EMP',
  
  // Reference
  allergen: 'ALG',
  unit: 'UOM',
  foodCategory: 'CAT',
  foodCompSource: 'FCS',
  
  // Menu Planning
  mealPeriod: 'MP',
  dietType: 'DIET',
  cycleMenu: 'CM',
  menuItem: 'MI',
  singleUseMenu: 'SUM',
  singleUseMenuItem: 'SUMI',
  
  // Recipes
  recipe: 'RCP',
  recipeIngredient: 'RCI',
  ingredient: 'ING',
  ingredientRef: 'INGREF',
  
  // Diners
  diner: 'DNR',
  dietAssignment: 'DA',
  mealOrder: 'MO',
  
  // Procurement
  vendor: 'VND',
  productSpec: 'SPEC',
  purchaseOrder: 'PO',
  poLineItem: 'POLI',
  
  // Inventory
  receiving: 'RCV',
  inventory: 'INV',
  storeroomIssue: 'ISS',
  
  // Production
  productionSchedule: 'PROD',
  forecast: 'FCST',
  leftoverReport: 'LEFT',
} as const;

export type IdPrefix = keyof typeof ID_PREFIXES;

/**
 * Generate a prefixed ID for an entity
 * 
 * @example
 * generateId('recipe') // => 'RCP-A1b2C3d4E5'
 * generateId('tenant') // => 'TEN-X9y8Z7w6V5'
 */
export function generateId(entity: IdPrefix): string {
  const prefix = ID_PREFIXES[entity];
  return `${prefix}-${randomString(10)}`;
}

