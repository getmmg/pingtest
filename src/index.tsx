// src/components/PlanningPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ColGroupDef, ValueSetterParams, CellValueChangedEvent, GridApi } from 'ag-grid-community';
import {
  Dropdown,
  Button,
  Grid,
  Segment,
  Header,
  Input,
  Modal,
  Form,
  Message,
  Icon,
  Confirm
} from 'semantic-ui-react';
import {
  getEngineersFromAllocationApi,
  getProjectsFromAllocationApi,
  getProjectAllocationsByPeriod,
  createProjectAllocation,
  updateProjectAllocation,
  deleteProjectAllocation,
  getNonProjectAllocationsByPeriod,
  createNonProjectAllocation,
  updateNonProjectAllocation,
  deleteNonProjectAllocation,
  getMonthlyCapacity,
  MonthlyCapacity
} from '../api/allocationApi';
import {
  Engineer,
  Project,
  ProjectAllocation,
  ProjectAllocationCreate,
  NonProjectAllocation,
  NonProjectAllocationCreate
} from '../models/apiModels'; // Ensure this path is correct

// Interface for a single row in the Ag-Grid table
interface AllocationGridRow {
  engineer_id: number;
  engineer_name: string;
  line_manager: string;
  [key: string]: any; // For dynamic month columns (e.g., '2023-01-01_project_1', 'monthly_capacity.2023-01-01')
  total_project_allocation?: number;
  total_non_project_allocation?: number;
  total_overall_allocation?: number;
  monthly_capacity?: { [monthKey: string]: number }; // Object mapping month keys to capacity
  utilization_percentage?: { [monthKey: string]: number }; // Object mapping month keys to utilization %
}

// Helper function to generate a consistent month key (e.g., "YYYY-MM-01")
const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
};

// Helper function to get the number of days in a given month
const getDaysInMonth = (year: number, month: number): number => {
  // Use 0 for day to get the last day of the previous month, which is the last day of the desired month
  return new Date(year, month, 0).getDate();
};

const PlanningPage: React.FC = () => {
  // --- State Variables ---
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
  const [nonProjectAllocations, setNonProjectAllocations] = useState<NonProjectAllocation[]>([]);
  const [monthlyCapacities, setMonthlyCapacities] = useState<MonthlyCapacity>({});

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Modal and Form State ---
  const [showProjectAllocationModal, setShowProjectAllocationModal] = useState(false);
  const [showNonProjectAllocationModal, setShowNonProjectAllocationModal] = useState(false);
  const [isEditingProjectAllocation, setIsEditingProjectAllocation] = useState(false);
  const [isEditingNonProjectAllocation, setIsEditingNonProjectAllocation] = useState(false);
  const [currentProjectAllocation, setCurrentProjectAllocation] = useState<ProjectAllocation | null>(null);
  const [currentNonProjectAllocation, setCurrentNonProjectAllocation] = useState<NonProjectAllocation | null>(null);

  const [formEngineerId, setFormEngineerId] = useState<number | null>(null);
  const [formProjectId, setFormProjectId] = useState<number | null>(null);
  const [formNonProjectType, setFormNonProjectType] = useState<string>('');
  const [formAllocationMonth, setFormAllocationMonth] = useState<string>('');
  const [formManDaysAllocated, setFormManDaysAllocated] = useState<number | ''>('');

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<{ id: number; type: 'project' | 'non-project' } | null>(null);

  const gridApiRef = useRef<GridApi | null>(null); // Ref to store Ag-Grid API instance

  // --- Static Data/Options ---
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 2); // Current year +/- 2
  const monthNames = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'long' }));
  const nonProjectTypes = ['Holiday', 'Training', 'Admin', 'Leave', 'Other'];

  // --- Data Fetching Logic ---
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [engData, projData, projAllocData, nonProjAllocData, capacityData] = await Promise.all([
        getEngineersFromAllocationApi(),
        getProjectsFromAllocationApi(),
        getProjectAllocationsByPeriod(selectedYear, 1, 12),
        getNonProjectAllocationsByPeriod(selectedYear, 1, 12),
        getMonthlyCapacity(selectedYear),
      ]);
      setEngineers(engData);
      setProjects(projData);
      setProjectAllocations(projAllocData);
      setNonProjectAllocations(nonProjAllocData);
      setMonthlyCapacities(capacityData);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.response?.data?.detail || "Failed to load planning data.");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]); // Re-create fetchAllData only if selectedYear changes

  // Effect to run fetchAllData on component mount or when selectedYear changes
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Form and Modal Handlers ---
  const populateFormForEdit = (allocation: ProjectAllocation | NonProjectAllocation, type: 'project' | 'non-project') => {
    setFormEngineerId(allocation.engineer_id);
    setFormAllocationMonth(allocation.allocation_month);
    setFormManDaysAllocated(allocation.man_days_allocated);

    if (type === 'project') {
      const projAlloc = allocation as ProjectAllocation;
      setFormProjectId(projAlloc.project_id);
      setCurrentProjectAllocation(projAlloc);
      setIsEditingProjectAllocation(true);
      setShowProjectAllocationModal(true);
    } else {
      const nonProjAlloc = allocation as NonProjectAllocation;
      setFormNonProjectType(nonProjAlloc.type);
      setCurrentNonProjectAllocation(nonProjAlloc);
      setIsEditingNonProjectAllocation(true);
      setShowNonProjectAllocationModal(true);
    }
  };

  const handleCreateOrUpdateProjectAllocation = async () => {
    setError(null); // Clear previous errors
    if (formEngineerId === null || formProjectId === null || formAllocationMonth === '' || formManDaysAllocated === '') {
      setError("All fields are required.");
      return;
    }

    const allocationData: ProjectAllocationCreate = {
      engineer_id: formEngineerId,
      project_id: formProjectId,
      allocation_month: formAllocationMonth,
      man_days_allocated: parseFloat(formManDaysAllocated.toString()),
    };

    setLoading(true);
    try {
      let updatedAllocation: ProjectAllocation;
      if (isEditingProjectAllocation && currentProjectAllocation) {
        // Update existing allocation
        updatedAllocation = await updateProjectAllocation(currentProjectAllocation.allocation_id, allocationData);
        setProjectAllocations(prev =>
          prev.map(alloc =>
            alloc.allocation_id === updatedAllocation.allocation_id ? updatedAllocation : alloc
          )
        );
      } else {
        // Create new allocation
        updatedAllocation = await createProjectAllocation(allocationData);
        setProjectAllocations(prev => [...prev, updatedAllocation]);
      }
      setShowProjectAllocationModal(false);
      resetForm(); // Reset form fields and editing state
    } catch (err: any) {
      console.error("Error saving project allocation:", err);
      setError(err.response?.data?.detail || "Failed to save project allocation. Check if allocation exceeds capacity.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateNonProjectAllocation = async () => {
    setError(null); // Clear previous errors
    if (formEngineerId === null || formNonProjectType === '' || formAllocationMonth === '' || formManDaysAllocated === '') {
      setError("All fields are required.");
      return;
    }

    const allocationData: NonProjectAllocationCreate = {
      engineer_id: formEngineerId,
      type: formNonProjectType,
      allocation_month: formAllocationMonth,
      man_days_allocated: parseFloat(formManDaysAllocated.toString()),
    };

    setLoading(true);
    try {
      let updatedAllocation: NonProjectAllocation;
      if (isEditingNonProjectAllocation && currentNonProjectAllocation) {
        // Update existing non-project allocation
        updatedAllocation = await updateNonProjectAllocation(currentNonProjectAllocation.non_project_allocation_id, allocationData);
        setNonProjectAllocations(prev =>
          prev.map(alloc =>
            alloc.non_project_allocation_id === updatedAllocation.non_project_allocation_id ? updatedAllocation : alloc
          )
        );
      } else {
        // Create new non-project allocation
        updatedAllocation = await createNonProjectAllocation(allocationData);
        setNonProjectAllocations(prev => [...prev, updatedAllocation]);
      }
      setShowNonProjectAllocationModal(false);
      resetForm(); // Reset form fields and editing state
    } catch (err: any) {
      console.error("Error saving non-project allocation:", err);
      setError(err.response?.data?.detail || "Failed to save non-project allocation. Check if allocation exceeds capacity.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllocation = async () => {
    if (!allocationToDelete) return; // Should not happen if confirmed

    setLoading(true);
    setError(null); // Clear previous errors
    try {
      if (allocationToDelete.type === 'project') {
        await deleteProjectAllocation(allocationToDelete.id);
        setProjectAllocations(prev => prev.filter(alloc => alloc.allocation_id !== allocationToDelete.id));
      } else {
        await deleteNonProjectAllocation(allocationToDelete.id);
        setNonProjectAllocations(prev => prev.filter(alloc => alloc.non_project_allocation_id !== allocationToDelete.id));
      }
    } catch (err: any) {
      console.error("Error deleting allocation:", err);
      setError(err.response?.data?.detail || "Failed to delete allocation.");
    } finally {
      setLoading(false);
      setConfirmDeleteOpen(false); // Close confirmation modal
      setAllocationToDelete(null); // Clear item to delete
    }
  };

  const resetForm = () => {
    setFormEngineerId(null);
    setFormProjectId(null);
    setFormNonProjectType('');
    setFormAllocationMonth('');
    setFormManDaysAllocated('');
    setIsEditingProjectAllocation(false);
    setIsEditingNonProjectAllocation(false);
    setCurrentProjectAllocation(null);
    setCurrentNonProjectAllocation(null);
    setError(null); // Clear form-specific errors
  };

  const handleOpenProjectAllocationModal = () => {
    resetForm();
    setShowProjectAllocationModal(true);
  };

  const handleOpenNonProjectAllocationModal = () => {
    resetForm();
    setShowNonProjectAllocationModal(true);
  };

  // --- Dropdown Options Generation ---
  const engineerOptions = engineers.map(eng => ({
    key: eng.engineer_id,
    value: eng.engineer_id,
    text: eng.engineer_name,
  }));

  const projectOptions = projects.map(proj => ({
    key: proj.project_id,
    value: proj.project_id,
    text: proj.project_name,
  }));

  const nonProjectTypeOptions = nonProjectTypes.map(type => ({
    key: type,
    value: type,
    text: type,
  }));

  const generateMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(selectedYear, i, 1);
      const value = getMonthKey(monthDate);
      const text = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ key: value, value: value, text: text });
    }
    return options;
  };

  // --- AG-Grid Configuration (Column Definitions) ---
  // Memoized to prevent unnecessary re-creations unless dependencies change
  const columnDefs = useMemo<Array<ColDef | ColGroupDef>>(() => { // Explicitly type columnDefs
    const dynamicMonthColumns = monthNames.map((monthName, index) => {
      const monthNum = index + 1;
      const monthDate = new Date(selectedYear, index, 1);
      const monthKey = getMonthKey(monthDate);
      const totalDaysInMonth = getDaysInMonth(selectedYear, monthNum);

      return {
        headerName: `${monthName} ${selectedYear}`,
        children: [
          {
            headerName: 'Capacity',
            field: `monthly_capacity.${monthKey}`,
            width: 90,
            valueFormatter: (params: any) => params.value !== undefined ? params.value.toFixed(1) : 'N/A',
            cellStyle: { fontWeight: 'bold' }
          } as ColDef, // Cast individual column as ColDef
          ...projects.map(project => ({
            headerName: project.project_name,
            field: `${project.project_id}_${monthKey}`,
            width: 100,
            editable: true,
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
              min: 0,
              max: totalDaysInMonth,
              precision: 1
            },
            valueGetter: (params: any) => {
              const allocation = projectAllocations.find(pa =>
                pa.engineer_id === params.data.engineer_id &&
                pa.project_id === project.project_id &&
                pa.allocation_month === monthKey
              );
              return allocation ? allocation.man_days_allocated : 0;
            },
            // ValueSetter is now synchronous and optimistically updates state
            valueSetter: (params: ValueSetterParams<AllocationGridRow>) => {
              const oldValue = params.oldValue || 0;
              const newValue = parseFloat(params.newValue);
              const engineerId = params.data.engineer_id;

              // --- Synchronous Validation ---
              if (isNaN(newValue) || newValue < 0 || newValue > totalDaysInMonth) {
                setError(`Allocation for ${monthName} must be between 0 and ${totalDaysInMonth} days.`);
                return false; // Revert cell value
              }

              // Calculate current overall allocation from the current rowData in the grid
              // This ensures that the validation considers other changes not yet persisted by the API.
              const currentOverallAllocation = params.data[`month_total_overall_${monthKey}`] || 0;
              const proposedOverallAllocation = currentOverallAllocation - oldValue + newValue;
              const capacity = params.data.monthly_capacity?.[monthKey] || 0;

              if (capacity > 0 && proposedOverallAllocation > capacity) {
                  setError(`Proposed allocation (${proposedOverallAllocation.toFixed(1)} days) exceeds monthly capacity (${capacity.toFixed(1)} days) for ${params.data.engineer_name} in ${monthName}.`);
                  return false; // Revert cell value
              }

              // --- Optimistically Update Local State ---
              // Update the projectAllocations state immediately so the grid's rowData
              // re-computes correctly with the new value. This is crucial for reactive calculations.
              setProjectAllocations(prevAllocations => {
                const existingAllocationIndex = prevAllocations.findIndex(pa =>
                  pa.engineer_id === engineerId &&
                  pa.project_id === project.project_id &&
                  pa.allocation_month === monthKey
                );

                if (existingAllocationIndex !== -1) {
                  const updatedAllocations = [...prevAllocations];
                  updatedAllocations[existingAllocationIndex] = {
                    ...updatedAllocations[existingAllocationIndex],
                    man_days_allocated: newValue
                  };
                  return updatedAllocations;
                } else {
                  // For a new allocation, create a temporary ID (e.g., negative timestamp)
                  // This ID will be replaced by the real ID from the backend later in onCellValueChanged.
                  const tempAllocationId = Date.now() * -1 - Math.random(); // Ensures unique negative ID
                  const newAllocation: ProjectAllocation = {
                    allocation_id: tempAllocationId, // Temporary ID
                    engineer_id: engineerId,
                    project_id: project.project_id,
                    allocation_month: monthKey,
                    man_days_allocated: newValue,
                    // Add other fields that might be expected by ProjectAllocation
                    // If your ProjectAllocation type has more non-optional fields (e.g., created_at, updated_at),
                    // you'll need to provide placeholder values or make them optional in your model.
                    created_at: new Date().toISOString(), // Placeholder
                    updated_at: new Date().toISOString(), // Placeholder
                  };
                  return [...prevAllocations, newAllocation];
                }
              });

              // --- Return true to allow Ag-Grid to update the cell visually ---
              return true;
            },
          }) as ColDef), // Cast individual project column as ColDef
          {
            headerName: 'Non-Project',
            field: `non_project_${monthKey}`,
            width: 120,
            cellRenderer: (params: any) => { // params here is ICellRendererParams
              const engineerId = params.data.engineer_id;
              const allocations = nonProjectAllocations.filter(npa =>
                npa.engineer_id === engineerId &&
                npa.allocation_month === monthKey
              );
              const totalNonProject = allocations.reduce((sum, npa) => sum + npa.man_days_allocated, 0);

              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                  <span>{totalNonProject.toFixed(1)}</span>
                  <Button
                    icon="plus"
                    size="mini"
                    compact
                    onClick={() => {
                      // Set form initial values based on the row/month clicked
                      setFormEngineerId(engineerId);
                      setFormAllocationMonth(monthKey);
                      // Clear any existing non-project allocation data for 'add'
                      setCurrentNonProjectAllocation(null);
                      setIsEditingNonProjectAllocation(false);
                      handleOpenNonProjectAllocationModal();
                    }}
                  />
                </div>
              );
            },
            tooltipValueGetter: (params: any) => { // params here is ITooltipParams
                const engineerId = params.data.engineer_id;
                const allocations = nonProjectAllocations.filter(npa =>
                    npa.engineer_id === engineerId &&
                    npa.allocation_month === monthKey
                );
                return allocations.map(npa => `${npa.type}: ${npa.man_days_allocated}`).join(', ');
            }
          } as ColDef, // Cast as ColDef
          {
            headerName: 'Total Allocated',
            field: `month_total_overall_${monthKey}`,
            width: 120,
            valueFormatter: (params: any) => params.value !== undefined ? params.value.toFixed(1) : '0.0',
            cellStyle: (params: any) => {
                const capacity = params.data.monthly_capacity?.[monthKey] || 0;
                const allocated = params.value || 0;
                if (capacity > 0 && allocated > capacity) {
                    return { backgroundColor: '#f0e0e0', color: 'red', fontWeight: 'bold' };
                }
                return { fontWeight: 'bold' };
            }
          } as ColDef, // Cast as ColDef
          {
            headerName: 'Utilization (%)',
            field: `utilization_${monthKey}`,
            width: 120,
            valueFormatter: (params: any) => params.value !== undefined ? `${params.value.toFixed(1)}%` : '0.0%',
            cellStyle: (params: any) => {
              const utilization = params.value;
              if (utilization > 100) {
                return { backgroundColor: '#f0e0e0', color: 'red', fontWeight: 'bold' };
              } else if (utilization > 85) {
                return { backgroundColor: '#fffbe0', color: 'orange' };
              }
              return null;
            }
          } as ColDef // Cast as ColDef
        ],
      } as ColGroupDef; // Cast dynamic month group as ColGroupDef
    });

    return [
      {
        headerName: 'Engineer Info',
        children: [
          { headerName: 'ID', field: 'engineer_id', width: 70, pinned: 'left' } as ColDef,
          { headerName: 'Engineer Name', field: 'engineer_name', width: 150, pinned: 'left' } as ColDef,
          { headerName: 'Line Manager', field: 'line_manager', width: 120, pinned: 'left' } as ColDef,
        ],
      } as ColGroupDef, // Cast Engineer Info group as ColGroupDef
      ...dynamicMonthColumns,
      {
        headerName: 'Totals',
        children: [
          {
            headerName: 'Total Project Days',
            field: 'total_project_allocation',
            width: 140,
            valueFormatter: (params: any) => params.value !== undefined ? params.value.toFixed(1) : '0.0',
            cellStyle: { fontWeight: 'bold' }
          } as ColDef,
          {
            headerName: 'Total Non-Project Days',
            field: 'total_non_project_allocation',
            width: 160,
            valueFormatter: (params: any) => params.value !== undefined ? params.value.toFixed(1) : '0.0',
            cellStyle: { fontWeight: 'bold' }
          } as ColDef,
          {
            headerName: 'Overall Total Days',
            field: 'total_overall_allocation',
            width: 140,
            valueFormatter: (params: any) => params.value !== undefined ? params.value.toFixed(1) : '0.0',
            cellStyle: { fontWeight: 'bold', backgroundColor: '#e0f0ff' }
          } as ColDef,
        ],
        pinned: 'right'
      } as ColGroupDef // Cast Totals group as ColGroupDef
    ];
  }, [selectedYear, projects, engineers, projectAllocations, nonProjectAllocations, monthlyCapacities, monthNames]);

  // --- AG-Grid Data (Row Data) ---
  // Memoized to prevent unnecessary re-creations unless dependencies change
  const rowData = useMemo(() => {
    if (loading || error) return []; // Return empty array if loading or error

    const rows: AllocationGridRow[] = engineers.map(engineer => ({
      engineer_id: engineer.engineer_id,
      engineer_name: engineer.engineer_name,
      line_manager: engineer.line_manager,
      monthly_capacity: monthlyCapacities[engineer.engineer_id] || {},
    }));

    // Initialize monthly total fields for each engineer
    rows.forEach(row => {
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(selectedYear, i, 1);
        const monthKey = getMonthKey(monthDate);
        row[`month_total_project_${monthKey}`] = 0;
        row[`month_total_non_project_${monthKey}`] = 0;
        row[`month_total_overall_${monthKey}`] = 0;
        row[`utilization_${monthKey}`] = 0;
      }
    });

    // Populate project allocations into rows
    projectAllocations.forEach(pa => {
      const rowIndex = rows.findIndex(r => r.engineer_id === pa.engineer_id);
      if (rowIndex !== -1) {
        const monthKey = pa.allocation_month;
        const colKey = `month_total_project_${monthKey}`;
        rows[rowIndex][colKey] = (rows[rowIndex][colKey] || 0) + pa.man_days_allocated;
      }
    });

    // Populate non-project allocations into rows
    nonProjectAllocations.forEach(npa => {
      const rowIndex = rows.findIndex(r => r.engineer_id === npa.engineer_id);
      if (rowIndex !== -1) {
        const monthKey = npa.allocation_month;
        const colKey = `month_total_non_project_${monthKey}`;
        rows[rowIndex][colKey] = (rows[rowIndex][colKey] || 0) + npa.man_days_allocated;
      }
    });

    // Calculate overall totals and utilization
    rows.forEach(row => {
      let total_project_allocation = 0;
      let total_non_project_allocation = 0;
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(selectedYear, i, 1);
        const monthKey = getMonthKey(monthDate);
        const projectDays = row[`month_total_project_${monthKey}`] || 0;
        const nonProjectDays = row[`month_total_non_project_${monthKey}`] || 0;
        const monthlyCapacity = row.monthly_capacity?.[monthKey] || 0;

        row[`month_total_overall_${monthKey}`] = projectDays + nonProjectDays;
        total_project_allocation += projectDays;
        total_non_project_allocation += nonProjectDays;

        if (monthlyCapacity > 0) {
          row[`utilization_${monthKey}`] = (row[`month_total_overall_${monthKey}`] / monthlyCapacity) * 100;
        } else {
          row[`utilization_${monthKey}`] = 0;
        }
      }
      row.total_project_allocation = total_project_allocation;
      row.total_non_project_allocation = total_non_project_allocation;
      row.total_overall_allocation = total_project_allocation + total_non_project_allocation;
    });

    return rows;
  }, [engineers, projectAllocations, nonProjectAllocations, monthlyCapacities, selectedYear, loading, error]);


  // --- AG-Grid Callbacks ---
  const getRowId = useCallback((params: any) => params.data.engineer_id, []);

  // onCellValueChanged is where the asynchronous API call and error handling occurs
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<AllocationGridRow>) => {
    const { data, colDef, newValue, oldValue, node } = event;

    // Type guard for colDef.field
    if (!colDef.field || typeof colDef.field !== 'string') {
        console.error("Column field is not a string, cannot process change.", colDef.field);
        return; // Exit if field is not a string
    }

    const field = colDef.field; // Now TypeScript knows 'field' is a string

    // Check if the changed field is one of our dynamic project allocation fields
    if (field.includes('_')) {
        const [projectIdStr, monthKey] = field.split('_');
        const projectId = parseInt(projectIdStr);
        const engineerId = data?.engineer_id;

        if (isNaN(projectId) || engineerId === undefined || !monthKey) {
            console.error("Invalid field format or data for cell change.");
            setError("Invalid cell data for update.");
            if (gridApiRef.current) {
                // Refresh cells to revert visually if initial data is bad
                event.api.refreshCells({
                    rowNodes: [node],
                    columns: [colDef],
                    force: true,
                });
            }
            return;
        }

        const allocationData: ProjectAllocationCreate = {
            engineer_id: engineerId,
            project_id: projectId,
            allocation_month: monthKey,
            man_days_allocated: parseFloat(newValue),
        };

        try {
            // Find the *current* state of the allocation before the API call
            // This is important because the local state might have a temporary ID.
            const existingAllocationBeforeApiCall = projectAllocations.find(pa =>
                pa.engineer_id === engineerId &&
                pa.project_id === projectId &&
                pa.allocation_month === monthKey
            );

            let receivedAllocation: ProjectAllocation;

            if (existingAllocationBeforeApiCall?.allocation_id && existingAllocationBeforeApiCall.allocation_id > 0) {
                // If it has a real ID, it's an update
                receivedAllocation = await updateProjectAllocation(existingAllocationBeforeApiCall.allocation_id, allocationData);
            } else {
                // If it has a temporary ID (or no ID if it was truly new) it's a create
                receivedAllocation = await createProjectAllocation(allocationData);
            }

            // Update state with the confirmed data from the API
            setProjectAllocations(prev => prev.map(alloc =>
                // Match by real ID for existing allocations
                alloc.allocation_id === receivedAllocation.allocation_id
                    ? receivedAllocation
                    // Match by temporary ID (if it was a new creation) and replace with real ID
                    : (alloc.engineer_id === engineerId && alloc.project_id === projectId && alloc.allocation_month === monthKey && alloc.allocation_id < 0)
                        ? receivedAllocation
                        : alloc
            ));
            setError(null); // Clear any previous errors on successful API call

        } catch (err: any) {
            console.error("Error updating project allocation:", err);
            setError(err.response?.data?.detail || `Failed to update allocation for ${data?.engineer_name}. Reverting cell.`);

            // --- Revert local state and grid visuals on API failure ---
            setProjectAllocations(prevAllocations => {
                const revertedAllocations = prevAllocations.map(alloc => {
                    if (alloc.engineer_id === engineerId && alloc.project_id === projectId && alloc.allocation_month === monthKey) {
                        // Check if it was an existing allocation or a new (failed) one
                        if (existingAllocationBeforeApiCall?.allocation_id && existingAllocationBeforeApiCall.allocation_id > 0) {
                            // If it was an update, revert to the old value
                            return { ...alloc, man_days_allocated: oldValue };
                        } else {
                            // If it was a new creation that failed, remove the temporary allocation from state
                            return null; // Mark for removal
                        }
                    }
                    return alloc;
                }).filter(Boolean) as ProjectAllocation[]; // Filter out nulls
                return revertedAllocations;
            });

            // Force Ag-Grid to re-render the cell from the updated (reverted) rowData
            if (gridApiRef.current) {
                event.api.refreshCells({
                    rowNodes: [node], // Use the node from the event
                    columns: [colDef],
                    force: true, // Force refresh to get data from state
                });
            }
        }
    }
  }, [projectAllocations]); // projectAllocations is a dependency because we `find` from it.

  const onGridReady = useCallback((params: any) => {
    gridApiRef.current = params.api; // Store the grid API instance
    // params.api.sizeColumnsToFit(); // Optional: Auto-size columns on grid ready
  }, []);


  // --- Rendered JSX ---
  return (
    <Segment raised className="planning-page">
      <Header as='h2'>
        Resource Planning
        <Dropdown
          placeholder='Select Year'
          selection
          options={years.map(year => ({ key: year, value: year, text: year.toString() }))}
          value={selectedYear}
          onChange={(e, { value }) => setSelectedYear(value as number)}
          style={{ marginLeft: '1em' }}
        />
        <Button floated='right' primary onClick={handleOpenProjectAllocationModal} icon labelPosition='left'>
          <Icon name='add' /> Add Project Allocation
        </Button>
        <Button floated='right' onClick={handleOpenNonProjectAllocationModal} icon labelPosition='left' style={{ marginRight: '0.5em' }}>
          <Icon name='add' /> Add Non-Project Time
        </Button>
      </Header>

      {loading && <Message info icon="circle notched" content="Loading planning data..." />}
      {error && <Message negative header="Error" content={error} />}

      <div className="ag-theme-alpine" style={{ width: '100%', height: '700px', overflowX: 'auto' }}>
        <AgGridReact<AllocationGridRow> // Explicitly type AgGridReact with your row data interface
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
            minWidth: 80,
          }}
          getRowId={getRowId}
          onCellValueChanged={onCellValueChanged} {/* This is where the async API call happens */}
          onGridReady={onGridReady}
        />
      </div>

      {/* Project Allocation Modal */}
      <Modal open={showProjectAllocationModal} onClose={() => { setShowProjectAllocationModal(false); resetForm(); }} closeIcon>
        <Modal.Header>{isEditingProjectAllocation ? 'Edit Project Allocation' : 'Add Project Allocation'}</Modal.Header>
        <Modal.Content>
          <Form onSubmit={handleCreateOrUpdateProjectAllocation} loading={loading}>
            <Form.Field>
              <label>Engineer</label>
              <Dropdown
                placeholder='Select Engineer'
                selection
                options={engineerOptions}
                value={formEngineerId || ''}
                onChange={(e, { value }) => setFormEngineerId(value as number)}
                disabled={isEditingProjectAllocation} // Disable engineer selection when editing
              />
            </Form.Field>
            <Form.Field>
              <label>Project</label>
              <Dropdown
                placeholder='Select Project'
                selection
                options={projectOptions}
                value={formProjectId || ''}
                onChange={(e, { value }) => setFormProjectId(value as number)}
                disabled={isEditingProjectAllocation} // Disable project selection when editing
              />
            </Form.Field>
            <Form.Field>
              <label>Month</label>
              <Dropdown
                placeholder='Select Month'
                selection
                options={generateMonthOptions()}
                value={formAllocationMonth}
                onChange={(e, { value }) => setFormAllocationMonth(value as string)}
                disabled={isEditingProjectAllocation} // Disable month selection when editing
              />
            </Form.Field>
            <Form.Field>
              <label>Man Days Allocated</label>
              <Input
                type="number"
                step="0.1"
                placeholder="Days"
                value={formManDaysAllocated}
                onChange={(e) => setFormManDaysAllocated(parseFloat(e.target.value))}
                required
              />
            </Form.Field>
            {error && <Message negative content={error} />}
            <Button primary type='submit'>{isEditingProjectAllocation ? 'Update Allocation' : 'Create Allocation'}</Button>
            {isEditingProjectAllocation && currentProjectAllocation && (
              <Button color='red' onClick={() => {
                setAllocationToDelete({ id: currentProjectAllocation.allocation_id, type: 'project' });
                setConfirmDeleteOpen(true);
              }}>
                Delete Allocation
              </Button>
            )}
          </Form>
        </Modal.Content>
      </Modal>

      {/* Non-Project Allocation Modal */}
      <Modal open={showNonProjectAllocationModal} onClose={() => { setShowNonProjectAllocationModal(false); resetForm(); }} closeIcon>
        <Modal.Header>{isEditingNonProjectAllocation ? 'Edit Non-Project Time Allocation' : 'Add Non-Project Time Allocation'}</Modal.Header>
        <Modal.Content>
          <Form onSubmit={handleCreateOrUpdateNonProjectAllocation} loading={loading}>
            <Form.Field>
              <label>Engineer</label>
              <Dropdown
                placeholder='Select Engineer'
                selection
                options={engineerOptions}
                value={formEngineerId || ''}
                onChange={(e, { value }) => setFormEngineerId(value as number)}
                disabled={isEditingNonProjectAllocation} // Disable engineer selection when editing
              />
            </Form.Field>
            <Form.Field>
              <label>Type of Leave/Time</label>
              <Dropdown
                placeholder='Select Type'
                selection
                options={nonProjectTypeOptions}
                value={formNonProjectType}
                onChange={(e, { value }) => setFormNonProjectType(value as string)}
                disabled={isEditingNonProjectAllocation} // Disable type selection when editing
              />
            </Form.Field>
            <Form.Field>
              <label>Month</label>
              <Dropdown
                placeholder='Select Month'
                selection
                options={generateMonthOptions()}
                value={formAllocationMonth}
                onChange={(e, { value }) => setFormAllocationMonth(value as string)}
                disabled={isEditingNonProjectAllocation} // Disable month selection when editing
              />
            </Form.Field>
            <Form.Field>
              <label>Days Allocated</label>
              <Input
                type="number"
                step="0.1"
                placeholder="Days"
                value={formManDaysAllocated}
                onChange={(e) => setFormManDaysAllocated(parseFloat(e.target.value))}
                required
              />
            </Form.Field>
            {error && <Message negative content={error} />}
            <Button primary type='submit'>{isEditingNonProjectAllocation ? 'Update Allocation' : 'Create Allocation'}</Button>
            {isEditingNonProjectAllocation && currentNonProjectAllocation && (
              <Button color='red' onClick={() => {
                setAllocationToDelete({ id: currentNonProjectAllocation.non_project_allocation_id, type: 'non-project' });
                setConfirmDeleteOpen(true);
              }}>
                Delete Allocation
              </Button>
            )}
          </Form>
        </Modal.Content>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Confirm
        open={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteAllocation}
        content='Are you sure you want to delete this allocation?'
        cancelButton='No'
        confirmButton='Yes, Delete'
      />
    </Segment>
  );
};

export default PlanningPage;
