/**
 * Entity Configuration
 * 
 * Defines column configurations for each entity type.
 * This single file controls how all entities display in the DataTable.
 */

import { type ColumnDef } from '@tanstack/react-table';

// Generic helper for creating text columns
function textColumn<T>(
  accessorKey: keyof T & string,
  header: string,
  options?: { size?: number }
): ColumnDef<T, string> {
  return {
    accessorKey,
    header,
    size: options?.size,
  };
}

// Helper for status badge columns
function statusColumn<T>(
  accessorKey: keyof T & string,
  header: string = 'Status'
): ColumnDef<T, string> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => {
      const value = getValue();
      const colors: Record<string, string> = {
        Active: 'bg-green-100 text-green-800',
        Inactive: 'bg-gray-100 text-gray-800',
        Draft: 'bg-yellow-100 text-yellow-800',
        Archived: 'bg-red-100 text-red-800',
        Discharged: 'bg-gray-100 text-gray-800',
        Submitted: 'bg-blue-100 text-blue-800',
        Confirmed: 'bg-purple-100 text-purple-800',
        Received: 'bg-green-100 text-green-800',
        Cancelled: 'bg-red-100 text-red-800',
      };
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
          {value}
        </span>
      );
    },
  };
}

// Helper for currency columns
function currencyColumn<T>(
  accessorKey: keyof T & string,
  header: string
): ColumnDef<T, number> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => {
      const value = getValue();
      return value != null ? `$${value.toFixed(2)}` : '-';
    },
  };
}

// Helper for number columns
function numberColumn<T>(
  accessorKey: keyof T & string,
  header: string,
  options?: { decimals?: number }
): ColumnDef<T, number> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => {
      const value = getValue();
      if (value == null) return '-';
      return options?.decimals != null ? value.toFixed(options.decimals) : value.toString();
    },
  };
}

// ============================================================================
// Entity Configurations
// ============================================================================

export interface EntityConfig<T = any> {
  name: string;
  pluralName: string;
  columns: ColumnDef<T, any>[];
  searchPlaceholder?: string;
}

// Sites
export const sitesConfig: EntityConfig = {
  name: 'Site',
  pluralName: 'Sites',
  columns: [
    textColumn('siteName', 'Name'),
    textColumn('siteType', 'Type'),
    textColumn('address', 'Address'),
    numberColumn('storageDrySqft', 'Dry (sqft)'),
    numberColumn('storageRefrigeratedSqft', 'Cooler (sqft)'),
    numberColumn('storageFreezerSqft', 'Freezer (sqft)'),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search sites...',
};

// Stations
export const stationsConfig: EntityConfig = {
  name: 'Station',
  pluralName: 'Stations',
  columns: [
    textColumn('stationName', 'Name'),
    textColumn('stationType', 'Type'),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search stations...',
};

// Employees
export const employeesConfig: EntityConfig = {
  name: 'Employee',
  pluralName: 'Employees',
  columns: [
    textColumn('firstName', 'First Name'),
    textColumn('lastName', 'Last Name'),
    textColumn('jobTitle', 'Job Title'),
    textColumn('email', 'Email'),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search employees...',
};

// Diners
export const dinersConfig: EntityConfig = {
  name: 'Diner',
  pluralName: 'Diners',
  columns: [
    textColumn('firstName', 'First Name'),
    textColumn('lastName', 'Last Name'),
    textColumn('roomNumber', 'Room'),
    textColumn('dinerType', 'Type'),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search diners...',
};

// Diet Types
export const dietTypesConfig: EntityConfig = {
  name: 'Diet Type',
  pluralName: 'Diet Types',
  columns: [
    textColumn('dietTypeName', 'Name'),
    textColumn('dietCategory', 'Category'),
    textColumn('description', 'Description', { size: 300 }),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search diet types...',
};

// Ingredients
export const ingredientsConfig: EntityConfig = {
  name: 'Ingredient',
  pluralName: 'Ingredients',
  columns: [
    textColumn('ingredientName', 'Name'),
    textColumn('foodCategoryId', 'Category'),
    textColumn('storageType', 'Storage'),
    currencyColumn('costPerUnit', 'Cost/Unit'),
    numberColumn('parLevel', 'Par Level'),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search ingredients...',
};

// Recipes
export const recipesConfig: EntityConfig = {
  name: 'Recipe',
  pluralName: 'Recipes',
  columns: [
    textColumn('recipeName', 'Name'),
    textColumn('category', 'Category'),
    textColumn('cuisineType', 'Cuisine'),
    numberColumn('yieldQuantity', 'Yield'),
    currencyColumn('foodCostPerPortion', 'Cost/Portion'),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search recipes...',
};

// Vendors
export const vendorsConfig: EntityConfig = {
  name: 'Vendor',
  pluralName: 'Vendors',
  columns: [
    textColumn('vendorName', 'Name'),
    textColumn('vendorType', 'Type'),
    textColumn('contactName', 'Contact'),
    textColumn('phone', 'Phone'),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search vendors...',
};

// Purchase Orders
export const purchaseOrdersConfig: EntityConfig = {
  name: 'Purchase Order',
  pluralName: 'Purchase Orders',
  columns: [
    textColumn('poNumber', 'PO #'),
    textColumn('vendorId', 'Vendor'),
    textColumn('orderDate', 'Order Date'),
    textColumn('requestedDeliveryDate', 'Delivery Date'),
    currencyColumn('total', 'Total'),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search purchase orders...',
};

// Inventory
export const inventoryConfig: EntityConfig = {
  name: 'Inventory',
  pluralName: 'Inventory',
  columns: [
    textColumn('ingredientId', 'Ingredient'),
    textColumn('storageLocation', 'Location'),
    numberColumn('quantityOnHand', 'Qty on Hand', { decimals: 2 }),
    textColumn('unitOfMeasure', 'Unit'),
    currencyColumn('unitCost', 'Unit Cost'),
    textColumn('expirationDate', 'Expires'),
  ],
  searchPlaceholder: 'Search inventory...',
};

// Units
export const unitsConfig: EntityConfig = {
  name: 'Unit',
  pluralName: 'Units',
  columns: [
    textColumn('unitName', 'Name'),
    textColumn('unitAbbreviation', 'Abbrev'),
    textColumn('unitType', 'Type'),
    numberColumn('conversionToBase', 'Conversion'),
    textColumn('baseUnit', 'Base Unit'),
  ],
  searchPlaceholder: 'Search units...',
};

// Categories
export const categoriesConfig: EntityConfig = {
  name: 'Category',
  pluralName: 'Categories',
  columns: [
    textColumn('categoryName', 'Name'),
    textColumn('storageType', 'Storage Type'),
    numberColumn('sortOrder', 'Sort Order'),
  ],
  searchPlaceholder: 'Search categories...',
};

// Allergens
export const allergensConfig: EntityConfig = {
  name: 'Allergen',
  pluralName: 'Allergens',
  columns: [
    textColumn('allergenName', 'Name'),
    {
      accessorKey: 'isMajorAllergen',
      header: 'Major',
      cell: ({ getValue }) => getValue() ? '✓' : '',
    },
    textColumn('commonSources', 'Common Sources', { size: 300 }),
  ],
  searchPlaceholder: 'Search allergens...',
};

// Receiving
export const receivingConfig: EntityConfig = {
  name: 'Receiving',
  pluralName: 'Receiving',
  columns: [
    textColumn('receivingId', 'ID'),
    textColumn('vendorId', 'Vendor'),
    textColumn('deliveryDate', 'Date'),
    textColumn('invoiceNumber', 'Invoice #'),
    currencyColumn('invoiceAmount', 'Amount'),
    statusColumn('status'),
  ],
  searchPlaceholder: 'Search receiving...',
};

