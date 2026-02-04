import React, { useState } from 'react';
import { useUnits, useDeleteUnits, useCreateMutation, useUpdateMutation } from '../hooks/useApi';
import { AGGridTable } from '../components/AGGridTable';
import { EntityModal, type FieldConfig } from '../components/EntityModal';
import type { ColDef } from 'ag-grid-community';

export function UnitsPage() {
  const { data, isLoading } = useUnits();
  const deleteMutation = useDeleteUnits();
  const createMutation = useCreateMutation('unit');
  const updateMutation = useUpdateMutation('unit');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    data?: any;
  }>({ isOpen: false, mode: 'create' });

  const handleDelete = (rows: any[]) => {
    if (window.confirm(`Delete ${rows.length} unit(s)? This cannot be undone.`)) {
      const ids = rows.map(r => r.unitId);
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
        { id: modalState.data.unitId, ...formData },
        { onSuccess: () => handleCloseModal() }
      );
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'unitName', headerName: 'Name', minWidth: 150, flex: 1 },
    { field: 'unitAbbreviation', headerName: 'Abbrev', width: 100 },
    { field: 'unitType', headerName: 'Type', minWidth: 120 },
    { field: 'conversionToBase', headerName: 'Conversion', width: 120, type: 'numericColumn' },
    { field: 'baseUnit', headerName: 'Base Unit', minWidth: 120 },
  ];

  const fields: FieldConfig[] = [
    { name: 'unitName', label: 'Unit Name', type: 'text', required: true, placeholder: 'e.g., Pound' },
    { name: 'unitAbbreviation', label: 'Abbreviation', type: 'text', required: true, placeholder: 'e.g., lb' },
    {
      name: 'unitType',
      label: 'Unit Type',
      type: 'select',
      required: true,
      options: [
        { value: 'Weight', label: 'Weight' },
        { value: 'Volume', label: 'Volume' },
        { value: 'Count', label: 'Count' },
        { value: 'Each', label: 'Each' },
      ],
    },
    { name: 'conversionToBase', label: 'Conversion to Base', type: 'number', placeholder: 'e.g., 16 (oz per lb)' },
    { name: 'baseUnit', label: 'Base Unit', type: 'text', placeholder: 'e.g., lb' },
  ];

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Units of Measure</h1>
          <p className="text-sm text-gray-500 mt-1">Manage measurement units</p>
        </div>

        <AGGridTable
          rowData={data ?? []}
          columnDefs={columnDefs}
          isLoading={isLoading}
          getRowId={(data) => data.unitId}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onRowClick={handleRowClick}
          searchPlaceholder="Search units..."
          emptyMessage="No units found."
        />
      </div>

      <EntityModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={modalState.mode === 'create' ? 'Add New Unit' : 'Edit Unit'}
        fields={fields}
        initialData={modalState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
        mode={modalState.mode}
      />
    </>
  );
}
