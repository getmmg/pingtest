// src/components/PlanningPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueSetterParams, ICellRendererParams, CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-enterprise'; // Required for Row Grouping, which might be implicitly used or just good practice

// API imports
import {
    getEngineers, getProjects, getProjectAllocationsByPeriod,
    getNonProjectAllocationsByPeriod,
    createProjectAllocation, updateProjectAllocation, deleteProjectAllocation,
    createNonProjectAllocation, updateNonProjectAllocation, deleteNonProjectAllocation,
} from '../api/allocationApi';
// Model imports
import { Engineer, Project, ProjectAllocation, NonProjectTimeAllocation } from '../models/apiModels';

// Helper for formatting date to YYYY-MM-01 for backend (and internal use)
const formatMonthForBackend = (year: number, month: number): string => {
    return `${year}-${String(month).padStart(2, '0')}-01`;
};

// --- Interfaces for Grid Row Data ---
interface AllocationCellData {
    value: number;
    allocationId?: number; // For ProjectAllocation
    nonProjectAllocationId?: number; // For NonProjectTimeAllocation
    projectId?: number; // For ProjectAllocation (helpful for context)
    nonProjectType?: string; // For NonProjectTimeAllocation (helpful for context)
}

interface ProjectAllocationGridRow {
    engineer_id: number;
    engineer_name: string;
    project_id: number;
    project_name: string;
    // IMPORTANT FIX: Removed the index signature `[monthKey: string]: AllocationCellData;`
    // TypeScript will infer the types of month_X properties from usage.
}

interface NonProjectAllocationGridRow {
    engineer_id: number;
    engineer_name: string;
    non_project_type: string;
    // IMPORTANT FIX: Removed the index signature `[monthKey: string]: AllocationCellData;`
    // TypeScript will infer the types of month_X properties from usage.
}

interface SummaryGridRow {
    engineer_id: number;
    engineer_name: string;
    [monthKey: string]: number | string; // This index signature is correct here as all dynamic keys are numbers/strings
}

// Define the type for the frontend generated capacity
type FrontendMonthlyCapacity = {
    [engineerId: number]: {
        [monthKey: string]: number; // 'YYYY-MM-DD': total_days_in_month
    }
}

const PlanningPage: React.FC = () => {
    const projectGridRef = useRef<AgGridReact>(null);
    const nonProjectGridRef = useRef<AgGridReact>(null);
    const summaryGridRef = useRef<AgGridReact>(null);

    // State for fetched data
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
    const [nonProjectAllocations, setNonProjectAllocations] = useState<NonProjectTimeAllocation[]>([]);
    // monthlyCapacity state has been removed as it's now generated on frontend

    // UI state
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const months = Array.from({ length: 12 }, (_, i) => i + 1); // [1, 2, ..., 12]

    // --- Frontend Capacity Generation ---
    // Generates total days for each month for the selected year, per engineer.
    // This assumes all engineers have the same capacity based on calendar days.
    const frontendMonthlyCapacity: FrontendMonthlyCapacity = useMemo(() => {
        console.log("DEBUG: Generating frontendMonthlyCapacity...");
        const capacity: FrontendMonthlyCapacity = {};
        if (!engineers.length) {
            console.log("DEBUG: No engineers available to generate capacity for.");
            return {}; // Return empty if no engineers
        }

        engineers.forEach(engineer => {
            capacity[engineer.engineer_id] = {};
            months.forEach(monthNum => {
                const backendMonthKey = formatMonthForBackend(selectedYear, monthNum);
                // Get the last day of the current month (day 0 of the next month)
                const lastDayOfMonth = new Date(selectedYear, monthNum, 0);
                const daysInMonth = lastDayOfMonth.getDate(); // Get the day number, which is total days

                capacity[engineer.engineer_id][backendMonthKey] = daysInMonth;
            });
        });
        console.log("DEBUG: Generated Frontend Monthly Capacity:", capacity);
        return capacity;
    }, [selectedYear, months, engineers]); // Re-runs if year, months array, or engineers change

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        console.log(`DEBUG: Fetching data for year ${selectedYear}...`);
        try {
            // Using Promise.all to fetch data concurrently
            const [
                engineersData,
                projectsData,
                projAllocationsData,
                nonProjAllocationsData,
            ] = await Promise.all([
                getEngineers(),
                getProjects(),
                getProjectAllocationsByPeriod(selectedYear, 1, 12),
                getNonProjectAllocationsByPeriod(selectedYear, 1, 12),
            ]);

            setEngineers(engineersData);
            setProjects(projectsData);
            setProjectAllocations(projAllocationsData);
            setNonProjectAllocations(nonProjAllocationsData);

            console.log("DEBUG: Fetched Engineers:", engineersData);
            console.log("DEBUG: Fetched Projects:", projectsData);
            console.log("DEBUG: Fetched Project Allocations:", projAllocationsData);
            console.log("DEBUG: Fetched Non-Project Allocations:", nonProjAllocationsData);

        } catch (err: any) {
            console.error("ERROR: Failed to fetch planning data:", err);
            setError(err.response?.data?.detail || "Failed to fetch planning data. Check backend connection and data.");
        } finally {
            setLoading(false);
            console.log("DEBUG: Data fetching complete.");
        }
    }, [selectedYear]); // Re-fetch when selectedYear changes

    // Initial data fetch on component mount and on year change
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Data Transformation for Project Allocations Grid ---
    const projectRowData = useMemo<ProjectAllocationGridRow[]>(() => {
        console.log("DEBUG: Generating Project Row Data...");
        if (!engineers.length || !projects.length) {
            console.log("DEBUG: Project Row Data skipped: No engineers or projects available.");
            return [];
        }

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
                        { value: 0, projectId: project.project_id }; // Ensure value is 0 for unallocated
                });
                rows.push(row);
            });
        });
        console.log("DEBUG: Generated Project Row Data:", rows);
        return rows;
    }, [engineers, projects, projectAllocations, selectedYear, months]); // Dependencies

    // --- Data Transformation for Non-Project Allocations Grid ---
    const nonProjectTypes = ['Holiday', 'Training', 'Admin']; // Define standard non-project types
    const nonProjectRowData = useMemo<NonProjectAllocationGridRow[]>(() => {
        console.log("DEBUG: Generating Non-Project Row Data...");
        if (!engineers.length) {
            console.log("DEBUG: Non-Project Row Data skipped: No engineers available.");
            return [];
        }

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
                        { value: 0, nonProjectType: type }; // Ensure value is 0 for unallocated
                });
                rows.push(row);
            });
        });
        console.log("DEBUG: Generated Non-Project Row Data:", rows);
        return rows;
    }, [engineers, nonProjectAllocations, selectedYear, months]); // Dependencies

    // --- Data Transformation for Summary Grid ---
    const summaryRowData = useMemo<SummaryGridRow[]>(() => {
        console.log("DEBUG: Generating Summary Row Data...");
        // Ensure engineers and frontendMonthlyCapacity are loaded before generating
        if (!engineers.length || Object.keys(frontendMonthlyCapacity).length === 0) {
            console.log("DEBUG: Summary Row Data skipped: Engineers or frontendMonthlyCapacity missing.");
            return [];
        }

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
                        // FIX: Corrected typo here from screenshot
                        totalAllocatedForMonth += npa.days_allocated;
                    }
                });

                row[`month_${monthNum}_total`] = totalAllocatedForMonth;

                // Get engineer capacity from frontend-generated data
                const engineerCapacity = frontendMonthlyCapacity[engineer.engineer_id]?.[backendMonthKey] || 0;
                // console.log(`DEBUG: Capacity for ${engineer.engineer_name} in ${backendMonthKey}: ${engineerCapacity}`); // More granular debug
                row[`month_${monthNum}_remaining`] = engineerCapacity - totalAllocatedForMonth;
            });
            rows.push(row);
        });
        console.log("DEBUG: Generated Summary Row Data:", rows);
        return rows;
    }, [engineers, projectAllocations, nonProjectAllocations, frontendMonthlyCapacity, selectedYear, months]); // Dependencies

    // --- Cell Value Changed Handler (for Project and Non-Project grids) ---
    const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
        const { data, colDef, newValue, oldValue } = event;
        const field = colDef.field;

        console.log(`DEBUG: onCellValueChanged triggered for field: ${field}, newValue: ${newValue}, oldValue: ${oldValue}`);

        if (field && field.startsWith('month_')) {
            const monthNum = parseInt(field.split('_')[1]);
            const backendMonthKey = formatMonthForBackend(selectedYear, monthNum);
            // Ensure newValue is a valid number; convert empty string/null to 0
            const parsedNewValue = newValue === '' || newValue === null ? 0 : parseFloat(newValue);

            if (isNaN(parsedNewValue) || parsedNewValue < 0) {
                alert('Allocation must be a non-negative number.');
                // Revert the cell visually if validation fails
                projectGridRef.current?.api.undoCellEditing();
                nonProjectGridRef.current?.api.undoCellEditing();
                console.warn(`VALIDATION FAILED: Invalid new value: ${newValue}`);
                return;
            }

            try {
                if ('project_id' in data) { // This is a Project Allocation row
                    const { engineer_id, project_id } = data;
                    const currentCellData: AllocationCellData = data[field];
                    const currentAllocationId = currentCellData?.allocationId;

                    const allocationPayload: ProjectAllocation = {
                        allocation_id: currentAllocationId || undefined, // Use existing ID or undefined for new
                        engineer_id: engineer_id,
                        project_id: project_id,
                        allocation_month: backendMonthKey,
                        man_days_allocated: parsedNewValue
                    };
                    console.log("DEBUG: Project Allocation Payload:", allocationPayload);

                    if (parsedNewValue > 0) {
                        if (currentAllocationId) {
                            // Update existing allocation
                            console.log(`DEBUG: Updating Project Allocation ID: ${currentAllocationId}`);
                            await updateProjectAllocation(allocationPayload);
                            console.log("DEBUG: Project Allocation updated successfully.");
                        } else {
                            // Create new allocation
                            console.log("DEBUG: Creating new Project Allocation.");
                            const newAllocation = await createProjectAllocation(allocationPayload);
                            // Important: Update the local Ag-Grid rowData with the new ID from the backend
                            // This ensures subsequent edits of this *new* allocation use the correct ID.
                            data[field] = {
                                ...currentCellData, // Retain project ID
                                value: newAllocation.man_days_allocated, // Ensure value is updated
                                allocationId: newAllocation.allocation_id
                            };
                            // Apply the transaction to update grid's internal rowData
                            projectGridRef.current?.api.applyTransaction({ update: [data] });
                            console.log("DEBUG: New Project Allocation created:", newAllocation);
                        }
                    } else if (currentAllocationId) {
                        // Delete existing allocation if new value is 0
                        console.log(`DEBUG: Deleting Project Allocation ID: ${currentAllocationId}`);
                        await deleteProjectAllocation(currentAllocationId);
                        // Important: Clear allocationId and set value to 0 in local Ag-Grid rowData
                        data[field] = {
                            ...currentCellData, // Retain project ID
                            value: 0, // Explicitly set value to 0
                            allocationId: undefined // Remove ID
                        };
                        projectGridRef.current?.api.applyTransaction({ update: [data] });
                        console.log("DEBUG: Project Allocation deleted successfully.");
                    } else {
                        // Value is 0 and no existing allocation - nothing to do for backend
                        console.log("DEBUG: Value is 0 and no existing Project Allocation. No backend action required.");
                    }

                } else if ('non_project_type' in data) { // This is a Non-Project Allocation row
                    const { engineer_id, non_project_type } = data;
                    const currentCellData: AllocationCellData = data[field];
                    const currentNonProjectAllocationId = currentCellData?.nonProjectAllocationId;

                    const allocationPayload: NonProjectTimeAllocation = {
                        non_project_allocation_id: currentNonProjectAllocationId || undefined, // Use existing ID or undefined for new
                        engineer_id: engineer_id,
                        allocation_month: backendMonthKey,
                        type: non_project_type,
                        days_allocated: parsedNewValue
                    };
                    console.log("DEBUG: Non-Project Allocation Payload:", allocationPayload);

                    if (parsedNewValue > 0) {
                        if (currentNonProjectAllocationId) {
                            // Update existing non-project allocation
                            console.log(`DEBUG: Updating Non-Project Allocation ID: ${currentNonProjectAllocationId}`);
                            await updateNonProjectAllocation(allocationPayload);
                            console.log("DEBUG: Non-Project Allocation updated successfully.");
                        } else {
                            // Create new non-project allocation
                            console.log("DEBUG: Creating new Non-Project Allocation.");
                            const newAllocation = await createNonProjectAllocation(allocationPayload);
                            // Update local Ag-Grid rowData with the new ID
                            data[field] = {
                                ...currentCellData, // Retain type
                                value: newAllocation.days_allocated, // Ensure value is updated
                                nonProjectAllocationId: newAllocation.non_project_allocation_id
                            };
                            nonProjectGridRef.current?.api.applyTransaction({ update: [data] });
                            console.log("DEBUG: New Non-Project Allocation created:", newAllocation);
                        }
                    } else if (currentNonProjectAllocationId) {
                        // Delete existing non-project allocation if new value is 0
                        console.log(`DEBUG: Deleting Non-Project Allocation ID: ${currentNonProjectAllocationId}`);
                        await deleteNonProjectAllocation(currentNonProjectAllocationId);
                        // Clear nonProjectAllocationId and set value to 0 in local Ag-Grid rowData
                        data[field] = {
                            ...currentCellData, // Retain type
                            value: 0, // Explicitly set value to 0
                            nonProjectAllocationId: undefined // Remove ID
                        };
                        nonProjectGridRef.current?.api.applyTransaction({ update: [data] });
                        console.log("DEBUG: Non-Project Allocation deleted successfully.");
                    } else {
                        // Value is 0 and no existing allocation - nothing to do for backend
                        console.log("DEBUG: Value is 0 and no existing Non-Project Allocation. No backend action required.");
                    }
                }
                // After any successful API call (create/update/delete), re-fetch all data
                // This ensures all grids (especially summary) are in sync with the backend.
                console.log("DEBUG: Re-fetching all data after successful cell change...");
                fetchData();
            } catch (err: any) {
                console.error("ERROR: API Error on cell value change:", err);
                alert(`Failed to update allocation: ${err.response?.data?.detail || err.message || "Unknown error"}. Check console for details.`);
                // On error, revert cell to its original state from before editing
                projectGridRef.current?.api.undoCellEditing();
                nonProjectGridRef.current?.api.undoCellEditing();
                // Optionally, re-fetch data to revert to backend state if undoCellEditing isn't enough
                console.log("DEBUG: Re-fetching data to revert to backend state due to error.");
                fetchData();
            }
        }
    }, [selectedYear, fetchData]); // Dependencies for useCallback

    // --- Column Definitions ---
    const defaultColDef = useMemo<ColDef>(() => {
        return {
            flex: 1,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filter: true,
        };
    }, []);

    // Common column definitions for months (used by both project and non-project grids)
    const commonMonthColumns = useMemo<ColDef[]>(() => {
        return months.map(monthNum => {
            const monthName = new Date(selectedYear, monthNum - 1).toLocaleString('default', { month: 'short' });
            const fieldKey = `month_${monthNum}`; // e.g., 'month_1', 'month_2'

            return {
                headerName: monthName,
                field: fieldKey,
                width: 70, // Keep width reasonable for monthly cells
                editable: true, // Allow editing
                cellRenderer: (params: ICellRendererParams<any, AllocationCellData>) => {
                    // This renderer handles displaying the 'value' property of AllocationCellData
                    let displayValue: number | string = '';
                    if (params.value && typeof params.value === 'object' && 'value' in params.value) {
                        displayValue = params.value.value;
                    } else if (typeof params.value === 'number') {
                        // Fallback if params.value somehow gets just the number
                        displayValue = params.value;
                    }
                    // Display 0 as an empty string for cleaner UI, otherwise the value
                    return displayValue === 0 ? '' : displayValue;
                },
                valueGetter: (params: any) => {
                    // This is used by Ag-Grid for sorting, filtering, and passing to valueSetter
                    // It extracts the 'value' property from AllocationCellData, defaulting to 0
                    const cellData: AllocationCellData = params.data[fieldKey];
                    return cellData?.value || 0;
                },
                valueSetter: (params: ValueSetterParams) => {
                    // This updates the local rowData in Ag-Grid before onCellValueChanged
                    // It expects a boolean return: true if value was set, false otherwise.
                    const newValue = params.newValue === '' || params.newValue === null ? 0 : parseFloat(params.newValue);
                    
                    if (isNaN(newValue) || newValue < 0) {
                        console.warn(`DEBUG: valueSetter: Invalid input '${params.newValue}'. Not setting value.`);
                        return false; // Indicate that the value was NOT set
                    }

                    const currentCellData: AllocationCellData = params.data[fieldKey] || {};
                    // Create a new object to ensure immutability for React state updates later
                    params.data[fieldKey] = {
                        ...currentCellData, // Keep existing properties like allocationId, projectId, type
                        value: newValue // Update the 'value' property
                    };
                    console.log(`DEBUG: valueSetter: Set local value for ${fieldKey} to ${newValue}.`);
                    return true; // Indicate that the value was successfully set locally
                }
            } as ColDef;
        });
    }, [months, selectedYear]); // Re-generate if months or year change

    const projectColumnDefs = useMemo<ColDef[]>(() => {
        return [
            {
                headerName: 'Engineer',
                field: 'engineer_name',
                pinned: 'left',
                width: 150,
                cellClass: 'locked-col', // Optional: for styling non-editable cells
                editable: false,
            },
            {
                headerName: 'Project',
                field: 'project_name',
                pinned: 'left',
                width: 150,
                cellClass: 'locked-col',
                editable: false,
            },
            ...commonMonthColumns, // Include dynamically generated month columns
        ];
    }, [commonMonthColumns]);

    const nonProjectColumnDefs = useMemo<ColDef[]>(() => {
        return [
            {
                headerName: 'Engineer',
                field: 'engineer_name',
                pinned: 'left',
                width: 150,
                cellClass: 'locked-col',
                editable: false,
            },
            {
                headerName: 'Type',
                field: 'non_project_type',
                pinned: 'left',
                width: 120,
                cellClass: 'locked-col',
                editable: false,
            },
            ...commonMonthColumns, // Include dynamically generated month columns
        ];
    }, [commonMonthColumns]);

    const summaryColumnDefs = useMemo<ColDef[]>(() => {
        const monthSummaryCols: ColDef[] = [];
        months.forEach(monthNum => {
            const monthName = new Date(selectedYear, monthNum - 1).toLocaleString('default', { month: 'short' });
            monthSummaryCols.push({
                headerName: monthName,
                children: [
                    {
                        headerName: 'Total',
                        field: `month_${monthNum}_total`, // e.g., 'month_1_total'
                        width: 70,
                        cellRenderer: (params: ICellRendererParams) => params.value !== undefined ? parseFloat(params.value).toFixed(1) : '',
                        type: 'numericColumn', // Align to right
                    },
                    {
                        headerName: 'Rem',
                        field: `month_${monthNum}_remaining`, // e.g., 'month_1_remaining'
                        width: 70,
                        cellRenderer: (params: ICellRendererParams) => params.value !== undefined ? parseFloat(params.value).toFixed(1) : '',
                        type: 'numericColumn',
                        cellStyle: (params) => {
                            if (params.value < 0) {
                                return { backgroundColor: '#ffdddd' }; // Light red for negative remaining
                            } else if (params.value === 0) {
                                return { backgroundColor: '#ddffdd' }; // Light green for zero remaining
                            }
                            return null;
                        },
                    },
                ]
            });
        });

        return [
            {
                headerName: 'Engineer',
                field: 'engineer_name',
                pinned: 'left',
                width: 180,
                cellClass: 'locked-col',
                editable: false,
            },
            ...monthSummaryCols, // Include grouped month summary columns
        ];
    }, [months, selectedYear]);

    // Optional: Ag-Grid Ready callback (useful for API access)
    const onGridReady = useCallback(() => {
        console.log("DEBUG: Ag-Grid is ready.");
        // You can access grid API here if needed, e.g., projectGridRef.current.api.sizeColumnsToFit();
    }, []);

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
                                readOnlyEdit={false} // Ensure this is false for editing
                                onGridReady={onGridReady}
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
                            readOnlyEdit={false} // Ensure this is false for editing
                            onGridReady={onGridReady}
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
                            readOnlyEdit={true}
                            onGridReady={onGridReady}
                        />
                    </div>
                </>
            )}

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '5px', fontSize: '0.9em' }}>
                <h3>Usage Tips:</h3>
                <p>Double-click a cell in "Project Allocations" or "Non-Project Time Allocations" to edit. Enter 0 to clear an allocation. The "Monthly Summary" grid provides an overview of total allocated and remaining capacity.</p>
                <p><strong>Debugging Tip:</strong> Open your browser's Developer Console (F12) and check the "Console" and "Network" tabs for messages after editing a cell.</p>
            </div>
        </div>
    );
};

export default PlanningPage;
