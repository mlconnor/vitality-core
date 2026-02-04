import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendors, useDeleteVendors } from '../hooks/useApi';
import { AGGridTable } from '../components/AGGridTable';
import type { ColDef } from 'ag-grid-community';

// Status badge renderer
const StatusRenderer = (params: any) => {
  const value = params.value;
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
    'Under Review': 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
      {value}
    </span>
  );
};

export function VendorsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useVendors();
  const deleteMutation = useDeleteVendors();

  const handleDelete = (rows: any[]) => {
    if (window.confirm(`Delete ${rows.length} vendor(s)? This cannot be undone.`)) {
      const ids = rows.map(r => r.vendorId);
      deleteMutation.mutate(ids);
    }
  };

  const handleAdd = () => {
    navigate('/vendors/new');
  };

  const handleRowClick = (row: any) => {
    navigate(`/vendors/${row.vendorId}`);
  };

  const columnDefs: ColDef[] = [
    { field: 'vendorName', headerName: 'Name', minWidth: 180, flex: 1 },
    { field: 'vendorType', headerName: 'Type', minWidth: 120 },
    { field: 'contactName', headerName: 'Contact', minWidth: 140 },
    { field: 'phone', headerName: 'Phone', minWidth: 130 },
    { field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusRenderer },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <p className="text-sm text-gray-500 mt-1">Manage suppliers and vendors</p>
      </div>

      <AGGridTable
        rowData={data ?? []}
        columnDefs={columnDefs}
        isLoading={isLoading}
        getRowId={(data) => data.vendorId}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
        searchPlaceholder="Search vendors..."
        emptyMessage="No vendors found."
      />
    </div>
  );
}
