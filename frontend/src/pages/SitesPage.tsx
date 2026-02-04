import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSites, useDeleteSites } from '../hooks/useApi';
import { AGGridTable } from '../components/AGGridTable';
import type { ColDef } from 'ag-grid-community';

// Status badge renderer
const StatusRenderer = (params: any) => {
  const value = params.value;
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
    Seasonal: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
      {value}
    </span>
  );
};

export function SitesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useSites();
  const deleteMutation = useDeleteSites();

  const handleDelete = (rows: any[]) => {
    if (window.confirm(`Delete ${rows.length} site(s)? This cannot be undone.`)) {
      const ids = rows.map(r => r.siteId);
      deleteMutation.mutate(ids);
    }
  };

  const handleAdd = () => {
    navigate('/sites/new');
  };

  const handleRowClick = (row: any) => {
    navigate(`/sites/${row.siteId}`);
  };

  const columnDefs: ColDef[] = [
    { field: 'siteName', headerName: 'Name', minWidth: 150 },
    { field: 'siteType', headerName: 'Type', minWidth: 120 },
    { field: 'address', headerName: 'Address', minWidth: 180, flex: 1 },
    { field: 'storageDrySqft', headerName: 'Dry (sqft)', width: 110, type: 'numericColumn' },
    { field: 'storageRefrigeratedSqft', headerName: 'Cooler (sqft)', width: 120, type: 'numericColumn' },
    { field: 'storageFreezerSqft', headerName: 'Freezer (sqft)', width: 120, type: 'numericColumn' },
    { field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusRenderer },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
        <p className="text-sm text-gray-500 mt-1">Manage locations and facilities</p>
      </div>

      <AGGridTable
        rowData={data ?? []}
        columnDefs={columnDefs}
        isLoading={isLoading}
        getRowId={(data) => data.siteId}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
        searchPlaceholder="Search sites..."
        emptyMessage="No sites found."
      />
    </div>
  );
}
