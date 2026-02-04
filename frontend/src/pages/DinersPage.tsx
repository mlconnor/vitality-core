import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiners, useDeleteDiners } from '../hooks/useApi';
import { AGGridTable } from '../components/AGGridTable';
import type { ColDef } from 'ag-grid-community';

// Status badge renderer
const StatusRenderer = (params: any) => {
  const value = params.value;
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
    Discharged: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
      {value}
    </span>
  );
};

export function DinersPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDiners();
  const deleteMutation = useDeleteDiners();

  const handleDelete = (rows: any[]) => {
    if (window.confirm(`Delete ${rows.length} diner(s)? This cannot be undone.`)) {
      const ids = rows.map(r => r.dinerId);
      deleteMutation.mutate(ids);
    }
  };

  const handleAdd = () => {
    navigate('/diners/new');
  };

  const handleRowClick = (row: any) => {
    navigate(`/diners/${row.dinerId}`);
  };

  const columnDefs: ColDef[] = [
    { field: 'firstName', headerName: 'First Name', minWidth: 120 },
    { field: 'lastName', headerName: 'Last Name', minWidth: 120 },
    { field: 'roomNumber', headerName: 'Room', width: 100 },
    { field: 'dinerType', headerName: 'Type', minWidth: 120 },
    { field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusRenderer },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Diners</h1>
        <p className="text-sm text-gray-500 mt-1">Manage residents and guests</p>
      </div>

      <AGGridTable
        rowData={data ?? []}
        columnDefs={columnDefs}
        isLoading={isLoading}
        getRowId={(data) => data.dinerId}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
        searchPlaceholder="Search diners..."
        emptyMessage="No diners found."
      />
    </div>
  );
}
