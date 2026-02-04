/**
 * DataTable Component
 * 
 * A reusable spreadsheet-like table component using TanStack Table.
 * Supports sorting, filtering, pagination, and inline editing.
 */

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Plus, Trash2 } from 'lucide-react';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  isLoading?: boolean;
  onAdd?: () => void;
  onDelete?: (rows: T[]) => void;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function DataTable<T extends { [key: string]: any }>({
  data,
  columns,
  isLoading = false,
  onAdd,
  onDelete,
  onRowClick,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

  // Add selection column if onDelete is provided
  const tableColumns = useMemo(() => {
    if (!onDelete) return columns;
    
    const selectColumn: ColumnDef<T, any> = {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
    };
    
    return [selectColumn, ...columns];
  }, [columns, onDelete]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: !!onDelete,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows.map(r => r.original);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onDelete && selectedRows.length > 0 && (
            <button
              onClick={() => {
                onDelete(selectedRows);
                setRowSelection({});
              }}
              className="btn-danger"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedRows.length})
            </button>
          )}
          {onAdd && (
            <button onClick={onAdd} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-2 ${
                            header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-gray-400">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronsUpDown className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={tableColumns.length} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="px-4 py-8 text-center text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${
                      row.getIsSelected() ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.length > 50 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                data.length
              )}{' '}
              of {data.length} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

