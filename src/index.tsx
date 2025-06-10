// src/components/PlanningPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueSetterParams, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Keep this theme

// API imports
import {
    getEngineers, getProjects, getProjectAllocationsByPeriod,
    getNonProjectAllocationsByPeriod, getMonthlyCapacity,
    createProjectAllocation, updateProjectAllocation, deleteProjectAllocation,
    createNonProjectAllocation, updateNonProjectAllocation, deleteNonProjectAllocation,
    MonthlyCapacity
} from '../api/allocationApi';
// Model imports
import { Engineer, Project, ProjectAllocation, NonProjectTimeAllocation } from '../models/apiModels';

// Helper for formatting date to YYYY-MM-01 for backend
const formatMonthForBackend = (year: number, month: number): string => {
    return `${year}-${String(month).padStart(2, '0')}-01`;
};

// Helper for getting month number from YYYY-MM-01 string
const getMonthNumberFromBackendFormat = (dateString: string): number => {
    return parseInt(dateString.substring(5, 7), 10);
};

// --- Interfaces for Grid Row Data ---

// Base for cell data, containing value and optional DB IDs/types
interface AllocationCellData {
    value: number;
    allocationId?: number; // For project allocations
    nonProjectAllocationId?: number; // For non-project allocations
    projectId?: number; // For project allocations
    nonProjectType?: string; // For non-project allocations
}

// Row structure for Project Allocations Grid
interface ProjectAllocationGridRow {
    engineer_id: number;
    engineer_name: string;
    project_id: number;
    project_name: string;
    [monthKey: string]: any; // e.g., 'month_1': AllocationCellData, 'month_2': AllocationCellData, etc.
}

// Row structure for Non-Project Allocations Grid
interface NonProjectAllocationGridRow {
    engineer_id: number;
    engineer_name: string;
    non_project_type: string;
    [monthKey: string]: any; // e.g., 'month_1': AllocationCellData, 'month_2': AllocationCellData, etc.
}

// Row structure for Summary Grid
interface SummaryGridRow {
    engineer_id: number;
    engineer_name: string;
    [monthKey: string]: any; // e.g., 'month_1_total', 'month_1_remaining'
}

const PlanningPage: React.FC = () => {
    // Ag-Grid refs for potentially refreshing grids independently
    const projectGridRef = useRef<AgGridReact>(null);
    const nonProjectGridRef = useRef<AgGridReact>(null);
    const summaryGridRef = useRef<AgGridReact>(null);

    // State for fetched data
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
    const [nonProjectAllocations, setNonProjectAllocations] = useState<NonProjectTimeAllocation[]>([]);
    const [monthlyCapacity, setMonthlyCapacity] = useState<MonthlyCapacity>({});

    // UI state
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const months = Array.from({ length: 12 }, (_, i) => i + 1); // [1, 2, ..., 12]

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

    // --- Data Transformation for Project Allocations Grid ---
    const projectRowData = useMemo<ProjectAllocationGridRow[]>(() => {
        if (!engineers.length || !projects.length) return [];

        const rows: ProjectAllocationGridRow[] = [];
        engineers.forEach(engineer => {
            projects.forEach(project => {
                const row: ProjectAllocationGridRow = {
                    engineer_id: engineer.engineer_id,
                    engineer_name: engineer.engineer_name,
                    project_id: project.project_id,
                    project_name: project.project_name,
                };

                months.forEach(monthNum => {
                    const backendMonthKey = formatMonthForBackend(selectedYear, monthNum);
                    const allocation = projectAllocations.find(pa =>
                        pa.engineer_id === engineer.engineer_id &&
                        pa.project_id === project.project_id &&
                        pa.allocation_month === backendMonthKey
                    );
                    row[`month_${monthNum}`] = allocation ?
                        { value: allocation.man_days_allocated, allocationId: allocation.allocation_id, projectId: project.project_id } :
                        { value: '', projectId: project.project_id }; // Use empty string for empty cells
                });
                rows.push(row);
            });
        });
        return rows;
    }, [engineers, projects, projectAllocations, selectedYear, months]);

    // --- Data Transformation for Non-Project Allocations Grid ---
    const nonProjectTypes = ['Holiday', 'Training', 'Admin']; // Define your non-project types as per backend
    const nonProjectRowData = useMemo<NonProjectAllocationGridRow[]>(() => {
        if (!engineers.length) return [];

        const rows: NonProjectAllocationGridRow[] = [];
        engineers.forEach(engineer => {
            nonProjectTypes.forEach(type => {
                const row: NonProjectAllocationGridRow = {
                    engineer_id: engineer.engineer_id,
                    engineer_name: engineer.engineer_name,
                    non_project_type: type,
                };

                months.forEach(monthNum => {
                    const backendMonthKey = formatMonthForBackend(selectedYear, monthNum);
                    const allocation = nonProjectAllocations.find(npa =>
                        npa.engineer_id === engineer.engineer_id &&
                        npa.type === type &&
                        npa.allocation_month === backendMonthKey
                    );
                    row[`month_${monthNum}`] = allocation ?
                        { value: allocation.days_allocated, nonProjectAllocationId: allocation.non_project_allocation_id, nonProjectType: type } :
                        { value: '', nonProjectType: type }; // Use empty string for empty cells
                });
                rows.push(row);
            });
        });
        return rows;
    }, [engineers, nonProjectAllocations, selectedYear, months]);

    // --- Data Transformation for Summary Grid ---
    const summaryRowData = useMemo<SummaryGridRow[]>(() => {
        if (!engineers.length || !Object.keys(monthlyCapacity).length) return [];

        const rows: SummaryGridRow[] = [];
        engineers.forEach(engineer => {
            const row: SummaryGridRow = {
                engineer_id: engineer.engineer_id,
                engineer_name: engineer.engineer_name,
            };

            months.forEach(monthNum => {
                const backendMonthKey = formatMonthForBackend(selectedYear, monthNum);
                let totalAllocatedForMonth = 0;

                // Sum project allocations for this engineer and month
                projectAllocations.forEach(pa => {
                    if (pa.engineer_id === engineer.engineer_id && pa.allocation_month === backendMonthKey) {
                        totalAllocatedForMonth += pa.man_days_allocated;
                    }
                });

                // Sum non-project allocations for this engineer and month
                nonProjectAllocations.forEach(npa => {
                    if (npa.engineer_id === engineer.engineer_id && npa.allocation_month === backendMonthKey) {
                        totalAllocatedForMonth += npa.days_allocated;
                    }
                });

                row[`month_${monthNum}_total`] = totalAllocatedForMonth;
                const engineerCapacity = monthlyCapacity[engineer.engineer_id]?.[backendMonthKey] || 0;
                row[`month_${monthNum}_remaining`] = engineerCapacity - totalAllocatedForMonth;
            });
            rows.push(row);
        });
        return rows;
    }, [engineers, projectAllocations, nonProjectAllocations, monthlyCapacity, selectedYear, months]);

    // --- Common Column Definitions for Monthly Views ---
    const commonMonthColumns = useMemo(() => {
        return months.map(monthNum => {
            const monthName = new Date(selectedYear, monthNum - 1).toLocaleString('default', { month: 'short' });
            const fieldKey = `month_${monthNum}`;
            return {
                headerName: monthName,
                field: fieldKey,
                width: 70, // Keep columns narrow to fit all 12
                editable: true,
                cellRenderer: (params: ICellRendererParams) => params.value ? params.value.value : '',
                valueGetter: (params: any) => params.data[fieldKey]?.value || '',
                valueSetter: (params: ValueSetterParams) => {
                    const newValue = params.newValue === '' ? 0 : parseFloat(params.newValue);
                    if (isNaN(newValue) || newValue < 0) return false;

                    // Update the underlying cell data object with the new value
                    // Retain allocationId/projectId/nonProjectType from original cellData if they exist
                    const currentCellData = params.data[fieldKey] || {};
                    params.data[fieldKey] = {
                        ...currentCellData,
                        value: newValue
                    };
                    return true;
                }
            } as ColDef; // Cast to ColDef for type safety
        });
    }, [months, selectedYear]);

    // --- Project Allocations Grid Columns ---
    const projectColumnDefs = useMemo<ColDef<ProjectAllocationGridRow>[]>(() => {
        return [
            { headerName: 'Engineer', field: 'engineer_name', pinned: 'left', width: 120, sortable: true, filter: true },
            { headerName: 'Project', field: 'project_name', pinned: 'left', width: 150, sortable: true, filter: true },
            ...commonMonthColumns,
        ];
    }, [commonMonthColumns]);

    // --- Non-Project Allocations Grid Columns ---
    const nonProjectColumnDefs = useMemo<ColDef<NonProjectAllocationGridRow>[]>(() => {
        return [
            { headerName: 'Engineer', field: 'engineer_name', pinned: 'left', width: 120, sortable: true, filter: true },
            { headerName: 'Type', field: 'non_project_type', pinned: 'left', width: 120, sortable: true, filter: true },
            ...commonMonthColumns,
        ];
    }, [commonMonthColumns]);

    // --- Summary Grid Columns ---
    const summaryColumnDefs = useMemo<ColDef<SummaryGridRow>[]>(() => {
        const monthSummaryColumns: ColDef<SummaryGridRow>[] = months.map(monthNum => {
            const monthName = new Date(selectedYear, monthNum - 1).toLocaleString('default', { month: 'short' });
            return {
                headerName: monthName,
                children: [
                    {
                        headerName: 'Total',
                        field: `month_${monthNum}_total`,
                        width: 70,
                        cellStyle: { fontWeight: 'bold', backgroundColor: '#e0e0e0' },
                        valueFormatter: (params: any) => params.value === 0 ? '' : params.value
                    },
                    {
                        headerName: 'Remaining',
                        field: `month_${monthNum}_remaining`,
                        width: 70,
                        cellStyle: (params: any) => {
                            const remaining = params.value;
                            if (remaining < 0) {
                                return { backgroundColor: '#ffcccc', fontWeight: 'bold' }; // Red for over-allocation
                            } else if (remaining === 0) {
                                return { backgroundColor: '#ccffcc' }; // Green for fully allocated
                            }
                            return null;
                        },
                        valueFormatter: (params: any) => params.value === 0 ? '' : params.value
                    }
                ],
                marryChildren: true,
            };
        });

        return [
            { headerName: 'Engineer', field: 'engineer_name', pinned: 'left', width: 150, sortable: true, filter: true },
            ...monthSummaryColumns,
        ];
    }, [months, selectedYear]);


    const defaultColDef = useMemo(() => ({
        resizable: true,
        filter: true,
        sortable: true,
        enableCellChangeFlash: true,
    }), []);

    // --- Cell Editing Logic for ALL Grids ---
    const onCellValueChanged = useCallback(async (event: any) => {
        const { colDef, data, newValue, oldValue } = event;
        const engineerId = data.engineer_id;
        const monthNum = parseInt(colDef.field.replace('month_', ''), 10); // Extract month number from 'month_X'
        const allocationMonth = formatMonthForBackend(selectedYear, monthNum);
        const value = parseFloat(newValue);

        // This check is already in valueSetter, but good to have a final check here too
        if (isNaN(value) || value < 0) {
            return;
        }

        // Get the CellData object from the row's data
        const cellData: AllocationCellData | undefined = data[colDef.field];
        const currentAllocationId = cellData?.allocationId; // For Project
        const currentNonProjectAllocationId = cellData?.nonProjectAllocationId; // For Non-Project

        try {
            // Determine which type of allocation it is
            if ('project_id' in data) { // It's a Project Allocation Grid row
                const projectId = data.project_id;

                if (value === 0) {
                    if (currentAllocationId) {
                        await deleteProjectAllocation(currentAllocationId);
                        setProjectAllocations(prev => prev.filter(pa => pa.allocation_id !== currentAllocationId));
                    }
                } else {
                    const allocationPayload = {
                        engineer_id: engineerId,
                        project_id: projectId,
                        allocation_month: allocationMonth,
                        man_days_allocated: value
                    };

                    if (currentAllocationId) {
                        const updated = await updateProjectAllocation(currentAllocationId, allocationPayload);
                        setProjectAllocations(prev => prev.map(pa => pa.allocation_id === updated.allocation_id ? updated : pa));
                    } else {
                        const created = await createProjectAllocation(allocationPayload);
                        setProjectAllocations(prev => [...prev, created]);
                    }
                }
            } else if ('non_project_type' in data) { // It's a Non-Project Allocation Grid row
                const nonProjectType = data.non_project_type;

                if (value === 0) {
                    if (currentNonProjectAllocationId) {
                        await deleteNonProjectAllocation(currentNonProjectAllocationId);
                        setNonProjectAllocations(prev => prev.filter(npa => npa.non_project_allocation_id !== currentNonProjectAllocationId));
                    }
                } else {
                    const allocationPayload = {
                        engineer_id: engineerId,
                        allocation_month: allocationMonth,
                        type: nonProjectType,
                        days_allocated: value
                    };

                    if (currentNonProjectAllocationId) {
                        const updated = await updateNonProjectAllocation(currentNonProjectAllocationId, allocationPayload);
                        setNonProjectAllocations(prev => prev.map(npa => npa.non_project_allocation_id === updated.non_project_allocation_id ? updated : npa));
                    } else {
                        const created = await createNonProjectAllocation(allocationPayload);
                        setNonProjectAllocations(prev => [...prev, created]);
                    }
                }
            }
            // After any update, re-fetch all data to ensure all grids (especially summary) are consistent
            fetchData();

        } catch (err: any) {
            console.error("Error updating/creating/deleting allocation:", err);
            alert(`Failed to update allocation: ${err.response?.data?.detail || err.message}`);
            event.node.setDataValue(colDef.field, oldValue); // Revert cell value
        }
    }, [fetchData, selectedYear]);

    // --- Render Logic ---
    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ fontSize: '2em', marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                Resource Planning for {selectedYear}
            </h1>

            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                <label htmlFor="year-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Year:</label>
                <select
                    id="year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                    {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
                    Loading planning data...
                </div>
            )}
            {error && (
                <div style={{ color: 'red', textAlign: 'center', padding: '10px', border: '1px solid red', backgroundColor: '#ffe0e0', borderRadius: '5px' }}>
                    Error: {error}
                </div>
            )}
            {!loading && !error && (!engineers.length || !projects.length) && (
                <div style={{ color: '#8a6d3b', backgroundColor: '#fcf8e3', border: '1px solid #faebcc', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
                    No engineers or projects found. Please ensure they are added in their respective pages.
                </div>
            )}

            {!loading && !error && engineers.length > 0 && (
                <>
                    <h2 style={{ fontSize: '1.5em', marginBottom: '10px', marginTop: '30px' }}>Project Allocations</h2>
                    {projects.length > 0 ? (
                        <div className="ag-theme-alpine" style={{ height: '300px', width: '100%', marginBottom: '20px' }}>
                            <AgGridReact
                                ref={projectGridRef}
                                rowData={projectRowData}
                                columnDefs={projectColumnDefs}
                                defaultColDef={defaultColDef}
                                onCellValueChanged={onCellValueChanged}
                                readOnlyEdit={true}
                                // Auto height or dynamic height for a limited number of rows
                                // domLayout='autoHeight' // Consider for smaller datasets
                            />
                        </div>
                    ) : (
                        <div style={{ backgroundColor: '#f0f8ff', border: '1px solid #b0e0e6', padding: '10px', borderRadius: '5px', textAlign: 'center', marginBottom: '20px' }}>
                            No projects defined. Add projects to allocate engineers.
                        </div>
                    )}

                    <h2 style={{ fontSize: '1.5em', marginBottom: '10px', marginTop: '30px' }}>Non-Project Time Allocations</h2>
                    <div className="ag-theme-alpine" style={{ height: '300px', width: '100%', marginBottom: '20px' }}>
                        <AgGridReact
                            ref={nonProjectGridRef}
                            rowData={nonProjectRowData}
                            columnDefs={nonProjectColumnDefs}
                            defaultColDef={defaultColDef}
                            onCellValueChanged={onCellValueChanged}
                            readOnlyEdit={true}
                        />
                    </div>

                    <h2 style={{ fontSize: '1.5em', marginBottom: '10px', marginTop: '30px' }}>Monthly Summary</h2>
                    <div className="ag-theme-alpine" style={{ height: '200px', width: '100%', marginBottom: '20px' }}>
                        <AgGridReact
                            ref={summaryGridRef}
                            rowData={summaryRowData}
                            columnDefs={summaryColumnDefs}
                            defaultColDef={defaultColDef}
                            // Summary grid is read-only, no onCellValueChanged
                        />
                    </div>
                </>
            )}

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '5px', fontSize: '0.9em' }}>
                <h3>Usage Tips:</h3>
                <p>Double-click a cell in "Project Allocations" or "Non-Project Time Allocations" to edit. Enter 0 to clear an allocation. The "Monthly Summary" grid provides an overview of total allocated and remaining capacity.</p>
            </div>
        </div>
    );
};

export default PlanningPage;
