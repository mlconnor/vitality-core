import React, { useState } from 'react';
import { useFoodCategories, useDeleteFoodCategories, useCreateMutation, useUpdateMutation } from '../hooks/useApi';
import { AGGridTable } from '../components/AGGridTable';
import { EntityModal, type FieldConfig } from '../components/EntityModal';
import type { ColDef } from 'ag-grid-community';

export function CategoriesPage() {
  const { data, isLoading } = useFoodCategories();
  const deleteMutation = useDeleteFoodCategories();
  const createMutation = useCreateMutation('foodCategory');
  const updateMutation = useUpdateMutation('foodCategory');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    data?: any;
  }>({ isOpen: false, mode: 'create' });

  const handleDelete = (rows: any[]) => {
    if (window.confirm(`Delete ${rows.length} category(ies)? This cannot be undone.`)) {
      const ids = rows.map(r => r.categoryId);
      deleteMutation.mutate(ids);
    }
  };

  const handleAdd = () => {
    setModalState({ isOpen: true, mode: 'create', data: undefined });
  };

  const handleRowClick = (row: any) => {
    setModalState({ isOpen: true, mode: 'edit', data: row });
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, mode: 'create', data: undefined });
  };

  const handleSubmit = (formData: Record<string, any>) => {
    if (modalState.mode === 'create') {
      createMutation.mutate(formData, {
        onSuccess: () => handleCloseModal(),
      });
    } else {
      updateMutation.mutate(
        { id: modalState.data.categoryId, ...formData },
        { onSuccess: () => handleCloseModal() }
      );
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'categoryName', headerName: 'Name', minWidth: 180, flex: 1 },
    { field: 'storageType', headerName: 'Storage Type', minWidth: 140 },
    { field: 'sortOrder', headerName: 'Sort Order', width: 120, type: 'numericColumn' },
  ];

  const fields: FieldConfig[] = [
    { name: 'categoryName', label: 'Category Name', type: 'text', required: true, placeholder: 'e.g., Dairy & Eggs' },
    {
      name: 'storageType',
      label: 'Storage Type',
      type: 'select',
      required: true,
      options: [
        { value: 'Dry', label: 'Dry' },
        { value: 'Refrigerated', label: 'Refrigerated' },
        { value: 'Frozen', label: 'Frozen' },
      ],
    },
    { name: 'sortOrder', label: 'Sort Order', type: 'number', required: true, placeholder: 'e.g., 10', defaultValue: 10 },
  ];

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Food Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Manage food category classifications</p>
        </div>

        <AGGridTable
          rowData={data ?? []}
          columnDefs={columnDefs}
          isLoading={isLoading}
          getRowId={(data) => data.categoryId}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onRowClick={handleRowClick}
          searchPlaceholder="Search categories..."
          emptyMessage="No categories found."
        />
      </div>

      <EntityModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={modalState.mode === 'create' ? 'Add New Category' : 'Edit Category'}
        fields={fields}
        initialData={modalState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
        mode={modalState.mode}
      />
    </>
  );
}
