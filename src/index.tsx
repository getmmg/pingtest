// src/components/PlanningPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
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
  NonProjectTimeAllocation,
  NonProjectTimeAllocationCreate
} from '../models/apiModels';

interface AllocationGridRow {
  engineer_id: number;
  engineer_name: string;
  line_manager: string;
  [key: string]: any; // For dynamic month columns and other properties
  total_project_allocation?: number;
  total_non_project_allocation?: number;
  total_overall_allocation?: number;
  monthly_capacity?: { [monthKey: string]: number };
  utilization_percentage?: { [monthKey: string]: number };
}

const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
};

const getDaysInMonth = (year: number, month: number): number => {
  // Use 0 for day to get the last day of the previous month, which is the last day of the desired month
  return new Date(year, month, 0).getDate();
};

const PlanningPage: React.FC = () => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
  const [nonProjectAllocations, setNonProjectAllocations] = useState<NonProjectTimeAllocation[]>([]);
  const [monthlyCapacities, setMonthlyCapacities] = useState<MonthlyCapacity>({});

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals and Forms State
  const [showProjectAllocationModal, setShowProjectAllocationModal] = useState(false);
  const [showNonProjectAllocationModal, setShowNonProjectAllocationModal] = useState(false);
  const [isEditingProjectAllocation, setIsEditingProjectAllocation] = useState(false);
  const [isEditingNonProjectAllocation, setIsEditingNonProjectAllocation] = useState(false);
  const [currentProjectAllocation, setCurrentProjectAllocation] = useState<ProjectAllocation | null>(null);
  const [currentNonProjectAllocation, setCurrentNonProjectAllocation] = useState<NonProjectTimeAllocation | null>(null);

  const [formEngineerId, setFormEngineerId] = useState<number | null>(null);
  const [formProjectId, setFormProjectId] = useState<number | null>(null); // For project allocations
  const [formNonProjectType, setFormNonProjectType] = useState<string>(''); // For non-project
  const [formAllocationMonth, setFormAllocationMonth] = useState<string>('');
  const [formManDaysAllocated, setFormManDaysAllocated] = useState<number | ''>('');

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<{ id: number; type: 'project' | 'non-project' } | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 2); // Current year +/- 2
  const monthNames = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'long' }));
  const nonProjectTypes = ['Holiday', 'Training', 'Admin', 'Leave', 'Other'];

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
  }, [selectedYear]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const populateFormForEdit = (allocation: ProjectAllocation | NonProjectTimeAllocation, type: 'project' | 'non-project') => {
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
      const nonProjAlloc = allocation as NonProjectTimeAllocation;
      setFormNonProjectType(nonProjAlloc.type);
      setCurrentNonProjectAllocation(nonProjAlloc);
      setIsEditingNonProjectAllocation(true);
      setShowNonProjectAllocationModal(true);
    }
  };

  const handleCreateOrUpdateProjectAllocation = async () => {
    setError(null);
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
      if (isEditingProjectAllocation && currentProjectAllocation) {
        await updateProjectAllocation(currentProjectAllocation.allocation_id, allocationData);
      } else {
        await createProjectAllocation(allocationData);
      }
      setShowProjectAllocationModal(false);
      resetForm();
      fetchAllData(); // Re-fetch all data to update grid
    } catch (err: any) {
      console.error("Error saving project allocation:", err);
      setError(err.response?.data?.detail || "Failed to save project allocation. Check if allocation exceeds capacity.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateNonProjectAllocation = async () => {
    setError(null);
    if (formEngineerId === null || formNonProjectType === '' || formAllocationMonth === '' || formManDaysAllocated === '') {
      setError("All fields are required.");
      return;
    }

    const allocationData: NonProjectTimeAllocationCreate = {
      engineer_id: formEngineerId,
      type: formNonProjectType,
      allocation_month: formAllocationMonth,
      days_allocated: parseFloat(formManDaysAllocated.toString()),
    };

    setLoading(true);
    try {
      if (isEditingNonProjectAllocation && currentNonProjectAllocation) {
        await updateNonProjectAllocation(currentNonProjectAllocation.non_project_allocation_id, allocationData);
      } else {
        await createNonProjectAllocation(allocationData);
      }
      setShowNonProjectAllocationModal(false);
      resetForm();
      fetchAllData(); // Re-fetch all data to update grid
    } catch (err: any) {
      console.error("Error saving non-project allocation:", err);
      setError(err.response?.data?.detail || "Failed to save non-project allocation. Check if allocation exceeds capacity.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllocation = async () => {
    if (!allocationToDelete) return;

    setLoading(true);
    setError(null);
    try {
      if (allocationToDelete.type === 'project') {
        await deleteProjectAllocation(allocationToDelete.id);
      } else {
        await deleteNonProjectAllocation(allocationToDelete.id);
      }
      fetchAllData(); // Re-fetch all data to update grid
    } catch (err: any) {
      console.error("Error deleting allocation:", err);
      setError(err.response?.data?.detail || "Failed to delete allocation.");
    } finally {
      setLoading(false);
      setConfirmDeleteOpen(false);
      setAllocationToDelete(null);
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

  // AG-Grid Configuration
  // NO LONGER using useState for columnDefs, it's now useMemo
  const columnDefs = useMemo(() => { // Changed from useState + useEffect to useMemo
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
          },
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
            valueSetter: async (params: any) => {
              const oldValue = params.oldValue || 0;
              const newValue = parseFloat(params.newValue);

              if (isNaN(newValue) || newValue < 0 || newValue > totalDaysInMonth) {
                setError(`Allocation for ${monthName} must be between 0 and ${totalDaysInMonth} days.`);
                return false;
              }

              const engineerId = params.data.engineer_id;
              const projectAllocationId = projectAllocations.find(pa =>
                pa.engineer_id === engineerId &&
                pa.project_id === project.project_id &&
                pa.allocation_month === monthKey
              )?.allocation_id;

              const capacity = params.data.monthly_capacity?.[monthKey] || 0; // Use optional chaining
              const currentOverallAllocation = params.data[`month_total_overall_${monthKey}`] || 0; // Default to 0
              const proposedOverallAllocation = currentOverallAllocation - oldValue + newValue;

              if (capacity > 0 && proposedOverallAllocation > capacity) { // Only check if capacity is positive
                  setError(`Proposed allocation (${proposedOverallAllocation.toFixed(1)} days) exceeds monthly capacity (${capacity.toFixed(1)} days) for ${params.data.engineer_name} in ${monthName}.`);
                  return false;
              }


              const allocationData: ProjectAllocationCreate = {
                engineer_id: engineerId,
                project_id: project.project_id,
                allocation_month: monthKey,
                man_days_allocated: newValue
              };

              try {
                if (projectAllocationId) {
                  await updateProjectAllocation(projectAllocationId, allocationData);
                } else {
                  await createProjectAllocation(allocationData);
                }
                fetchAllData();
                return true;
              } catch (err: any) {
                console.error("Error updating project allocation:", err);
                setError(err.response?.data?.detail || "Failed to update project allocation.");
                return false;
              }
            },
          })),
          {
            headerName: 'Non-Project',
            field: `non_project_${monthKey}`,
            width: 120,
            cellRenderer: (params: any) => {
              const engineerId = params.data.engineer_id;
              const allocations = nonProjectAllocations.filter(npa =>
                npa.engineer_id === engineerId &&
                npa.allocation_month === monthKey
              );
              const totalNonProject = allocations.reduce((sum, npa) => sum + npa.days_allocated, 0);

              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                  <span>{totalNonProject.toFixed(1)}</span>
                  <Button
                    icon="plus"
                    size="mini"
                    compact
                    onClick={() => {
                      setFormEngineerId(engineerId);
                      setFormAllocationMonth(monthKey);
                      handleOpenNonProjectAllocationModal();
                    }}
                  />
                </div>
              );
            },
            tooltipValueGetter: (params: any) => {
                const engineerId = params.data.engineer_id;
                const allocations = nonProjectAllocations.filter(npa =>
                    npa.engineer_id === engineerId &&
                    npa.allocation_month === monthKey
                );
                return allocations.map(npa => `${npa.type}: ${npa.days_allocated}`).join(', ');
            }
          },
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
          },
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
          }
        ],
      };
    });

    return [
      {
        headerName: 'Engineer Info',
        children: [
          { headerName: 'ID', field: 'engineer_id', width: 70, pinned: 'left' },
          { headerName: 'Engineer Name', field: 'engineer_name', width: 150, pinned: 'left' },
          { headerName: 'Line Manager', field: 'line_manager', width: 120, pinned: 'left' },
        ],
      },
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
          },
          {
            headerName: 'Total Non-Project Days',
            field: 'total_non_project_allocation',
            width: 160,
            valueFormatter: (params: any) => params.value !== undefined ? params.value.toFixed(1) : '0.0',
            cellStyle: { fontWeight: 'bold' }
          },
          {
            headerName: 'Overall Total Days',
            field: 'total_overall_allocation',
            width: 140,
            valueFormatter: (params: any) => params.value !== undefined ? params.value.toFixed(1) : '0.0',
            cellStyle: { fontWeight: 'bold', backgroundColor: '#e0f0ff' }
          },
        ],
        pinned: 'right'
      }
    ];
  }, [selectedYear, projects, engineers, projectAllocations, nonProjectAllocations, monthlyCapacities, fetchAllData, monthNames]);

  const getRowId = useCallback((params: any) => params.data.engineer_id, []);

  const onCellValueChanged = useCallback((event: any) => {
    // This is handled by valueSetter in columnDefs, no need for separate logic here
    // Just ensure the grid re-renders if the data changes, which fetchAllData will handle.
  }, []);

  const onGridReady = useCallback((params: any) => {
    // Optional: Auto-size columns on grid ready
    // params.api.sizeColumnsToFit();
  }, []);


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
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
            minWidth: 80,
          }}
          getRowId={getRowId}
          onCellValueChanged={onCellValueChanged}
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
                disabled={isEditingProjectAllocation}
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
                disabled={isEditingProjectAllocation}
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
                disabled={isEditingProjectAllocation}
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
                disabled={isEditingNonProjectAllocation}
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
                disabled={isEditingNonProjectAllocation}
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
                disabled={isEditingNonProjectAllocation}
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
