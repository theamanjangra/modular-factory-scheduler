import { useMemo, useRef, useState, useEffect } from 'react';
import { AlertCircle, Calendar, Download, Loader2, Play, Upload } from 'lucide-react';
import { usePlanData, type MultiShiftOptions, type SchedulingConfig } from '../hooks/usePlanData';
import { PlanGanttVisualization } from './PlanGanttVisualization';
import type { AdjustmentResult } from '../types';
import PlanAdjustmentPanel from './PlanAdjustmentPanel';
import { formatInTimeZone } from 'date-fns-tz';
import { FACTORY_TIMEZONE, timeToIso, getTimezoneAbbr } from '../utils/timezone';
import { MasterDataSelectors, type ShiftConfig } from './MasterDataSelectors';

/**
 * Calculate dynamic shift dates based on current time IN FACTORY TIMEZONE.
 * - Before 7 AM Chicago: Shift 1 = Today, Shift 2 = Tomorrow
 * - 7 AM or later Chicago: Shift 1 = Tomorrow, Shift 2 = Day After Tomorrow
 */
const getShiftDates = () => {
    const now = new Date();

    // Get current hour in factory timezone
    const currentHourInFactory = parseInt(formatInTimeZone(now, FACTORY_TIMEZONE, 'H'), 10);
    const SHIFT_START_HOUR = 7;

    // Helper to format date as YYYY-MM-DD in factory timezone
    const formatDate = (date: Date) => {
        return formatInTimeZone(date, FACTORY_TIMEZONE, 'yyyy-MM-dd');
    };

    // Helper to add days to a date
    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    // If before 7 AM in Chicago, plan for today; otherwise plan for tomorrow
    const shift1Date = currentHourInFactory < SHIFT_START_HOUR ? now : addDays(now, 1);
    const shift2Date = addDays(shift1Date, 1);

    return {
        shift1Date: formatDate(shift1Date),
        shift2Date: formatDate(shift2Date),
        isNextDay: currentHourInFactory >= SHIFT_START_HOUR
    };
};

export const ResultsPage = () => {
    const { data, loading, error, runMultiShift, exportMultiShift, adjustPlan, runSimulation } = usePlanData();
    // NEW: Dynamic Shift Configuration (Array-based)
    const [shiftsConfig, setShiftsConfig] = useState<ShiftConfig[]>([
        {
            id: 'shift-1',
            dbShiftId: '',
            name: 'Shift 1',
            date: new Date().toISOString().split('T')[0], // Default to today
            startTime: '07:00',
            endTime: '15:00',
            productionRate: 0.75
        }
    ]);

    const [minAssignmentMinutes, setMinAssignmentMinutes] = useState<30 | 60 | 90>(30);
    const [timeStepMinutes, setTimeStepMinutes] = useState(5);
    const [transitionGapMs, setTransitionGapMs] = useState(0);
    const [adjustmentResult, setAdjustmentResult] = useState<AdjustmentResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // NEW: JSON Preview Upload State
    const jsonFileInputRef = useRef<HTMLInputElement>(null);
    const [localJsonData, setLocalJsonData] = useState<any>(null);

    // NEW: DB Selections State
    const [dbSelections, setDbSelections] = useState<{
        departmentId?: string;
        moduleProfileId?: string;
        travelerTemplateId?: string;
        shift1Id?: string; // Legacy/Compat helper
        shift2Id?: string; // Legacy/Compat helper
    }>({});

    // Initialize shift dates on mount/re-calc
    useEffect(() => {
        const { shift1Date, shift2Date } = getShiftDates();
        setShiftsConfig(prev => {
            if (prev.length === 0) return prev;
            // Only auto-update if they are "default" looking?
            // Or just update the first two if they are generic shift-1/shift-2?
            const next = [...prev];
            if (next[0] && next[0].id === 'shift-1' && next[0].dbShiftId === '') {
                next[0].date = shift1Date;
            }
            if (next.length > 1 && next[1].id === 'shift-2' && next[1].dbShiftId === '') {
                next[1].date = shift2Date;
            }
            return next;
        });
    }, []);

    const schedulingConfig: SchedulingConfig = {
        minAssignmentMinutes,
        timeStepMinutes,
        transitionGapMs
    };

    // Calculate dynamic dates - recalculates when component renders
    const shiftDates = useMemo(() => getShiftDates(), []);

    const planWindow = useMemo(() => {
        const source = Array.isArray(data?.rawMultiShift?.assignments)
            ? data?.rawMultiShift?.assignments
            : (data?.items || []);

        let startMs = Number.POSITIVE_INFINITY;
        let endMs = Number.NEGATIVE_INFINITY;

        source.forEach((a: any) => {
            const startStr = a.startDate || a.startTime;
            const endStr = a.endDate || a.endTime;
            const s = new Date(startStr || '').getTime();
            const e = new Date(endStr || '').getTime();
            if (isNaN(s) || isNaN(e)) return;
            if (s < startMs) startMs = s;
            if (e > endMs) endMs = e;
        });

        if (!isFinite(startMs) || !isFinite(endMs)) return null;
        return { startIso: new Date(startMs).toISOString(), endIso: new Date(endMs).toISOString() };
    }, [data]);

    // NEW: Filter Data by Department
    const filteredData = useMemo(() => {
        if (!data) return null;
        if (!dbSelections.departmentId) return data;

        // 1. Identify tasks belonging to the selected department
        console.log('DEBUG: Filtering for Dept ID:', dbSelections.departmentId);
        const departmentTaskIds = new Set<string>();
        const targetDeptId = (dbSelections.departmentId || '').trim().toLowerCase().replace(/-/g, '');

        const filteredTasks = (data.tasks || []).filter((t, idx) => {
            if (!t.departmentId) return false;
            const tDeptId = t.departmentId.trim().toLowerCase().replace(/-/g, '');

            if (idx === 0) {
                console.log('DEBUG: First Task Structure:', JSON.stringify(t));
                console.log(`DEBUG: Normalized Comparison: '${tDeptId}' === '${targetDeptId}' is ${tDeptId === targetDeptId}`);
            }

            if (tDeptId === targetDeptId) {
                departmentTaskIds.add(t.taskId);
                return true;
            }
            return false;
        });

        console.log(`DEBUG: Found ${filteredTasks.length} tasks for dept. IDs:`, Array.from(departmentTaskIds));

        // 2. Filter assignments to only include those tasks
        const filteredAssignments = (data.assignments || []).filter(a => {
            // Always keep comments/markers
            if (a.type === 'comment') return true;
            // If it's a task assignment, check if it's in the allowed set
            if (a.taskId) {
                return departmentTaskIds.has(a.taskId);
            }
            return false;
        });

        console.log(`DEBUG: Filtered assignments: ${filteredAssignments.length} / ${data.assignments?.length}`);

        return {
            ...data,
            tasks: filteredTasks,
            assignments: filteredAssignments
        };
    }, [data, dbSelections.departmentId]);

    const handleAdjustPlan = async (
        updates: { taskId: string; laborHoursRemaining: number }[],
        currentTimeOverride?: string,
        workerUpdates?: { workerId: string; availability: { startTime: string; endTime: string; } }[]
    ) => {
        const result = await adjustPlan(updates, currentTimeOverride, workerUpdates, schedulingConfig);
        if (result) {
            setAdjustmentResult(result);
        }
        return result;
    };


    const handleRunMultiShift = () => {
        if (!fileInputRef.current?.files?.[0]) {
            // Future: Allow running without file if DB selections are present
            if (dbSelections.moduleProfileId && dbSelections.travelerTemplateId) {
                console.log("Running from DB Selections (Simulation):", dbSelections);
                // Note: Actual implementation deferred until backend endpoint exists
            }
            return;
        }

        setAdjustmentResult(null); // Clear previous adjustment on new run

        // Build wall-clock ISO (no timezone conversion; matches backend expectations).
        const toWallClockIso = (hhmm: string, date: string) => `${date}T${hhmm.padStart(5, '0')}:00.000Z`;

        // Sort shifts by time?
        const sortedShifts = [...shiftsConfig].sort((a, b) =>
            new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
        );

        if (sortedShifts.length === 0) {
            alert("Please configure at least one shift.");
            return;
        }

        const firstShift = sortedShifts[0];
        const lastShift = sortedShifts[sortedShifts.length - 1];

        // Construct dynamic options
        // We might need to extend MultiShiftOptions interface in `usePlanData` if it strictly expects shift1/shift2
        // For NOW, we map the first 2 shifts to shift1/shift2 fields to maintain compatibility 
        // with the EXISTING `usePlanData` hook signature, 
        // UNTIL we update `usePlanData` to take the array directly.
        // TODO: Update `usePlanData` to accept `shifts: ShiftConfig[]`.

        // But wait, the BACKEND already accepts `shifts` array? 
        // Yes, via `MultiShiftFilePlanRequest`. 
        // We need to modify `usePlanData` to pass this array.
        // Let's assume `usePlanData` updates are part of this refactor.
        // For this step, I will construct the object as if `usePlanData` handles it, 
        // and then I will go update `usePlanData`.

        const options: any = { // Cast to any temporarily or update interface
            shifts: sortedShifts.map(s => ({
                id: s.id,
                startTime: toWallClockIso(s.startTime, s.date),
                endTime: toWallClockIso(s.endTime, s.date),
                productionRate: s.productionRate
            })),
            startTime: toWallClockIso(firstShift.startTime, firstShift.date),
            endTime: toWallClockIso(lastShift.endTime, lastShift.date), // Overall window
            scheduling: schedulingConfig
        };

        runMultiShift(fileInputRef.current.files[0], options);
    };

    const handleExportMultiShift = () => {
        if (!fileInputRef.current?.files?.[0]) return;

        const toWallClockIso = (hhmm: string, date: string) => `${date}T${hhmm.padStart(5, '0')}:00.000Z`;
        const sortedShifts = [...shiftsConfig].sort((a, b) =>
            new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
        );
        const firstShift = sortedShifts[0];
        const lastShift = sortedShifts[sortedShifts.length - 1];

        const options: any = {
            shifts: sortedShifts.map(s => ({
                id: s.id,
                startTime: toWallClockIso(s.startTime, s.date),
                endTime: toWallClockIso(s.endTime, s.date),
                productionRate: s.productionRate
            })),
            startTime: toWallClockIso(firstShift.startTime, firstShift.date),
            endTime: toWallClockIso(lastShift.endTime, lastShift.date),
            scheduling: schedulingConfig
        };

        exportMultiShift(fileInputRef.current.files[0], options);
    };

    const handleUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text);
                const debug = json._debug || {};

                // UUID normalizer: workerTasks use "F337B765-A941-..."
                // but _debug maps use "f337b765a941..." (lowercase, no dashes)
                const norm = (id: string) => id.toLowerCase().replace(/-/g, '');

                // Short label for task IDs with no human-readable name
                const shortId = (id: string) => `Task-${id.slice(0, 6).toUpperCase()}`;

                // Build lookup maps — all keyed by normalized ID
                const taskNameMap = new Map<string, string>();
                const taskDeptMap = new Map<string, string>();
                const dbTaskLookup = new Map<string, any>();
                const workerNameMap = new Map<string, string>();

                // Populate from _debug.taskDepts
                for (const [k, v] of Object.entries(debug.taskDepts || {})) {
                    taskDeptMap.set(norm(k), v as string);
                }

                // Populate from _debug.workers
                if (Array.isArray(debug.workers)) {
                    debug.workers.forEach((w: any) => {
                        if (w.id || w.workerId) {
                            const nid = norm(w.id || w.workerId);
                            workerNameMap.set(nid, w.name || w.id || w.workerId);
                        }
                    });
                }

                // Populate from _debug.availableDbTasks
                if (Array.isArray(debug.availableDbTasks)) {
                    debug.availableDbTasks.forEach((t: any) => {
                        const nid = norm(t.id);
                        taskNameMap.set(nid, t.name || t.id);
                        dbTaskLookup.set(nid, t);
                        if (t.deptId && !taskDeptMap.has(nid)) {
                            taskDeptMap.set(nid, t.deptId);
                        }
                    });
                }

                // Step 1: Flatten workerTasks from all shifts into assignments,
                // and collect deficitTasks from each shift.
                let assignments: any[] = [];
                const workerIdSet = new Set<string>();
                const assignmentTaskIds = new Set<string>();
                const deficitMap = new Map<string, number>(); // normalized taskId → deficit hours

                const shifts = json.productionPlanShifts || json.shifts || [];
                shifts.forEach((shift: any) => {
                    // Collect workerTasks
                    if (shift.workerTasks && Array.isArray(shift.workerTasks)) {
                        shift.workerTasks.forEach((wt: any) => {
                            workerIdSet.add(wt.workerId);
                            assignmentTaskIds.add(wt.taskId);
                            assignments.push({
                                id: wt.id,
                                workerId: wt.workerId,
                                taskId: wt.taskId,
                                taskName: taskNameMap.get(norm(wt.taskId)) || shortId(wt.taskId),
                                departmentId: taskDeptMap.get(norm(wt.taskId)),
                                startDate: wt.startDate,
                                endDate: wt.endDate,
                                type: 'assignment' as const,
                                shiftId: shift.id || shift.shift?.id
                            });
                        });
                    }
                    // Collect deficitTasks
                    if (shift.deficitTasks && Array.isArray(shift.deficitTasks)) {
                        shift.deficitTasks.forEach((dt: any) => {
                            const nid = norm(dt.taskId);
                            deficitMap.set(nid, (deficitMap.get(nid) || 0) + (dt.deficitHours || 0));
                        });
                    }
                });

                // Step 2: Compute worked hours per task from assignment durations
                const workedHoursMap = new Map<string, number>(); // normalized taskId → hours
                assignments.forEach(a => {
                    const s = new Date(a.startDate).getTime();
                    const e = new Date(a.endDate).getTime();
                    if (isNaN(s) || isNaN(e)) return;
                    const hrs = (e - s) / (1000 * 60 * 60);
                    const nid = norm(a.taskId);
                    workedHoursMap.set(nid, (workedHoursMap.get(nid) || 0) + hrs);
                });

                // Step 3: Build tasks array using assignment task IDs as canonical
                // (these match the format used in workerTasks, so Gantt lookups work).
                // Also include deficit-only tasks that have no assignments.
                const seenNormIds = new Set<string>();
                const canonicalTaskIds: string[] = [];

                // First: all tasks that have assignments (original format)
                for (const id of assignmentTaskIds) {
                    const nid = norm(id);
                    if (!seenNormIds.has(nid)) {
                        seenNormIds.add(nid);
                        canonicalTaskIds.push(id);
                    }
                }

                // Note: deficit-only tasks (no assignments) are excluded —
                // nothing to visualize on the Gantt for them.

                const tasks = json.tasks || canonicalTaskIds.map((id: string) => {
                    const nid = norm(id);
                    const dbTask = dbTaskLookup.get(nid);
                    const limits = debug.taskWorkerLimits?.[nid];
                    const worked = workedHoursMap.get(nid) || 0;
                    const deficit = deficitMap.get(nid) || 0;
                    // Total = worked + deficit. If no deficit, task is fully scheduled.
                    const totalHours = worked + deficit;
                    return {
                        taskId: id,
                        name: dbTask?.name || taskNameMap.get(nid) || shortId(id),
                        departmentId: dbTask?.deptId || taskDeptMap.get(nid),
                        minWorkers: dbTask?.minW ?? limits?.min,
                        maxWorkers: dbTask?.maxW ?? limits?.max,
                        estimatedTotalLaborHours: totalHours > 0 ? totalHours : undefined
                    };
                });

                // Step 4: Build workers array — short readable labels
                const sortedWorkerIds = Array.from(workerIdSet).sort();
                const workers = json.workers || sortedWorkerIds.map((id, idx) => ({
                    workerId: id,
                    name: workerNameMap.get(norm(id)) || `Worker ${idx + 1}`,
                    skills: []
                }));

                const adaptedData = {
                    ...json,
                    version: json.version || 'json-preview',
                    assignments: assignments.length ? assignments : (json.assignments || []),
                    tasks,
                    workers
                };

                setLocalJsonData(adaptedData);
                console.log("JSON Preview loaded:", {
                    assignments: assignments.length,
                    tasks: tasks.length,
                    workers: workers.length,
                    shifts: shifts.length,
                    deficits: deficitMap.size
                });
            } catch (err) {
                console.error("Failed to parse JSON preview:", err);
                alert("Invalid JSON file uploaded. Check console for details.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-200 p-4">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Apple-style Control Panel */}
                <div className="bg-white/80 backdrop-blur-md border border-gray-200 p-4 rounded-2xl flex flex-wrap items-center gap-4 shadow-sm sticky top-2 z-30 transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mr-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <span className="text-xl font-semibold">M</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Minimalist Planner</h1>
                            <span className="text-xs font-medium text-gray-500">Version 2.3</span>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>

                    {/* NEW: DB Selectors */}
                    <MasterDataSelectors
                        shiftsConfig={shiftsConfig}
                        onShiftsConfigChange={setShiftsConfig}
                        departmentId={dbSelections.departmentId}
                        moduleProfileId={dbSelections.moduleProfileId}
                        travelerTemplateId={dbSelections.travelerTemplateId}
                        onOtherSelectionChange={(sel) => setDbSelections(prev => ({ ...prev, ...sel }))}
                    />

                    <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>

                    <div className="flex items-center gap-2 bg-gray-100/50 p-1.5 rounded-xl border border-gray-200/50 hover:bg-gray-100 transition-colors">
                        <Upload size={16} className="text-gray-400 ml-2" />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx"
                            className="bg-transparent text-sm text-gray-600 w-[200px] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-gray-700 file:shadow-sm hover:file:bg-gray-50 transition-all focus:outline-none cursor-pointer"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-indigo-50/50 p-1.5 rounded-xl border border-indigo-100/50 hover:bg-indigo-50 transition-colors">
                        <Upload size={16} className="text-indigo-400 ml-2" />
                        <input
                            ref={jsonFileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleUploadJson}
                            className="bg-transparent text-sm text-indigo-600 w-[200px] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-indigo-700 file:shadow-sm hover:file:bg-indigo-50 transition-all focus:outline-none cursor-pointer"
                        />
                    </div>



                    {/* Scheduling Configuration */}
                    <div className="flex items-center gap-3 bg-gray-100/50 px-4 py-2 rounded-xl border border-gray-200/50">
                        <div className="flex flex-col text-xs text-gray-500">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">Scheduling</span>
                            </div>
                            <div className="flex gap-2 items-center mt-1 flex-wrap">
                                <label className="flex items-center gap-1">
                                    Min Assignment
                                    <select
                                        value={minAssignmentMinutes}
                                        onChange={(e) => setMinAssignmentMinutes(Number(e.target.value) as 30 | 60 | 90)}
                                        className="border rounded px-2 py-1 text-xs w-20"
                                    >
                                        <option value={30}>30</option>
                                        <option value={60}>60</option>
                                        <option value={90}>90</option>
                                    </select>
                                    <span className="text-[10px] text-gray-400">min</span>
                                </label>
                                <label className="flex items-center gap-1">
                                    Time Step
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={timeStepMinutes}
                                        onChange={(e) => {
                                            const next = Number(e.target.value);
                                            setTimeStepMinutes(Number.isFinite(next) && next > 0 ? next : 1);
                                        }}
                                        className="border rounded px-2 py-1 text-xs w-20"
                                    />
                                    <span className="text-[10px] text-gray-400">min</span>
                                </label>
                                <label className="flex items-center gap-1">
                                    Transition Gap
                                    <input
                                        type="number"
                                        min={0}
                                        step={1000}
                                        value={transitionGapMs}
                                        onChange={(e) => {
                                            const next = Number(e.target.value);
                                            setTransitionGapMs(Number.isFinite(next) && next >= 0 ? next : 0);
                                        }}
                                        className="border rounded px-2 py-1 text-xs w-24"
                                    />
                                    <span className="text-[10px] text-gray-400">ms</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleRunMultiShift}
                        disabled={loading}
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-700/10 active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} fill="white" />}
                        Run Planning
                    </button>

                    <button
                        onClick={() => {
                            // Build wall-clock ISO (no timezone conversion; matches backend expectations).
                            const toWallClockIso = (hhmm: string, date: string) => `${date}T${hhmm.padStart(5, '0')}:00.000Z`;

                            const sortedShifts = [...shiftsConfig].sort((a, b) =>
                                new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
                            );

                            if (sortedShifts.length === 0) return;

                            const firstShift = sortedShifts[0];
                            const lastShift = sortedShifts[sortedShifts.length - 1];

                            // Map to legacy structure where possible, but use new structure primarily
                            // The backend simulation endpoint needs to support `shifts` array too if we want true fidelity.
                            // For now, let's map `shifts` array into the options.

                            const options: any = { // Cast to any to bypass strict MultiShiftOptions if it's not updated yet
                                shifts: sortedShifts.map(s => ({
                                    id: s.id,
                                    startTime: toWallClockIso(s.startTime, s.date),
                                    endTime: toWallClockIso(s.endTime, s.date),
                                    productionRate: s.productionRate
                                })),
                                startTime: toWallClockIso(firstShift.startTime, firstShift.date),
                                endTime: toWallClockIso(lastShift.endTime, lastShift.date),

                                // Legacy Compat (approximation)
                                shift1StartTime: toWallClockIso(firstShift.startTime, firstShift.date),
                                shift1EndTime: toWallClockIso(firstShift.endTime, firstShift.date),
                                useShift2: sortedShifts.length > 1,
                                startingShiftPct: firstShift.productionRate,
                                endingShiftPct: lastShift.productionRate,

                                scheduling: schedulingConfig
                            };
                            if (sortedShifts.length > 1) {
                                options.shift2StartTime = toWallClockIso(sortedShifts[1].startTime, sortedShifts[1].date);
                                options.shift2EndTime = toWallClockIso(sortedShifts[1].endTime, sortedShifts[1].date);
                            }

                            runSimulation(options);
                            runSimulation(options);
                        }}
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-700/10 active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} fill="white" />}
                        Simulate (Demo)
                    </button>

                    <button
                        onClick={handleExportMultiShift}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md shadow-emerald-700/10 active:scale-95"
                    >
                        <Download size={16} />
                        Export Results
                    </button>

                    {error && (
                        <div className="ml-auto text-red-600 text-sm flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 animate-in fade-in slide-in-from-right-5">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                </div>



                {/* Visualization Area */}
                {localJsonData || filteredData ? (
                    <div className="h-[650px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                        <PlanGanttVisualization
                            data={localJsonData || filteredData}
                            highlightedTaskIds={adjustmentResult ? new Set(adjustmentResult.impactedTasks.map(t => t.taskId)) : undefined}
                        />
                    </div>
                ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                        <div className="p-4 bg-white rounded-full mb-4 shadow-sm border border-gray-100">
                            <Play size={32} className="text-gray-300 ml-1" />
                        </div>
                        <p className="font-medium">Upload a file to begin strategic planning</p>
                    </div>
                )}

                {/* ===== PLAN ADJUSTMENT PANEL ===== */}
                {filteredData && filteredData.tasks && filteredData.tasks.length > 0 && (
                    <div className="mt-8 mb-8 bg-white/50 backdrop-blur-sm rounded-2xl p-1 border border-gray-100/50">
                        <PlanAdjustmentPanel
                            tasks={filteredData.tasks}
                            workers={filteredData.workers || []}
                            planId={filteredData.planId}
                            planStartTime={planWindow?.startIso}
                            onAdjust={handleAdjustPlan}
                            isLoading={loading}
                            // NEW: Pass shift configuration
                            shift1={shiftsConfig[0] ? {
                                date: shiftsConfig[0].date,
                                startTime: shiftsConfig[0].startTime,
                                endTime: shiftsConfig[0].endTime
                            } : undefined}
                            shift2={shiftsConfig[1] ? {
                                date: shiftsConfig[1].date,
                                startTime: shiftsConfig[1].startTime,
                                endTime: shiftsConfig[1].endTime
                            } : undefined}
                            useShift2={shiftsConfig.length > 1}
                        />
                    </div>
                )}

                {/* Raw Data (Collapsible/Below Fold) */}
                {data && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 opacity-60 hover:opacity-100 transition-opacity duration-300">
                        {data.idleWorkers && <RawDataCard title="Idle Windows" data={data.idleWorkers} />}
                        {data.deficitTasks && <RawDataCard title="Deficit Tasks" data={data.deficitTasks} />}
                        {data.rawMultiShift && <RawDataCard title="Raw Multi-Shift Response" data={data.rawMultiShift} />}
                    </div>
                )}
            </div>
        </div>
    );
};

const RawDataCard = ({ title, data }: { title: string, data: any }) => (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 h-[300px] overflow-auto shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-white pb-2">{title}</h3>
        <pre className="text-[10px] text-gray-500 font-mono leading-relaxed">{JSON.stringify(data, null, 2)}</pre>
    </div>
);
