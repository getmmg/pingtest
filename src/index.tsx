import React, { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-enterprise'; // Important to include if using enterprise features

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

    const columnDefs = useMemo<ColDef<SimpleRow>[]>(() => [
        { headerName: 'ID', field: 'id', editable: false },
        { headerName: 'Name', field: 'name', editable: false },
        {
            headerName: 'Value',
            field: 'value',
            editable: true,
        }
    ], []);

    const handleCellValueChanged = useCallback((event: CellValueChangedEvent<SimpleRow>) => {
        const { data, colDef, newValue, oldValue } = event;
        console.log('✅ onCellValueChanged fired!');
        console.log(`Changed [${colDef.field}]: ${oldValue} → ${newValue}`);

        const updatedData = rowData.map(row =>
            row.id === data.id ? { ...row, [colDef.field as keyof SimpleRow]: newValue } : row
        );
        setRowData(updatedData);
    }, [rowData]);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Simple Ag-Grid Test</h2>
            <div className="ag-theme-alpine" style={{ height: '300px', width: '600px' }}>
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={{ flex: 1 }}
                    onCellValueChanged={handleCellValueChanged}
                    stopEditingWhenCellsLoseFocus={true} // important for triggering the event
                />
            </div>
        </div>
    );
};

export default SimpleGridTest;
