// src/components/SimpleGridTest.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface SimpleRow {
    id: number;
    name: string;
    value: number;
}

const SimpleGridTest: React.FC = () => {
    const [rowData, setRowData] = useState<SimpleRow[]>([
        { id: 1, name: 'Item A', value: 10 },
        { id: 2, name: 'Item B', value: 20 },
        { id: 3, name: 'Item C', value: 30 },
    ]);

    const columnDefs = useMemo<ColDef<SimpleRow>[]>(() => {
        return [
            { headerName: 'ID', field: 'id', editable: false },
            { headerName: 'Name', field: 'name', editable: false },
            {
                headerName: 'Value',
                field: 'value',
                editable: true, // Make this column editable
                type: 'numericColumn',
                // ValueSetter for direct logging
                valueSetter: (params) => {
                    const newValue = parseFloat(params.newValue);
                    if (isNaN(newValue)) {
                        console.warn("SIMPLE GRID DEBUG: Invalid input, not setting value.");
                        return false;
                    }
                    params.data.value = newValue; // Update the data directly
                    console.log(`SIMPLE GRID DEBUG: valueSetter called. Field: ${params.colDef.field}, New Value: ${newValue}`);
                    return true;
                }
            },
        ];
    }, []);

    // This is the key event handler we're testing
    const handleCellValueChanged = useCallback((event: CellValueChangedEvent<SimpleRow>) => {
        const { data, colDef, newValue, oldValue } = event;
        console.log(`SIMPLE GRID DEBUG: onCellValueChanged triggered!`);
        console.log(`  Row Data:`, data);
        console.log(`  Column: ${colDef.field}, Old Value: ${oldValue}, New Value: ${newValue}`);

        // In a real app, you'd send this to your API
        alert(`Value for ${data?.name} changed from ${oldValue} to ${newValue}`);

        // For this simple test, we'll just update local state
        // In PlanningPage, you re-fetch data, which is better for complex scenarios.
        const updatedRowData = rowData.map(row =>
            row.id === data?.id ? { ...row, value: newValue } : row
        );
        setRowData(updatedRowData);

    }, [rowData]); // rowData is a dependency to ensure correct state updates

    return (
        <div style={{ padding: '20px' }}>
            <h2>Simple Ag-Grid Test</h2>
            <p>Double-click a 'Value' cell, enter a number, and press ENTER or click away.</p>
            <div className="ag-theme-alpine" style={{ height: '200px', width: '400px' }}>
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    onCellValueChanged={handleCellValueChanged} // Attach the handler
                    readOnlyEdit={false} // Ensure editing is enabled
                />
            </div>
        </div>
    );
};

export default SimpleGridTest;
