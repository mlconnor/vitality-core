/**
 * AGGridTable Component
 * 
 * A reusable AG Grid wrapper for spreadsheet-like data management.
 * Supports sorting, filtering, inline editing, and bulk operations.
 * 
 * AG Grid Community features used:
 * - Cell editing (text, select, number, date)
 * - Sorting & filtering
 * - Row selection
 * - Column resizing & reordering
 * - Copy/paste
 * - Keyboard navigation
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { 
  ColDef, 
  GridReadyEvent, 
  CellValueChangedEvent,
  SelectionChangedEvent,
  GridApi,
  RowSelectionOptions,
} from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Plus, Trash2, Download, Search } from 'lucide-react';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Custom Vitality theme - elegant green accent with clean modern styling
const vitalityTheme = themeQuartz.withParams({
  // Colors matching Vitality app
  accentColor: '#22c55e',           // Green-500 accent
  backgroundColor: '#ffffff',
  foregroundColor: '#1f2937',        // Gray-800
  borderColor: '#e5e7eb',            // Gray-200
  borderRadius: 8,
  
  // Header styling
  headerBackgroundColor: '#f9fafb',  // Gray-50
  headerTextColor: '#374151',        // Gray-700
  headerFontWeight: 600,
  headerFontSize: 13,
  
  // Row styling
  rowHoverColor: '#f0fdf4',          // Green-50
  selectedRowBackgroundColor: '#dcfce7', // Green-100
  oddRowBackgroundColor: '#ffffff',
  
  // Cell styling  
  cellTextColor: '#1f2937',          // Gray-800
  fontSize: 14,
  
  // Spacing
  cellHorizontalPadding: 16,
  headerHeight: 48,
  rowHeight: 52,
});

// Default column settings
const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  editable: false,  // Editing disabled
  minWidth: 100,
  flex: 1,
};

interface AGGridTableProps<T> {
  /** Row data to display */
  rowData: T[];
  /** Column definitions */
  columnDefs: ColDef<T>[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when cell value changes */
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => void;
  /** Callback to add new row */
  onAdd?: () => void;
  /** Callback to delete selected rows */
  onDelete?: (rows: T[]) => void;
  /** Callback when row is clicked (for viewing/editing) */
  onRowClick?: (row: T) => void;
  /** Unique row ID field */
  getRowId?: (data: T) => string;
  /** Custom height (default: 600px) */
  height?: number | string;
  /** Enable row selection */
  enableSelection?: boolean;
  /** Quick filter placeholder */
  searchPlaceholder?: string;
  /** Message when no data */
  emptyMessage?: string;
}

export function AGGridTable<T extends Record<string, any>>({
  rowData,
  columnDefs,
  isLoading = false,
  onCellValueChanged,
  onAdd,
  onDelete,
  onRowClick,
  getRowId,
  height = 600,
  enableSelection = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data found',
}: AGGridTableProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const [quickFilterText, setQuickFilterText] = React.useState('');
  const [selectedRows, setSelectedRows] = React.useState<T[]>([]);

  // Handle row double-click (for editing)
  const handleRowDoubleClicked = useCallback((event: any) => {
    if (onRowClick && event.data) {
      onRowClick(event.data);
    }
  }, [onRowClick]);

  // Row selection configuration (v32.2+ API)
  const rowSelection = useMemo<RowSelectionOptions | undefined>(() => {
    if (!enableSelection) return undefined;
    return {
      mode: 'multiRow',
      headerCheckbox: true,
      checkboxes: true,
      enableClickSelection: false,
      copySelectedRows: true,
    };
  }, [enableSelection]);

  // Handle grid ready
  const onGridReady = useCallback((event: GridReadyEvent<T>) => {
    // Auto-size columns on first render
    event.api.sizeColumnsToFit();
  }, []);

  // Handle selection changes
  const onSelectionChanged = useCallback((event: SelectionChangedEvent<T>) => {
    const selected = event.api.getSelectedRows();
    setSelectedRows(selected);
  }, []);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `export-${new Date().toISOString().split('T')[0]}.csv`,
    });
  }, []);

  // Row ID getter
  const getRowIdCallback = useCallback((params: { data: T }) => {
    if (getRowId) return getRowId(params.data);
    // Fallback: use first column value or index
    const firstKey = Object.keys(params.data)[0];
    return String(params.data[firstKey] ?? Math.random());
  }, [getRowId]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full px-4 py-2.5 pl-11 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                       focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white
                       transition-all duration-200 placeholder:text-gray-400"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Export */}
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 
                       bg-gray-50 border border-gray-200 rounded-lg 
                       hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300
                       transition-all duration-200"
            title="Export to CSV"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>

          {/* Delete selected */}
          {onDelete && selectedRows.length > 0 && (
            <button
              onClick={() => {
                onDelete(selectedRows);
                gridRef.current?.api.deselectAll();
              }}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-white 
                         bg-red-500 rounded-lg hover:bg-red-600 
                         shadow-sm shadow-red-500/25 transition-all duration-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedRows.length})
            </button>
          )}

          {/* Add new */}
          {onAdd && (
            <button
              onClick={onAdd}
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white 
                         bg-green-500 rounded-lg hover:bg-green-600 
                         shadow-sm shadow-green-500/25 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </button>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div 
        className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <AgGridReact<T>
          ref={gridRef}
          theme={vitalityTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilterText}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          onSelectionChanged={onSelectionChanged}
          onRowDoubleClicked={handleRowDoubleClicked}
          getRowId={getRowIdCallback}
          rowSelection={rowSelection}
          animateRows={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          loading={isLoading}
          overlayLoadingTemplate='<div class="flex items-center justify-center h-full"><div class="text-gray-500">Loading...</div></div>'
          overlayNoRowsTemplate={`<div class="flex items-center justify-center h-full"><div class="text-gray-400">${emptyMessage}</div></div>`}
          // Cell selection (v32.2+ API)
          cellSelection={false}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 px-1">
        <span>
          <span className="font-medium text-gray-700">{rowData.length}</span> rows total
          {selectedRows.length > 0 && (
            <span className="ml-3 text-green-600 font-medium">
              {selectedRows.length} selected
            </span>
          )}
        </span>
        {onRowClick && (
          <span className="text-xs text-gray-400">
            Double-click a row to view/edit
          </span>
        )}
      </div>
    </div>
  );
}

export default AGGridTable;

