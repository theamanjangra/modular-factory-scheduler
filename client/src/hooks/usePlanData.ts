import { useState } from 'react';
import type { AdjustmentResult, Assignment, PlanResponse } from '../types';

/**
 * Calculate dynamic date for single-shift planning:
 * - Before 7 AM: Use today's date
 * - 7 AM or later: Use tomorrow's date
 */
const getDynamicDate = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const SHIFT_START_HOUR = 7;

    // If before 7 AM, plan for today; otherwise plan for tomorrow
    const planDate = currentHour < SHIFT_START_HOUR ? now : new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const y = planDate.getFullYear();
    const m = String(planDate.getMonth() + 1).padStart(2, '0');
    const d = String(planDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

interface UsePlanDataResult {
    data: PlanResponse | null;
    loading: boolean;
    error: string | null;
    runSimulation: () => Promise<void>;
    runPlanFile: (file: File, shiftLength?: number) => Promise<void>;
    exportResults: (file: File, shiftLength?: number) => Promise<void>;
    runMultiShift: (file: File, options: MultiShiftOptions) => Promise<void>;
    exportMultiShift: (file: File, options: MultiShiftOptions) => Promise<void>;
    adjustPlan: (
        updates: { taskId: string; laborHoursRemaining: number }[],
        currentTimeOverride?: string,
        workerUpdates?: { workerId: string; availability: { startTime: string; endTime: string; } }[],
        scheduling?: SchedulingConfig
    ) => Promise<AdjustmentResult | null>;
}

export interface SchedulingConfig {
    minAssignmentMinutes: 30 | 60 | 90;
    timeStepMinutes: number;
    transitionGapMs: number;
}

export interface MultiShiftOptions {
    startTime: string;
    endTime: string;
    startingShiftId: string;
    endingShiftId: string;
    shift1StartTime: string;
    shift1EndTime: string;
    useShift2: boolean;
    shift2StartTime?: string;
    shift2EndTime?: string;
    startingShiftPct: number;
    endingShiftPct?: number;
    scheduling?: SchedulingConfig;
}

export function usePlanData(): UsePlanDataResult {
    const [data, setData] = useState<PlanResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Define API Base URL
    // In DEV (Port 5173), we rely on Vite Proxy (forwarding /api -> Cloud).
    // In PROD, we also use relative paths.
    // So we default to '' unless specific override is provided.
    const API_BASE_URL = import.meta.env.VITE_API_URL || '';

    const normalizeIso = (d?: string) => d ? new Date(d).toISOString() : '';
    const normalizeWorkerId = (workerId?: string | null) => {
        if (!workerId) return null;
        const trimmed = workerId.trim().toLowerCase();
        if (trimmed === 'n/a' || trimmed === 'no assignments' || trimmed === 'null' || trimmed === 'gap_virtual_worker' || trimmed === '__wait__') {
            return null;
        }
        return workerId;
    };

    const consolidateAssignments = (items: Assignment[]) => {
        if (items.length === 0) return [];

        const sorted = [...items].sort((a, b) => {
            const wA = a.workerId || '';
            const wB = b.workerId || '';
            if (wA !== wB) return wA.localeCompare(wB);
            return new Date(a.startTime || a.startDate || '').getTime() - new Date(b.startTime || b.startDate || '').getTime();
        });

        const consolidated: Assignment[] = [];
        let current = { ...sorted[0] };

        for (let i = 1; i < sorted.length; i++) {
            const item = sorted[i];
            const currentEnd = new Date(current.endTime || current.endDate || '').getTime();
            const itemStart = new Date(item.startTime || item.startDate || '').getTime();

            if (
                item.workerId === current.workerId &&
                item.taskId === current.taskId &&
                item.taskName === current.taskName &&
                item.isWaitTask === current.isWaitTask &&
                Math.abs(itemStart - currentEnd) <= 60000
            ) {
                current.endTime = item.endTime || item.endDate;
                current.endDate = current.endTime;
            } else {
                consolidated.push(current);
                current = { ...item };
            }
        }

        consolidated.push(current);
        return consolidated;
    };

    const processMultiShiftResponse = (json: any, startTime: string) => {
        const tasks = json.tasks || [];
        const taskNameMap = new Map(tasks.map((t: any) => [t.taskId, t.name]));

        const rawAssignments = (json.assignments || []).map((a: any) => ({
            workerId: a.workerId,
            taskId: a.taskId,
            taskName: taskNameMap.get(a.taskId) || a.taskId,
            startTime: a.startDate || a.startTime,
            endTime: a.endDate || a.endTime,
            type: 'assignment' as const,
            isWaitTask: a.isWaitTask
        }));

        const rawIdle = (json.idleWorkers || []).map((a: any, idx: number) => ({
            workerId: a.workerId,
            taskId: a.taskId || `idle_${idx}`,
            taskName: 'IDLE',
            startTime: a.startDate || a.startTime,
            endTime: a.endDate || a.endTime,
            type: 'assignment' as const
        }));

        const assignments = consolidateAssignments(rawAssignments);
        const idle = consolidateAssignments(rawIdle);

        const deficitComments = (json.deficitTasks || []).map((d: any, _idx: number) => ({
            comment: `Deficit ${d.taskId}: ${Number(d.deficitHours || 0).toFixed(2)}h`,
            startTime: startTime, // Anchor comment to start of plan
            type: 'comment' as const
        }));

        const workers = json.workers || [];
        const workerNameMap = new Map(workers.map((w: any) => [w.workerId, w.name || w.workerId]));

        const assignmentsWithNames = assignments.map((a: any) => ({
            ...a,
            workerName: workerNameMap.get(a.workerId) || a.workerId
        }));

        const idleWithNames = idle.map((a: any) => ({
            ...a,
            workerName: workerNameMap.get(a.workerId) || a.workerId
        }));

        return {
            version: 'multi-shift-v2',
            planId: json.planId || 'simulation',
            assignments: [...assignmentsWithNames, ...idleWithNames, ...deficitComments],
            items: assignmentsWithNames,
            idleWorkers: idleWithNames,
            deficitTasks: json.deficitTasks,
            rawMultiShift: json,
            tasks,
            workers
        };
    };

    const runPlanFile = async (file: File, shiftLength: number = 10) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const planDate = getDynamicDate();
            const startHour = 7;
            const endHour = startHour + shiftLength;
            const startTime = `${planDate}T${startHour.toString().padStart(2, '0')}:00:00Z`;
            const endTime = `${planDate}T${endHour.toString().padStart(2, '0')}:00:00Z`;
            formData.append('startTime', startTime);
            formData.append('endTime', endTime);

            const res = await fetch(`${API_BASE_URL}/api/v1/worker-tasks/plan-file`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || res.statusText);
            }

            const json: PlanResponse = await res.json();
            setData(json);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const runSimulation = async () => {
        setLoading(true);
        setError(null);
        console.log("Triggering Simulation via API...");
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/schedule/simulate`, {
                method: 'POST'
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || res.statusText);
            }

            const json = await res.json();
            console.log("Simulation Result:", json);
            // Simulation returns a MultiShiftPlanResponse.
            // We use current time or the plan's start time for UI anchoring
            const startTime = json.shift1Summary?.shiftId ? new Date().toISOString() : getDynamicDate() + 'T07:00:00Z';

            const processed = processMultiShiftResponse(json, startTime);
            setData(processed);
        } catch (err: any) {
            console.error("Simulation Error:", err);
            setError(err.message || "Simulation failed");
        } finally {
            setLoading(false);
        }
    };

    const exportResults = async (file: File, shiftLength: number = 10) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const planDate = getDynamicDate();
            const startHour = 7;
            const endHour = startHour + shiftLength;
            const startTime = `${planDate}T${startHour.toString().padStart(2, '0')}:00:00Z`;
            const endTime = `${planDate}T${endHour.toString().padStart(2, '0')}:00:00Z`;

            formData.append('startTime', startTime);
            formData.append('endTime', endTime);

            const res = await fetch(`${API_BASE_URL}/api/v1/worker-tasks/plan-file-export`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error(await res.text());

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "results.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err: any) {
            console.error(err);
            alert("Export failed: " + err.message);
        }
    };

    const runMultiShift = async (file: File, options: MultiShiftOptions) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('startTime', options.startTime);
            formData.append('endTime', options.endTime);
            formData.append('startingShift', options.startingShiftId);
            formData.append('endingShift', options.endingShiftId);
            formData.append('shift1StartTime', options.shift1StartTime);
            formData.append('shift1EndTime', options.shift1EndTime);
            formData.append('startingShiftPct', String(options.startingShiftPct));

            if (options.useShift2 && options.shift2StartTime && options.shift2EndTime) {
                formData.append('shift2StartTime', options.shift2StartTime);
                formData.append('shift2EndTime', options.shift2EndTime);
                if (options.endingShiftPct !== undefined) {
                    formData.append('endingShiftPct', String(options.endingShiftPct));
                }
            }
            if (options.scheduling) {
                formData.append('minAssignmentMinutes', String(options.scheduling.minAssignmentMinutes));
                formData.append('timeStepMinutes', String(options.scheduling.timeStepMinutes));
                formData.append('transitionGapMs', String(options.scheduling.transitionGapMs));
            }

            const res = await fetch(`${API_BASE_URL}/api/v1/worker-tasks/plan-file-multishift-shiftids`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || res.statusText);
            }

            const json: any = await res.json();
            const processed = processMultiShiftResponse(json, options.startTime);
            setData(processed);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const exportMultiShift = async (file: File, options: MultiShiftOptions) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('startTime', options.startTime);
            formData.append('endTime', options.endTime);
            formData.append('shift1StartTime', options.shift1StartTime);
            formData.append('shift1EndTime', options.shift1EndTime);
            formData.append('startingShiftPct', String(options.startingShiftPct));

            if (options.useShift2 && options.shift2StartTime && options.shift2EndTime) {
                formData.append('shift2StartTime', options.shift2StartTime);
                formData.append('shift2EndTime', options.shift2EndTime);
                if (options.endingShiftPct !== undefined) {
                    formData.append('endingShiftPct', String(options.endingShiftPct));
                }
            }

            const res = await fetch(`${API_BASE_URL}/api/v1/worker-tasks/plan-file-multishift-export`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error(await res.text());

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "multi_shift_results.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err: any) {
            console.error(err);
            alert("Multi-Shift Export failed: " + err.message);
        }
    };

    const makeKey = (a: { workerId: string | null; taskId: string | null; startDate?: string; startTime?: string }) =>
        `${normalizeWorkerId(a.workerId) || ''}|${a.taskId || ''}|${normalizeIso(a.startDate || a.startTime)}`;

    const applyAdjustmentDiff = (data: PlanResponse, diff: AdjustmentResult): PlanResponse => {
        const taskNameMap = new Map((data.tasks || []).map(t => [t.taskId, t.name]));
        const workerNameMap = new Map((data.workers || []).map(w => [w.workerId, w.name]));

        const rawAssignments = Array.isArray(data.rawMultiShift?.assignments)
            ? data.rawMultiShift?.assignments.map((a: any) => ({
                workerId: normalizeWorkerId(a.workerId ?? null),
                taskId: a.taskId ?? null,
                startDate: a.startDate || a.startTime,
                endDate: a.endDate || a.endTime,
                isWaitTask: a.isWaitTask
            }))
            : (data.items || []).map(a => ({
                workerId: normalizeWorkerId(a.workerId),
                taskId: a.taskId,
                startDate: a.startDate || a.startTime,
                endDate: a.endDate || a.endTime,
                isWaitTask: a.isWaitTask
            }));

        const rawMap = new Map<string, any>(rawAssignments.map((a: any) => [makeKey(a), { ...a }]));

        // Removed
        diff.removedWorkerTasks.forEach(r => {
            const rWorkerId = normalizeWorkerId(r.workerId);
            const exactKey = makeKey({ workerId: rWorkerId, taskId: r.taskId, startDate: r.startDate });
            if (rawMap.has(exactKey)) {
                rawMap.delete(exactKey);
            } else {
                // Fuzzy match: Same worker/task, start time within 1000ms
                const rStart = new Date(r.startDate || '').getTime();
                const rEnd = new Date(r.endDate || '').getTime();
                for (const [key, val] of rawMap.entries()) {
                    const isSameWorker = val.workerId === rWorkerId ||
                        (normalizeWorkerId(val.workerId) === null && rWorkerId === null);

                    if (isSameWorker && val.taskId === r.taskId && val.startDate && val.endDate) {
                        const valStart = new Date(val.startDate).getTime();
                        const valEnd = new Date(val.endDate).getTime();
                        const overlaps = valStart < rEnd && valEnd > rStart;
                        if (Math.abs(valStart - rStart) < 1000 || overlaps) {
                            rawMap.delete(key);
                            break;
                        }
                    }
                }
            }
        });

        // Updated
        diff.updatedWorkerTasks.forEach(u => {
            const uWorkerId = normalizeWorkerId(u.workerId);
            let key = makeKey({ workerId: uWorkerId, taskId: u.taskId, startDate: u.startDate });
            let existing = rawMap.get(key);

            // Try fuzzy match for update as well
            if (!existing) {
                const uStart = new Date(u.startDate || '').getTime();
                for (const [k, val] of rawMap.entries()) {
                    if (val.workerId === uWorkerId && val.taskId === u.taskId && val.startDate) {
                        const valStart = new Date(val.startDate).getTime();
                        if (Math.abs(valStart - uStart) < 1000) {
                            existing = val;
                            key = k;
                            break;
                        }
                    }
                }
            }

            if (!existing && u.previousEndDate) {
                const prevEnd = new Date(u.previousEndDate).getTime();
                for (const [k, val] of rawMap.entries()) {
                    if (val.workerId === uWorkerId && val.taskId === u.taskId && val.endDate) {
                        const valEnd = new Date(val.endDate).getTime();
                        if (Math.abs(valEnd - prevEnd) < 1000) {
                            existing = val;
                            key = k;
                            break;
                        }
                    }
                }
            }

            if (existing) {
                existing.startDate = u.startDate;
                existing.endDate = u.endDate;
            }
        });

        // Added
        diff.addedWorkerTasks.forEach(a => {
            const aWorkerId = normalizeWorkerId(a.workerId);
            const newRaw = {
                workerId: aWorkerId,
                taskId: a.taskId,
                startDate: a.startDate,
                endDate: a.endDate,
                isWaitTask: aWorkerId === null ? true : undefined
            };
            rawMap.set(makeKey(newRaw), newRaw);
        });

        const nextRaw = Array.from(rawMap.values())
            .filter(a => a.taskId && (a.startDate || a.startTime))
            .sort((a, b) => (a.workerId || '').localeCompare(b.workerId || '') ||
                new Date(a.startDate || a.startTime || '').getTime() - new Date(b.startDate || b.startTime || '').getTime());

        const assignmentsFromRaw = nextRaw.flatMap((a: any) => {
            if (!a.taskId) return [];
            return [{
                workerId: a.workerId ?? null,
                workerName: a.workerId ? (workerNameMap.get(a.workerId) || a.workerId) : undefined,
                taskId: a.taskId,
                taskName: taskNameMap.get(a.taskId) || a.taskId,
                startTime: a.startDate || a.startTime,
                endTime: a.endDate || a.endTime,
                startDate: a.startDate || a.startTime,
                endDate: a.endDate || a.endTime,
                type: 'assignment' as const,
                isWaitTask: a.isWaitTask
            }];
        });

        const nextItems = consolidateAssignments(assignmentsFromRaw);
        const commentItems = (data.assignments || []).filter(a => (a as any).type === 'comment');

        return {
            ...data,
            rawMultiShift: {
                ...(data.rawMultiShift || {}),
                assignments: nextRaw
            },
            items: nextItems,
            assignments: [
                ...nextItems,
                ...(data.idleWorkers || []), // Keep existing idle unless diff provides new? Re-plan usually refreshes them.
                ...commentItems
            ],
            // Update these from the diff if present (Plan Adjustment returns them)
            deficitTasks: diff.deficitTasks || data.deficitTasks,
            idleWorkers: (diff.idleWorkers as any[]) || data.idleWorkers || []
        };
    };

    // Helper to remove idle blocks that clash with actual work
    const filterOverlappingIdle = (idleItems: any[], assignments: any[]) => {
        return idleItems.filter(idle => {
            const idleStart = new Date(idle.startTime || idle.startDate).getTime();
            const idleEnd = new Date(idle.endTime || idle.endDate).getTime();
            const workerId = idle.workerId;

            // If this idle block overlaps with ANY assignment for the same worker, drop it.
            // (A more advanced version would trim the idle block, but dropping is safer for UI cleanliness)
            const hasOverlap = assignments.some(task => {
                if (task.workerId !== workerId) return false;
                const taskStart = new Date(task.startTime || task.startDate).getTime();
                const taskEnd = new Date(task.endTime || task.endDate).getTime();

                // Check intersection
                return (idleStart < taskEnd - 1000) && (idleEnd > taskStart + 1000); // 1s buffer
            });

            return !hasOverlap;
        });
    };

    const getPlanWindow = (data: PlanResponse) => {
        const source = Array.isArray(data.rawMultiShift?.assignments)
            ? data.rawMultiShift?.assignments
            : (data.items || []);

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
        return { startMs, endMs };
    };

    /**
     * KAN-405: Adjust the current in-memory plan based on task labor updates.
     * Uses persistent API if planId exists.
     */
    const adjustPlan = async (
        updates: { taskId: string; laborHoursRemaining: number }[],
        currentTimeOverride?: string,
        workerUpdates?: { workerId: string; availability: { startTime: string; endTime: string; } }[],
        scheduling?: SchedulingConfig
    ): Promise<AdjustmentResult | null> => {
        // Require plan data to exist (but not necessarily a database planId)
        if (!data) {
            setError('No plan data. Run Multi-Shift planning first.');
            return null;
        }

        try {
            const nowMs = Date.now();
            const planWindow = getPlanWindow(data);
            const effectiveNowMs = planWindow
                ? Math.min(Math.max(nowMs, planWindow.startMs), planWindow.endMs)
                : nowMs;
            const overrideMs = currentTimeOverride ? new Date(currentTimeOverride).getTime() : NaN;
            if (currentTimeOverride && isNaN(overrideMs)) {
                setError('Invalid current time. Use a valid ISO timestamp.');
                return null;
            }

            // Determine if we use ephemeral mode (no database) or persistent mode
            const useEphemeral = !data.planId || data.planId === 'ephemeral';
            const effectivePlanId = useEphemeral ? 'ephemeral' : data.planId;

            // Build payload - ephemeral mode requires full plan data
            const payload: any = {
                currentTime: currentTimeOverride ? new Date(overrideMs).toISOString() : new Date(effectiveNowMs).toISOString(),
                updates,
                workerUpdates
            };
            if (scheduling) {
                payload.scheduling = scheduling;
            }

            if (useEphemeral) {
                // Ephemeral mode: Include full plan data in request
                payload.tasks = data.tasks || [];
                payload.workers = data.workers || [];
                // Extract originalAssignments from rawMultiShift
                payload.originalAssignments = (data.rawMultiShift?.assignments || []).map((a: any) => ({
                    workerId: a.workerId,
                    taskId: a.taskId,
                    startDate: a.startDate || a.startTime,
                    endDate: a.endDate || a.endTime,
                    isWaitTask: a.isWaitTask
                }));
            }

            const res = await fetch(`${API_BASE_URL}/api/v1/plans/${effectivePlanId}/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(await res.text());
            const diff: AdjustmentResult = await res.json();

            // Apply diff to local state
            const next = applyAdjustmentDiff(data, diff);
            setData(next);

            return diff;
        } catch (err: any) {
            console.error('[adjustPlan] API Error:', err);
            setError(err.message || 'Failed to adjust plan');
            return null;
        }
    };

    return { data, loading, error, runSimulation, runPlanFile, exportResults, runMultiShift, exportMultiShift, adjustPlan };
}
