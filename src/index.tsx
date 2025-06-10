// src/components/PlanningPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueSetterParams } from 'ag-grid-community'; // Import ColDef and ValueSetterParams
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Or ag-theme-balham if preferred with Semantic UI

// Semantic UI React imports
import { Container, Header, Dropdown, Segment, Grid, Message, Loader } from 'semantic-ui-react';

import {
    getEngineers, getProjects, getProjectAllocationsByPeriod,
    getNonProjectAllocationsByPeriod, getMonthlyCapacity,
    createProjectAllocation, updateProjectAllocation, deleteProjectAllocation,
    createNonProjectAllocation, updateNonProjectAllocation, deleteNonProjectAllocation,
    MonthlyCapacity
} from '../api/allocationApi';
import { Engineer, Project, ProjectAllocation, NonProjectTimeAllocation } from '../models/apiModels';

// Helper for formatting date to YYYY-MM-01 for backend
const formatMonthForBackend = (year: number, month: number): string => {
    return `${year}-${String(month).padStart(2, '0')}-01`;
};

// Define Row Data structure for the grid
interface PlanningGridRow {
    engineer_id: number;
    engineer_name: string;
    line_manager: string;
    [key: string]: any; // Allows dynamic month columns (e.g., '2024-01-01_project_X', '2024-01-01_non_project_Y', '2024-01-01_totalAllocated', '2024-01-01_remainingCapacity')
}

// Define Cell Data structure for ag-Grid internal use
interface CellData {
    projectId?: number; // Only for project allocations
    nonProjectType?: string; // Only for non-project allocations
    allocationId?: number; // DB ID for existing project allocation
    nonProjectAllocationId?: number; // DB ID for existing non-project allocation
    value: number; // Man-days allocated
}

const PlanningPage: React.FC = () => {
    const gridRef = useRef<AgGridReact>(null);
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
    const [nonProjectAllocations, setNonProjectAllocations] = useState<NonProjectTimeAllocation[]>([]);
    const [monthlyCapacity, setMonthlyCapacity] = useState<MonthlyCapacity>({});

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const months = Array.from({ length: 12 }, (_, i) => i + 1); // [1, 2, ..., 12]

    // Options for year dropdown
    const yearOptions = useMemo(() => {
        return [
            { key: currentYear - 1, text: String(currentYear - 1), value: currentYear - 1 },
            { key: currentYear, text: String(currentYear), value: currentYear },
            { key: currentYear + 1, text: String(currentYear + 1), value: currentYear + 1 },
        ];
    }, [currentYear]);

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                engineersData,
                projectsData,
                projAllocationsData,
                nonProjAllocationsData,
                capacityData
            ] = await Promise.all([
                getEngineers(),
                getProjects(),
                getProjectAllocationsByPeriod(selectedYear, 1, 12),
                getNonProjectAllocationsByPeriod(selectedYear, 1, 12),
                getMonthlyCapacity(selectedYear)
            ]);

            setEngineers(engineersData);
            setProjects(projectsData);
            setProjectAllocations(projAllocationsData);
            setNonProjectAllocations(nonProjAllocationsData);
            setMonthlyCapacity(capacityData);

        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError(err.response?.data?.detail || "Failed to fetch planning data.");
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Data Transformation for Ag-Grid ---
    const rowData = useMemo(() => {
        if (!engineers.length || !projects.length || !Object.keys(monthlyCapacity).length) return []; // Check for empty capacity object too

        const projectMap = new Map(projects.map(p => [p.project_id, p.project_name]));

        // Initialize rows with engineer data
        const initialRows: PlanningGridRow[] = engineers.map(eng => ({
            engineer_id: eng.engineer_id,
            engineer_name: eng.engineer_name,
            line_manager: eng.line_manager,
        }));

        // Populate project allocations
        projectAllocations.forEach(pa => {
            const row = initialRows.find(r => r.engineer_id === pa.engineer_id);
            if (row) {
                const monthKey = pa.allocation_month; // YYYY-MM-01 format
                const projectName = projectMap.get(pa.project_id) || `Project ${pa.project_id}`;
                const columnId = `${monthKey}_project_${projectName}`;
                
                row[columnId] = {
                    projectId: pa.project_id,
                    allocationId: pa.allocation_id,
                    value: pa.man_days_allocated
                };
            }
        });

        // Populate non-project allocations
        nonProjectAllocations.forEach(npa => {
            const row = initialRows.find(r => r.engineer_id === npa.engineer_id);
            if (row) {
                const monthKey = npa.allocation_month; // YYYY-MM-01 format
                const columnId = `${monthKey}_non_project_${npa.type}`;

                row[columnId] = {
                    nonProjectType: npa.type,
                    nonProjectAllocationId: npa.non_project_allocation_id,
                    value: npa.days_allocated
                };
            }
        });

        // Calculate total allocated and remaining capacity
        initialRows.forEach(row => {
            months.forEach(monthNum => {
                const monthKey = formatMonthForBackend(selectedYear, monthNum); // e.g., "2024-01-01"
                let totalAllocatedForMonth = 0;

                // Sum up all project allocations for this engineer and month
                projects.forEach(proj => {
                    const colId = `${monthKey}_project_${proj.project_name}`;
                    if (row[colId] && typeof row[colId].value === 'number') {
                        totalAllocatedForMonth += row[colId].value;
                    }
                });

                // Sum up all non-project allocations for this engineer and month
                const nonProjectTypes = ['Holiday', 'Training', 'Admin']; // Define your non-project types as per backend
                nonProjectTypes.forEach(type => {
                    const colId = `${monthKey}_non_project_${type}`;
                    if (row[colId] && typeof row[colId].value === 'number') {
                        totalAllocatedForMonth += row[colId].value;
                    }
                });

                row[`${monthKey}_totalAllocated`] = totalAllocatedForMonth;

                const engineerCapacity = monthlyCapacity[row.engineer_id]?.[monthKey] || 0;
                row[`${monthKey}_remainingCapacity`] = engineerCapacity - totalAllocatedForMonth;
            });
        });

        return initialRows;
    }, [engineers, projects, projectAllocations, nonProjectAllocations, monthlyCapacity, selectedYear, months]);

    // --- Column Definitions ---
    const columnDefs = useMemo<ColDef<PlanningGridRow>[]>(() => { // Explicitly type ColDef<PlanningGridRow>[]
        const initialColumns: ColDef<PlanningGridRow>[] = [
            { headerName: 'Engineer', field: 'engineer_name', pinned: 'left', minWidth: 150, sortable: true, filter: true },
            { headerName: 'Manager', field: 'line_manager', pinned: 'left', minWidth: 120, sortable: true, filter: true },
        ];

        // Group columns by month
        const monthColumns: ColDef<PlanningGridRow>[] = months.map(monthNum => {
            const monthName = new Date(selectedYear, monthNum - 1).toLocaleString('default', { month: 'short' });
            const monthKey = formatMonthForBackend(selectedYear, monthNum); // e.g., "2024-01-01"

            // Sub-columns for each month: Projects, Non-Projects, Total, Remaining
            const children: ColDef<PlanningGridRow>[] = [];

            // Project columns
            projects.forEach(proj => {
                children.push({
                    headerName: proj.project_name,
                    field: `${monthKey}_project_${proj.project_name}`,
                    editable: true,
                    width: 100,
                    cellRenderer: (params: any) => params.value ? params.value.value : '', // Display only the value
                    valueGetter: (params: any) => params.data[`${monthKey}_project_${proj.project_name}`]?.value || '',
                    valueSetter: (params: ValueSetterParams<PlanningGridRow>) => { // Use ValueSetterParams
                        const newValue = params.newValue === '' ? 0 : parseFloat(params.newValue);
                        if (isNaN(newValue) || newValue < 0) return false; // Prevent Ag-Grid update if invalid

                        // Store the full CellData object, not just the value
                        params.data[`${monthKey}_project_${proj.project_name}`] = {
                            projectId: proj.project_id,
                            allocationId: params.data[`${monthKey}_project_${proj.project_name}`]?.allocationId,
                            value: newValue
                        };
                        return true;
                    }
                });
            });

            // Non-Project columns (e.g., Holiday, Training, Admin)
            const nonProjectTypes = ['Holiday', 'Training', 'Admin']; // Define your non-project types
            nonProjectTypes.forEach(type => {
                children.push({
                    headerName: type,
                    field: `${monthKey}_non_project_${type}`,
                    editable: true,
                    width: 90,
                    cellRenderer: (params: any) => params.value ? params.value.value : '', // Display only the value
                    valueGetter: (params: any) => params.data[`${monthKey}_non_project_${type}`]?.value || '',
                    valueSetter: (params: ValueSetterParams<PlanningGridRow>) => { // Use ValueSetterParams
                        const newValue = params.newValue === '' ? 0 : parseFloat(params.newValue);
                        if (isNaN(newValue) || newValue < 0) return false; // Prevent Ag-Grid update if invalid

                        params.data[`${monthKey}_non_project_${type}`] = {
                            nonProjectType: type,
                            nonProjectAllocationId: params.data[`${monthKey}_non_project_${type}`]?.nonProjectAllocationId,
                            value: newValue
                        };
                        return true;
                    }
                });
            });

            // Total Allocated and Remaining Capacity columns
            children.push(
                {
                    headerName: 'Total Allocated',
                    field: `${monthKey}_totalAllocated`,
                    width: 120,
                    cellStyle: { fontWeight: 'bold', backgroundColor: '#e0e0e0' }, // Inline style for background/bold
                    valueFormatter: (params: any) => params.value === 0 ? '' : params.value
                },
                {
                    headerName: 'Remaining',
                    field: `${monthKey}_remainingCapacity`,
                    width: 100,
                    cellStyle: (params: any) => {
                        const remaining = params.value;
                        if (remaining < 0) {
                            return { backgroundColor: '#ffcccc', fontWeight: 'bold' }; // Red for over-allocation
                        } else if (remaining === 0) {
                            return { backgroundColor: '#ccffcc' }; // Green for fully allocated
                        }
                        return null; // Default
                    },
                    valueFormatter: (params: any) => params.value === 0 ? '' : params.value
                }
            );

            return {
                headerName: monthName,
                children: children,
                marryChildren: true, // Group columns under month header
            };
        });

        return [...initialColumns, ...monthColumns];
    }, [projects, months, selectedYear]); // Depend on projects, months, selectedYear to regenerate columns

    const defaultColDef = useMemo(() => ({
        resizable: true,
        filter: true,
        sortable: true,
        enableCellChangeFlash: true, // Flash changed cells
    }), []);

    // --- Cell Editing Logic ---
    const onCellValueChanged = useCallback(async (event: any) => {
        const { colDef, data, newValue, oldValue } = event;
        const engineerId = data.engineer_id;
        const monthKey = colDef.field.substring(0, 10); // Extract YYYY-MM-01 from field name
        const value = parseFloat(newValue);

        // This check is already in valueSetter, but good to have a final check here too
        if (isNaN(value) || value < 0) {
            // No need for alert here as valueSetter already handled it visually
            return;
        }

        // Get the CellData object from the row's data
        const cellData: CellData | undefined = data[colDef.field];
        const currentAllocationId = cellData?.allocationId;
        const currentNonProjectAllocationId = cellData?.nonProjectAllocationId;

        // Determine if it's a project or non-project allocation based on field name
        const isProjectAllocation = colDef.field.includes('_project_');
        const isNonProjectAllocation = colDef.field.includes('_non_project_');

        try {
            if (isProjectAllocation) {
                const projectId = cellData?.projectId;
                if (!projectId) {
                    console.error("Project ID missing for project allocation update.");
                    alert("Error: Project ID not found for this allocation type."); // User visible alert
                    return;
                }

                if (value === 0) {
                    // If new value is 0 and an allocation exists, delete it
                    if (currentAllocationId) {
                        await deleteProjectAllocation(currentAllocationId);
                        // Update local state to reflect deletion
                        setProjectAllocations(prev => prev.filter(pa => pa.allocation_id !== currentAllocationId));
                    }
                    // If no allocation exists and value is 0, do nothing (no need to create 0 allocation)
                } else {
                    const allocationPayload = {
                        engineer_id: engineerId,
                        project_id: projectId,
                        allocation_month: monthKey,
                        man_days_allocated: value
                    };

                    if (currentAllocationId) {
                        // Update existing allocation
                        const updated = await updateProjectAllocation(currentAllocationId, allocationPayload);
                        setProjectAllocations(prev => prev.map(pa => pa.allocation_id === updated.allocation_id ? updated : pa));
                    } else {
                        // Create new allocation
                        const created = await createProjectAllocation(allocationPayload);
                        setProjectAllocations(prev => [...prev, created]);
                    }
                }
            } else if (isNonProjectAllocation) {
                const nonProjectType = cellData?.nonProjectType;
                if (!nonProjectType) {
                    console.error("Non-Project Type missing for non-project allocation update.");
                    alert("Error: Non-Project Type not found for this allocation type."); // User visible alert
                    return;
                }

                if (value === 0) {
                    // If new value is 0 and an allocation exists, delete it
                    if (currentNonProjectAllocationId) {
                        await deleteNonProjectAllocation(currentNonProjectAllocationId);
                        setNonProjectAllocations(prev => prev.filter(npa => npa.non_project_allocation_id !== currentNonProjectAllocationId));
                    }
                } else {
                    const allocationPayload = {
                        engineer_id: engineerId,
                        allocation_month: monthKey,
                        type: nonProjectType,
                        days_allocated: value
                    };

                    if (currentNonProjectAllocationId) {
                        // Update existing non-project allocation
                        const updated = await updateNonProjectAllocation(currentNonProjectAllocationId, allocationPayload);
                        setNonProjectAllocations(prev => prev.map(npa => npa.non_project_allocation_id === updated.non_project_allocation_id ? updated : npa));
                    } else {
                        // Create new non-project allocation
                        const created = await createNonProjectAllocation(allocationPayload);
                        setNonProjectAllocations(prev => [...prev, created]);
                    }
                }
            }
            // Re-fetch all data to ensure all totals/remainings are consistent after update/create/delete
            // This is robust but can be optimized with more precise state updates if performance is an issue.
            fetchData();

        } catch (err: any) {
            console.error("Error updating/creating/deleting allocation:", err);
            // Display a user-friendly error message
            alert(`Failed to update allocation: ${err.response?.data?.detail || err.message}`);
            // Revert cell value if API call fails
            event.node.setDataValue(colDef.field, oldValue); // Use oldValue from the event
        }
    }, [fetchData]); // Re-create if fetchData changes

    // --- Grid Lifecycle ---
    const onGridReady = useCallback((params: any) => {
        // You can store params.api if needed for direct grid interaction
    }, []);

    // --- Render Logic ---
    return (
        <Container style={{ marginTop: '2em' }}> {/* Semantic UI Container for basic padding */}
            <Header as='h2' dividing>
                Resource Planning for {selectedYear}
            </Header>

            <Segment basic> {/* Semantic UI Segment for grouping content */}
                <Grid>
                    <Grid.Row>
                        <Grid.Column width={4}>
                            <label htmlFor="year-select" style={{ marginRight: '0.5em' }}>Select Year:</label>
                            <Dropdown
                                placeholder='Select Year'
                                fluid
                                selection
                                options={yearOptions}
                                value={selectedYear}
                                onChange={(_e, data) => setSelectedYear(data.value as number)}
                            />
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </Segment>

            {loading && (
                <Segment>
                    <Loader active inline='centered'>Loading planning data...</Loader>
                </Segment>
            )}
            {error && (
                <Message negative>
                    <Message.Header>Error Fetching Data</Message.Header>
                    <p>{error}</p>
                </Message>
            )}
            {!loading && !error && (!engineers.length || !projects.length) && (
                <Message warning>
                    <Message.Header>Missing Data</Message.Header>
                    <p>No engineers or projects found. Please ensure they are added in their respective pages.</p>
                </Message>
            )}

            {!loading && !error && engineers.length > 0 && projects.length > 0 && (
                <div className="ag-theme-alpine" style={{ height: '70vh', width: '100%', marginTop: '1em' }}>
                    <AgGridReact
                        ref={gridRef}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        enableRangeSelection={true}
                        onGridReady={onGridReady}
                        onCellValueChanged={onCellValueChanged}
                        readOnlyEdit={true} // Allow editing only in read-only cells
                    />
                </div>
            )}
            <Message info style={{ marginTop: '1em' }}> {/* Semantic UI Message for tips */}
                <Message.Header>Usage Tips</Message.Header>
                <p>Double-click a cell to edit. Enter 0 to clear an allocation. Remaining Capacity shows how many days are left.</p>
            </Message>
        </Container>
    );
};

export default PlanningPage;
