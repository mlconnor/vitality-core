/**
 * Generic Entity Page
 * 
 * A reusable page component for any CRUD entity.
 * Uses configuration from entities.tsx to render the DataTable.
 */

import React from 'react';
import { DataTable } from '../components/DataTable';
import type { EntityConfig } from '../config/entities';

interface EntityPageProps<T> {
  config: EntityConfig<T>;
  data: T[];
  isLoading: boolean;
  onAdd?: () => void;
  onDelete?: (rows: T[]) => void;
  onRowClick?: (row: T) => void;
}

export function EntityPage<T extends { [key: string]: any }>({
  config,
  data,
  isLoading,
  onAdd,
  onDelete,
  onRowClick,
}: EntityPageProps<T>) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{config.pluralName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your {config.pluralName.toLowerCase()}
        </p>
      </div>

      <DataTable
        data={data}
        columns={config.columns}
        isLoading={isLoading}
        onAdd={onAdd}
        onDelete={onDelete}
        onRowClick={onRowClick}
        searchPlaceholder={config.searchPlaceholder}
        emptyMessage={`No ${config.pluralName.toLowerCase()} found`}
      />
    </div>
  );
}

