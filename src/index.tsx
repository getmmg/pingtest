// src/components/PlanningPage.tsx
// ... (keep all existing imports and state declarations)

const PlanningPage: React.FC = () => {
    // ... (keep all existing refs, state declarations, and fetchData/useEffect)

    // --- Data Transformation for Summary Grid ---
    const summaryRowData = useMemo<SummaryGridRow[]>(() => {
        if (!engineers.length || !Object.keys(monthlyCapacity).length) {
             console.log("Summary Row Data: Skipping generation, engineers or monthlyCapacity missing.");
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

                // --- START DEBUGGING LOGS FOR SUMMARY CALCULATION ---
                console.log(`--- Summary Calculation for Engineer: ${engineer.engineer_name} (ID: ${engineer.engineer_id}), Month: ${monthNum} (${backendMonthKey}) ---`);
                console.log(`  Initial totalAllocatedForMonth: ${totalAllocatedForMonth}`);

                // Sum project allocations for this engineer and month
                projectAllocations.forEach(pa => {
                    if (pa.engineer_id === engineer.engineer_id && pa.allocation_month === backendMonthKey) {
                        totalAllocatedForMonth += pa.man_days_allocated;
                        console.log(`  - Added Project Allocation (ID: ${pa.allocation_id}, Days: ${pa.man_days_allocated}). Current totalAllocatedForMonth: ${totalAllocatedForMonth}`);
                    }
                });

                // Sum non-project allocations for this engineer and month
                nonProjectAllocations.forEach(npa => {
                    if (npa.engineer_id === engineer.engineer_id && npa.allocation_month === backendMonthKey) {
                        totalAllocatedForMonth += npa.days_allocated;
                        console.log(`  - Added Non-Project Allocation (ID: ${npa.non_project_allocation_id}, Type: ${npa.type}, Days: ${npa.days_allocated}). Current totalAllocatedForMonth: ${totalAllocatedForMonth}`);
                    }
                });

                row[`month_${monthNum}_total`] = totalAllocatedForMonth;
                console.log(`  Final calculated totalAllocatedForMonth: ${totalAllocatedForMonth}`);

                // Get engineer capacity for the specific month
                const engineerCapacity = monthlyCapacity[engineer.engineer_id]?.[backendMonthKey] || 0;
                console.log(`  Engineer Capacity (from monthlyCapacity): ${engineerCapacity} for Engineer ID ${engineer.engineer_id}, Month Key ${backendMonthKey}`);
                if (monthlyCapacity[engineer.engineer_id] === undefined) {
                    console.warn(`  WARNING: monthlyCapacity does not contain entry for Engineer ID: ${engineer.engineer_id}`);
                } else if (monthlyCapacity[engineer.engineer_id]?.[backendMonthKey] === undefined) {
                    console.warn(`  WARNING: monthlyCapacity for Engineer ID ${engineer.engineer_id} does not contain entry for month: ${backendMonthKey}`);
                }

                row[`month_${monthNum}_remaining`] = engineerCapacity - totalAllocatedForMonth;
                console.log(`  Calculated Remaining: ${row[`month_${monthNum}_remaining`]} (Capacity - Total Allocated)`);
                console.log(`--- End Summary Calculation for Engineer: ${engineer.engineer_name}, Month: ${monthNum} ---`);
                // --- END DEBUGGING LOGS FOR SUMMARY CALCULATION ---
            });
            rows.push(row);
        });
        console.log("Generated Summary Row Data:", rows); // Final overview
        return rows;
    }, [engineers, projectAllocations, nonProjectAllocations, monthlyCapacity, selectedYear, months]);

    // ... (rest of your component code, column definitions, onCellValueChanged, render)
};

export default PlanningPage;
