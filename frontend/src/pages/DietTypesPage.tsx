import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDietTypes, useDeleteDietTypes } from '../hooks/useApi';
import { AGGridTable } from '../components/AGGridTable';
import type { ColDef } from 'ag-grid-community';

// Status badge renderer
const StatusRenderer = (params: any) => {
  const value = params.value;
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
      {value}
    </span>
  );
};

export function DietTypesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDietTypes();
  const deleteMutation = useDeleteDietTypes();

  const handleDelete = (rows: any[]) => {
    if (window.confirm(`Delete ${rows.length} diet type(s)? This cannot be undone.`)) {
      const ids = rows.map(r => r.dietTypeId);
      deleteMutation.mutate(ids);
    }
  };

  const handleAdd = () => {
    navigate('/diet-types/new');
  };

  const handleRowClick = (row: any) => {
    navigate(`/diet-types/${row.dietTypeId}`);
  };

  const columnDefs: ColDef[] = [
    { field: 'dietTypeName', headerName: 'Name', minWidth: 150 },
    { field: 'dietCategory', headerName: 'Category', minWidth: 120 },
    { field: 'description', headerName: 'Description', minWidth: 250, flex: 2 },
    { field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusRenderer },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Diet Types</h1>
        <p className="text-sm text-gray-500 mt-1">Manage diet types for menu planning</p>
      </div>

      <AGGridTable
        rowData={data ?? []}
        columnDefs={columnDefs}
        isLoading={isLoading}
        getRowId={(data) => data.dietTypeId}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
        searchPlaceholder="Search diet types..."
        emptyMessage="No diet types found."
      />
    </div>
  );
}
