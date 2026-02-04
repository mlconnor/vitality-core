import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes, useDeleteRecipes, useCreateMutation, useUpdateMutation, useUnits } from '../hooks/useApi';
import { AGGridTable } from '../components/AGGridTable';
import { EntityModal, type FieldConfig } from '../components/EntityModal';
import type { ColDef } from 'ag-grid-community';

// Status badge renderer
const StatusRenderer = (params: any) => {
  const value = params.value;
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
    Draft: 'bg-yellow-100 text-yellow-800',
    Archived: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
      {value}
    </span>
  );
};

// Currency formatter
const currencyFormatter = (params: any) => {
  const value = params.value;
  return value != null ? `$${value.toFixed(2)}` : '-';
};

export function RecipesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useRecipes();
  const { data: units } = useUnits();
  const deleteMutation = useDeleteRecipes();
  const createMutation = useCreateMutation('recipe');
  const updateMutation = useUpdateMutation('recipe');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    data?: any;
  }>({ isOpen: false, mode: 'create' });

  const handleDelete = (rows: any[]) => {
    if (window.confirm(`Delete ${rows.length} recipe(s)? This cannot be undone.`)) {
      const ids = rows.map(r => r.recipeId);
      deleteMutation.mutate(ids);
    }
  };

  const handleAdd = () => {
    navigate('/recipes/new');
  };

  const handleRowClick = (row: any) => {
    navigate(`/recipes/${row.recipeId}`);
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
        { id: modalState.data.recipeId, ...formData },
        { onSuccess: () => handleCloseModal() }
      );
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'recipeName', headerName: 'Name', minWidth: 180, flex: 1 },
    { field: 'category', headerName: 'Category', minWidth: 120 },
    { field: 'cuisineType', headerName: 'Cuisine', minWidth: 110 },
    { field: 'yieldQuantity', headerName: 'Yield', width: 90, type: 'numericColumn' },
    { field: 'foodCostPerPortion', headerName: 'Cost/Portion', width: 120, valueFormatter: currencyFormatter, type: 'numericColumn' },
    { field: 'status', headerName: 'Status', width: 110, cellRenderer: StatusRenderer },
  ];

  const fields: FieldConfig[] = [
    { name: 'recipeName', label: 'Recipe Name', type: 'text', required: true, placeholder: 'e.g., Chicken Noodle Soup' },
    { name: 'recipeCode', label: 'Recipe Code', type: 'text', placeholder: 'Optional internal code' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: [
        { value: 'Entrée', label: 'Entrée' },
        { value: 'Starch', label: 'Starch' },
        { value: 'Vegetable', label: 'Vegetable' },
        { value: 'Salad', label: 'Salad' },
        { value: 'Soup', label: 'Soup' },
        { value: 'Bread', label: 'Bread' },
        { value: 'Dessert', label: 'Dessert' },
        { value: 'Sauce', label: 'Sauce' },
        { value: 'Beverage', label: 'Beverage' },
        { value: 'Breakfast', label: 'Breakfast' },
        { value: 'Appetizer', label: 'Appetizer' },
        { value: 'Condiment', label: 'Condiment' },
      ],
    },
    {
      name: 'cuisineType',
      label: 'Cuisine',
      type: 'select',
      options: [
        { value: 'American', label: 'American' },
        { value: 'Mexican', label: 'Mexican' },
        { value: 'Asian', label: 'Asian' },
        { value: 'Italian', label: 'Italian' },
        { value: 'Mediterranean', label: 'Mediterranean' },
        { value: 'Indian', label: 'Indian' },
        { value: 'French', label: 'French' },
        { value: 'Southern', label: 'Southern' },
        { value: 'Cajun', label: 'Cajun' },
        { value: 'Caribbean', label: 'Caribbean' },
        { value: 'Middle Eastern', label: 'Middle Eastern' },
        { value: 'Other', label: 'Other' },
      ],
    },
    { name: 'yieldQuantity', label: 'Yield Quantity', type: 'number', required: true, placeholder: 'e.g., 25' },
    {
      name: 'yieldUnit',
      label: 'Yield Unit',
      type: 'select',
      required: true,
      options: (units ?? []).map((u: any) => ({ value: u.unitId, label: `${u.unitName} (${u.unitAbbreviation})` })),
    },
    { name: 'portionSize', label: 'Portion Size', type: 'text', required: true, placeholder: 'e.g., 8 oz' },
    { name: 'portionUtensil', label: 'Portion Utensil', type: 'text', placeholder: "e.g., #16 scoop" },
    { name: 'prepTimeMinutes', label: 'Prep Time (minutes)', type: 'number', placeholder: 'e.g., 15' },
    { name: 'cookTimeMinutes', label: 'Cook Time (minutes)', type: 'number', placeholder: 'e.g., 45' },
    { name: 'cookingTempF', label: 'Cooking Temp (F)', type: 'number', placeholder: 'e.g., 350' },
    {
      name: 'cookingMethod',
      label: 'Cooking Method',
      type: 'select',
      options: [
        { value: 'Bake', label: 'Bake' },
        { value: 'Roast', label: 'Roast' },
        { value: 'Grill', label: 'Grill' },
        { value: 'Steam', label: 'Steam' },
        { value: 'Sauté', label: 'Sauté' },
        { value: 'Braise', label: 'Braise' },
        { value: 'Fry', label: 'Fry' },
        { value: 'Deep Fry', label: 'Deep Fry' },
        { value: 'Simmer', label: 'Simmer' },
        { value: 'Boil', label: 'Boil' },
        { value: 'Poach', label: 'Poach' },
        { value: 'No-Cook', label: 'No-Cook' },
      ],
    },
    { name: 'equipmentRequired', label: 'Equipment Required', type: 'textarea', placeholder: 'Optional equipment notes...' },
    { name: 'panSize', label: 'Pan Size', type: 'text', placeholder: 'Optional' },
    { name: 'pansPerBatch', label: 'Pans per Batch', type: 'number', placeholder: 'Optional' },
    { name: 'weightPerPan', label: 'Weight per Pan', type: 'text', placeholder: 'Optional' },
    { name: 'haccpCriticalLimits', label: 'HACCP Critical Limits', type: 'textarea', placeholder: 'Optional food safety notes...' },
    { name: 'holdTempF', label: 'Hold Temp (F)', type: 'number', placeholder: 'Optional' },
    { name: 'maxHoldTimeHours', label: 'Max Hold Time (hours)', type: 'number', placeholder: 'Optional' },
    { name: 'variations', label: 'Variations', type: 'textarea', placeholder: 'Optional' },
    { name: 'source', label: 'Source', type: 'text', placeholder: 'Optional' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' },
  ];

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="text-sm text-gray-500 mt-1">Manage standardized recipes</p>
        </div>

        <AGGridTable
          rowData={data ?? []}
          columnDefs={columnDefs}
          isLoading={isLoading}
          getRowId={(data) => data.recipeId}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onRowClick={handleRowClick}
          searchPlaceholder="Search recipes..."
          emptyMessage="No recipes found."
        />
      </div>

      <EntityModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={modalState.mode === 'create' ? 'Add New Recipe' : 'Edit Recipe'}
        fields={fields}
        initialData={modalState.data}
        isLoading={createMutation.isPending || updateMutation.isPending}
        mode={modalState.mode}
      />
    </>
  );
}
