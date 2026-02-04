import React, { useState } from 'react';
import { useAllergens, useDeleteAllergens, useCreateMutation, useUpdateMutation } from '../hooks/useApi';
import { AGGridTable } from '../components/AGGridTable';
import { EntityModal, type FieldConfig } from '../components/EntityModal';
import type { ColDef } from 'ag-grid-community';

// Boolean renderer
const BooleanRenderer = (params: any) => {
  return params.value ? '✓' : '';
};

export function AllergensPage() {
  const { data, isLoading } = useAllergens();
  const deleteMutation = useDeleteAllergens();
  const createMutation = useCreateMutation('allergen');
  const updateMutation = useUpdateMutation('allergen');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    data?: any;
  }>({ isOpen: false, mode: 'create' });

  const handleDelete = (rows: any[]) => {
    if (window.confirm(`Delete ${rows.length} allergen(s)? This cannot be undone.`)) {
      const ids = rows.map(r => r.allergenId);
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
        { id: modalState.data.allergenId, ...formData },
        { onSuccess: () => handleCloseModal() }
      );
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'allergenName', headerName: 'Name', minWidth: 150 },
    { field: 'isMajorAllergen', headerName: 'Major', width: 90, cellRenderer: BooleanRenderer },
    { field: 'commonSources', headerName: 'Common Sources', minWidth: 250, flex: 1 },
  ];

  const fields: FieldConfig[] = [
    { name: 'allergenName', label: 'Allergen Name', type: 'text', required: true, placeholder: 'e.g., Milk' },
    { name: 'isMajorAllergen', label: 'Major Allergen', type: 'checkbox', placeholder: 'FDA major allergen (Big 9)' },
    { name: 'commonSources', label: 'Common Sources', type: 'textarea', placeholder: 'Foods commonly containing this allergen...' },
    { name: 'crossContactRisk', label: 'Cross-Contact Risk', type: 'textarea', placeholder: 'Notes about cross-contact risk...' },
  ];

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Allergens</h1>
          <p className="text-sm text-gray-500 mt-1">Manage allergen definitions</p>
        </div>

        <AGGridTable
          rowData={data ?? []}
          columnDefs={columnDefs}
          isLoading={isLoading}
          getRowId={(data) => data.allergenId}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onRowClick={handleRowClick}
          searchPlaceholder="Search allergens..."
          emptyMessage="No allergens found."
        />
      </div>

      <EntityModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={modalState.mode === 'create' ? 'Add New Allergen' : 'Edit Allergen'}
        fields={fields}
        initialData={modalState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
        mode={modalState.mode}
      />
    </>
  );
}
