import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIngredients, useDeleteIngredients, useFoodCategories } from '../hooks/useApi';
import { AGGridTable } from '../components/AGGridTable';
import type { ColDef } from 'ag-grid-community';

// Status badge renderer
const StatusRenderer = (params: any) => {
  const value = params.value;
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
    Discontinued: 'bg-red-100 text-red-800',
    Seasonal: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
      {value}
    </span>
  );
};

// Boolean renderer
const BooleanRenderer = (params: any) => {
  return params.value ? '✓' : '';
};

// Currency formatter
const currencyFormatter = (params: any) => {
  const value = params.value;
  return value != null ? `$${value.toFixed(2)}` : '-';
};

export function IngredientsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useIngredients();
  const { data: categories } = useFoodCategories();
  const deleteMutation = useDeleteIngredients();

  const handleDelete = (rows: any[]) => {
    if (window.confirm(`Delete ${rows.length} ingredient(s)? This cannot be undone.`)) {
      const ids = rows.map(r => r.ingredientId);
      deleteMutation.mutate(ids);
    }
  };

  const handleAdd = () => {
    navigate('/ingredients/new');
  };

  const handleRowClick = (row: any) => {
    navigate(`/ingredients/${row.ingredientId}`);
  };

  const columnDefs: ColDef[] = [
    { field: 'ingredientName', headerName: 'Name', minWidth: 180, flex: 1 },
    { 
      field: 'foodCategoryId', 
      headerName: 'Category', 
      minWidth: 120,
      valueFormatter: (params) => {
        const cat = categories?.find((c: any) => c.categoryId === params.value);
        return cat?.categoryName || params.value;
      }
    },
    { field: 'storageType', headerName: 'Storage', width: 110 },
    { field: 'commonUnit', headerName: 'Unit', width: 90 },
    { field: 'purchaseUnit', headerName: 'Purchase Unit', width: 120 },
    { field: 'costPerUnit', headerName: 'Cost/Unit', width: 110, valueFormatter: currencyFormatter, type: 'numericColumn' },
    { field: 'parLevel', headerName: 'Par Level', width: 100, type: 'numericColumn' },
    { field: 'isLocal', headerName: 'Local', width: 80, cellRenderer: BooleanRenderer },
    { field: 'isOrganic', headerName: 'Organic', width: 90, cellRenderer: BooleanRenderer },
    { field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusRenderer },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ingredients</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your ingredient master list</p>
      </div>

      <AGGridTable
        rowData={data ?? []}
        columnDefs={columnDefs}
        isLoading={isLoading}
        getRowId={(data) => data.ingredientId}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
        searchPlaceholder="Search ingredients..."
        emptyMessage="No ingredients found."
      />
    </div>
  );
}

export default IngredientsPage;
