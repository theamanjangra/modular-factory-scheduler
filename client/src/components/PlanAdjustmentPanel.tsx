import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, X, Clock, Play, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Pause } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
    getNowAsDatetimeLocal,
    getTimezoneAbbr
} from '../utils/timezone';

// Types
import type { AdjustmentResult, Task, Worker, TaskUpdate } from '../types';


interface ShiftWindow {
    date: string;        // YYYY-MM-DD
    startTime: string;   // HH:mm
    endTime: string;     // HH:mm
}

interface PlanAdjustmentPanelProps {
    tasks: Task[];
    workers: Worker[];
    planId: string | undefined;
    planStartTime: string | undefined;
    onAdjust: (
        updates: { taskId: string; laborHoursRemaining: number }[],
        currentTime?: string,
        workerUpdates?: { workerId: string; availability: { startTime: string; endTime: string; } }[]
    ) => Promise<AdjustmentResult | null>;
    isLoading?: boolean;
    // NEW: Shift window configuration
    shift1?: ShiftWindow;
    shift2?: ShiftWindow;
    useShift2?: boolean;
}

// Helper: Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

const stripZ = (iso: string) => iso.replace('Z', '');

// Helper: Keep "wall-clock" times consistent with the Gantt display.
const formatDateTime = (iso: string) => {
    try {
        return format(parseISO(stripZ(iso)), 'MMM d, HH:mm');
    } catch {
        return iso;
    }
};

const toDatetimeLocalWallClock = (iso: string): string => {
    if (!iso) return '';
    const withoutZ = stripZ(iso);
    return withoutZ.length >= 16 ? withoutZ.slice(0, 16) : withoutZ;
};

const fromDatetimeLocalWallClock = (localValue: string): string => {
    if (!localValue) return '';
    const value = localValue.endsWith('Z') ? localValue.slice(0, -1) : localValue;
    if (value.length === 16) {
        return `${value}:00.000Z`;
    }
    if (value.length === 19) {
        return `${value}.000Z`;
    }
    return `${value}Z`;
};

// Helper: Calculate hours difference
const hoursDiff = (start: string, end: string): number => {
    try {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        return (e - s) / (1000 * 60 * 60);
    } catch {
        return 0;
    }
};

export const PlanAdjustmentPanel: React.FC<PlanAdjustmentPanelProps> = ({
    tasks,
    workers,
    planId,
    planStartTime,
    onAdjust,
    isLoading = false,
    shift1,
    shift2,
    useShift2 = false,
}) => {
    // State
    const [isExpanded, setIsExpanded] = useState(true);
    const [taskUpdates, setTaskUpdates] = useState<TaskUpdate[]>([]);
    const [currentTime, setCurrentTime] = useState<string>('');
    const [result, setResult] = useState<AdjustmentResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [showAllIdle, setShowAllIdle] = useState(false);
    const lastPlanIdRef = useRef<string | undefined>(undefined);

    // KAN-468: Task Interruptions State
    const [selectedInterruptTask, setSelectedInterruptTask] = useState<string>('');
    const [interruptReason, setInterruptReason] = useState<'material' | 'equipment' | 'other'>('material');
    const [maxWorkersDuringInterrupt, setMaxWorkersDuringInterrupt] = useState<number>(0);
    const [interruptNotes, setInterruptNotes] = useState<string>('');
    const [activeInterruptions, setActiveInterruptions] = useState<any[]>([]);
    const [interruptResult, setInterruptResult] = useState<any>(null);
    const [interruptError, setInterruptError] = useState<string | null>(null);
    const [isCreatingInterrupt, setIsCreatingInterrupt] = useState(false);
    const [isResolvingInterrupt, setIsResolvingInterrupt] = useState<string | null>(null);

    // TEMPORARY: Time override for testing
    const [apiTimeOverride, setApiTimeOverride] = useState<string>('');
    const [isTimeOverrideActive, setIsTimeOverrideActive] = useState(false);

    useEffect(() => {
        if (!planId || !planStartTime) return;
        const isNewPlan = planId !== lastPlanIdRef.current;
        if (isNewPlan) {
            setWorkerUpdates([]);
            setTaskUpdates([]);
            setResult(null);
            setError(null);
        }
        if (isNewPlan || !currentTime) {
            setCurrentTime(toDatetimeLocalWallClock(planStartTime));
        }
        lastPlanIdRef.current = planId;
    }, [planId, planStartTime, currentTime]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    // Memoized task map for quick lookup
    const taskMap = useMemo(() => {
        const map = new Map<string, Task>();
        tasks.forEach(t => map.set(t.taskId, t));
        return map;
    }, [tasks]);

    // Memoized worker map for quick lookup
    const workerMap = useMemo(() => {
        const map = new Map<string, Worker>();
        workers.forEach(w => map.set(w.workerId, w));
        return map;
    }, [workers]);

    const [workerUpdates, setWorkerUpdates] = useState<any[]>([]);

    // Available tasks (not already in updates)
    const availableTasks = useMemo(() => {
        const usedIds = new Set(taskUpdates.map(u => u.taskId));
        return tasks.filter(t => !usedIds.has(t.taskId));
    }, [tasks, taskUpdates]);

    // Available workers (not already in updates)
    const availableWorkers = useMemo(() => {
        const usedIds = new Set(workerUpdates.map(u => u.workerId));
        return workers.filter(w => !usedIds.has(w.workerId));
    }, [workers, workerUpdates]);

    // Summary stats for results
    const summaryStats = useMemo(() => {
        if (!result) return null;
        const totalAdded = result.addedWorkerTasks.length;
        const totalRemoved = result.removedWorkerTasks.length;
        const totalUpdated = result.updatedWorkerTasks.length;
        const impactedCount = result.impactedTasks.filter(t => t.status !== 'UNAFFECTED').length;
        const workersReassigned = new Set([
            ...result.addedWorkerTasks.map(a => a.workerId),
            ...result.removedWorkerTasks.map(r => r.workerId),
        ]).size;
        return { totalAdded, totalRemoved, totalUpdated, impactedCount, workersReassigned };
    }, [result]);

    // Task Handlers
    const addTaskUpdate = () => {
        if (availableTasks.length === 0) return;
        const firstTask = availableTasks[0];
        setTaskUpdates(prev => [
            ...prev,
            {
                id: generateId(),
                taskId: firstTask.taskId,
                laborHoursRemaining: firstTask.estimatedRemainingLaborHours || firstTask.estimatedTotalLaborHours || 0,
            },
        ]);
    };

    const removeTaskUpdate = (id: string) => {
        setTaskUpdates(prev => prev.filter(u => u.id !== id));
    };

    const updateTaskSelection = (id: string, taskId: string) => {
        const task = taskMap.get(taskId);
        setTaskUpdates(prev =>
            prev.map(u =>
                u.id === id
                    ? {
                        ...u,
                        taskId,
                        laborHoursRemaining: task?.estimatedRemainingLaborHours || task?.estimatedTotalLaborHours || 0,
                    }
                    : u
            )
        );
    };

    const updateHours = (id: string, hours: number) => {
        setTaskUpdates(prev => prev.map(u => (u.id === id ? { ...u, laborHoursRemaining: hours } : u)));
    };

    const setNow = () => {
        // Get current time in factory timezone as datetime-local format
        setCurrentTime(getNowAsDatetimeLocal());
    };

    const setPlanStart = () => {
        if (planStartTime) {
            // Keep wall-clock time aligned with the plan data format.
            setCurrentTime(toDatetimeLocalWallClock(planStartTime));
        }
    };

    // KAN-468: Task Interruption Handlers
    const handleCreateInterruption = async () => {
        if (!planId || !selectedInterruptTask) {
            setInterruptError('Select a task first');
            return;
        }
        setInterruptError(null);
        setInterruptResult(null);
        setIsCreatingInterrupt(true);
        try {
            const API_BASE = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_BASE}/api/v1/worker-tasks/${planId}/interruptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: selectedInterruptTask,
                    reason: interruptReason,
                    maxWorkersDuringInterruption: maxWorkersDuringInterrupt,
                    notes: interruptNotes || undefined
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Create interruption failed');
            }
            setInterruptResult({ action: 'CREATE', ...data });
            setActiveInterruptions(prev => [...prev, data.interruption]);
            setSelectedInterruptTask('');
            setInterruptNotes('');
        } catch (e: any) {
            setInterruptError(e.message || 'Create interruption failed');
        } finally {
            setIsCreatingInterrupt(false);
        }
    };

    const handleResolveInterruption = async (taskId: string) => {
        if (!planId) return;
        setInterruptError(null);
        setIsResolvingInterrupt(taskId);
        try {
            const API_BASE = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_BASE}/api/v1/worker-tasks/${planId}/interruptions/${taskId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Resolve interruption failed');
            }
            setInterruptResult({ action: 'RESOLVE', ...data });
            setActiveInterruptions(prev => prev.filter(i => i.taskId !== taskId));
        } catch (e: any) {
            setInterruptError(e.message || 'Resolve interruption failed');
        } finally {
            setIsResolvingInterrupt(null);
        }
    };

    // TEMPORARY: Time override handler
    const handleSetTimeOverride = async (time: string | null) => {
        try {
            const API_BASE = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_BASE}/api/v1/worker-tasks/debug/time-override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ time })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to set time override');
            }
            setIsTimeOverrideActive(time !== null);
            if (time) {
                setApiTimeOverride(time);
            }
            setInterruptResult({ action: 'TIME_OVERRIDE', message: data.message });
        } catch (e: any) {
            setInterruptError(e.message || 'Failed to set time override');
        }
    };

    // Worker Handlers
    const addWorkerUpdate = () => {
        if (availableWorkers.length === 0) return;
        const firstWorker = availableWorkers[0];

        // NEW: Default to full shift window (Shift 1)
        const shiftDate = shift1?.date || planStartTime?.split('T')[0] || '';
        const shiftStart = shift1?.startTime || '07:00';
        const shiftEnd = shift1?.endTime || '17:00';

        const startIso = fromDatetimeLocalWallClock(`${shiftDate}T${shiftStart}`);
        const endIso = fromDatetimeLocalWallClock(`${shiftDate}T${shiftEnd}`);

        setWorkerUpdates(prev => [
            ...prev,
            {
                id: generateId(),
                workerId: firstWorker.workerId,
                startTime: startIso,
                endTime: endIso,
                type: 'custom',
                selectedShift: 1,  // NEW: Track which shift
            }
        ]);
    };

    const removeWorkerUpdate = (id: string) => {
        setWorkerUpdates(prev => prev.filter(u => u.id !== id));
    };

    const updateWorkerSelection = (id: string, workerId: string) => {
        setWorkerUpdates(prev => prev.map(u => u.id === id ? { ...u, workerId } : u));
    };

    const updateWorkerTime = (id: string, field: 'startTime' | 'endTime', value: string) => {
        setWorkerUpdates(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u));
    };

    const applyQuickAction = (id: string, action: 'late_1h' | 'late_2h' | 'no_show' | 'left_early') => {
        setWorkerUpdates(prev => prev.map(u => {
            if (u.id !== id) return u;

            // NEW: Use the worker's selected shift
            const isShift2 = u.selectedShift === 2;
            const shift = isShift2 ? shift2 : shift1;
            const shiftDate = shift?.date || planStartTime?.split('T')[0] || '';
            const shiftStartHHMM = shift?.startTime || '07:00';
            const shiftEndHHMM = shift?.endTime || '17:00';

            // Parse shift start hour for +1h/+2h calculations
            const [startH, startM] = shiftStartHHMM.split(':').map(Number);
            const late1hTime = `${String(startH + 1).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
            const late2hTime = `${String(startH + 2).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

            let newStart = u.startTime;
            let newEnd = u.endTime;

            switch (action) {
                case 'late_1h':
                    newStart = fromDatetimeLocalWallClock(`${shiftDate}T${late1hTime}`);
                    newEnd = fromDatetimeLocalWallClock(`${shiftDate}T${shiftEndHHMM}`);
                    break;
                case 'late_2h':
                    newStart = fromDatetimeLocalWallClock(`${shiftDate}T${late2hTime}`);
                    newEnd = fromDatetimeLocalWallClock(`${shiftDate}T${shiftEndHHMM}`);
                    break;
                case 'no_show':
                    newStart = fromDatetimeLocalWallClock(`${shiftDate}T${shiftStartHHMM}`);
                    newEnd = fromDatetimeLocalWallClock(`${shiftDate}T${shiftStartHHMM}`);
                    break;
                case 'left_early':
                    newStart = fromDatetimeLocalWallClock(`${shiftDate}T${shiftStartHHMM}`);
                    // Keep using currentTime for "left early"
                    const baseLocal = currentTime || toDatetimeLocalWallClock(planStartTime || '');
                    newEnd = fromDatetimeLocalWallClock(baseLocal);
                    break;
            }

            return { ...u, startTime: newStart, endTime: newEnd, type: action };
        }));
    };

    const handleSubmit = async () => {
        if (taskUpdates.length === 0 && workerUpdates.length === 0) {
            setError('Add at least one task or worker update');
            return;
        }
        // planId can be undefined for ephemeral mode - the hook handles this

        setError(null);
        setIsSubmitting(true);

        try {
            const updates = taskUpdates.map(u => ({
                taskId: u.taskId,
                laborHoursRemaining: u.laborHoursRemaining,
                interpretAs: 'total', // Explicitly interpreting as total
            }));

            const wUpdates = workerUpdates.map(u => ({
                workerId: u.workerId,
                availability: {
                    startTime: u.startTime,
                    endTime: u.endTime
                }
            }));

            // Preserve wall-clock time (matches plan assignment format).
            const currentTimeIso = currentTime ? fromDatetimeLocalWallClock(currentTime) : undefined;

            const res = await onAdjust(updates, currentTimeIso, wUpdates);
            setResult(res);
        } catch (e: any) {
            setError(e.message || 'Adjustment failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">🔧</span>
                    <span className="font-semibold text-gray-800">Adjust Plan</span>
                    {(taskUpdates.length > 0 || workerUpdates.length > 0) && (
                        <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {taskUpdates.length + workerUpdates.length} update{taskUpdates.length + workerUpdates.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>

            {isExpanded && (
                <div className="p-4 space-y-6">
                    {/* Worker Updates Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-700">Worker Updates</h4>
                            <button
                                onClick={addWorkerUpdate}
                                disabled={availableWorkers.length === 0}
                                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                                Add Worker
                            </button>
                        </div>

                        {workerUpdates.length === 0 ? (
                            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 text-center">
                                No worker updates. Click "Add Worker" to handle late arrivals or absence.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {workerUpdates.map(update => {
                                    const worker = workerMap.get(update.workerId);
                                    return (
                                        <div
                                            key={update.id}
                                            className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={update.workerId}
                                                    onChange={e => updateWorkerSelection(update.id, e.target.value)}
                                                    className="flex-1 bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                >
                                                    <option value={update.workerId}>
                                                        {worker?.name || update.workerId}
                                                    </option>
                                                    {availableWorkers.map(w => (
                                                        <option key={w.workerId} value={w.workerId}>
                                                            {w.name || w.workerId}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => removeWorkerUpdate(update.id)}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Shift Selector (only if multi-shift enabled) */}
                                            {useShift2 && (
                                                <div className="flex gap-1 bg-gray-100 p-0.5 rounded mb-2">
                                                    <button
                                                        onClick={() => setWorkerUpdates(prev => prev.map(u =>
                                                            u.id === update.id ? { ...u, selectedShift: 1 } : u
                                                        ))}
                                                        className={`text-xs px-2 py-1 rounded ${update.selectedShift === 1 ? 'bg-white shadow-sm' : ''}`}
                                                    >
                                                        Shift 1
                                                    </button>
                                                    <button
                                                        onClick={() => setWorkerUpdates(prev => prev.map(u =>
                                                            u.id === update.id ? { ...u, selectedShift: 2 } : u
                                                        ))}
                                                        className={`text-xs px-2 py-1 rounded ${update.selectedShift === 2 ? 'bg-white shadow-sm' : ''}`}
                                                    >
                                                        Shift 2
                                                    </button>
                                                </div>
                                            )}

                                            {/* Quick Actions */}
                                            <div className="flex gap-1 overflow-x-auto pb-1">
                                                <button onClick={() => applyQuickAction(update.id, 'late_1h')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-purple-50 text-purple-700">Late 1h</button>
                                                <button onClick={() => applyQuickAction(update.id, 'late_2h')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-purple-50 text-purple-700">Late 2h</button>
                                                <button onClick={() => applyQuickAction(update.id, 'no_show')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-red-50 text-red-700">No Show</button>
                                                <button onClick={() => applyQuickAction(update.id, 'left_early')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-orange-50 text-orange-700">Left Early</button>
                                            </div>

                                            {/* Time Pickers */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-1">Available From</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={update.startTime ? toDatetimeLocalWallClock(update.startTime) : ''}
                                                        onChange={e => updateWorkerTime(update.id, 'startTime', fromDatetimeLocalWallClock(e.target.value))}
                                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-1">Until</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={update.endTime ? toDatetimeLocalWallClock(update.endTime) : ''}
                                                        onChange={e => updateWorkerTime(update.id, 'endTime', fromDatetimeLocalWallClock(e.target.value))}
                                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Task Updates Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-700">Task Updates</h4>
                            <button
                                onClick={addTaskUpdate}
                                disabled={availableTasks.length === 0}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                                Add Task
                            </button>
                        </div>

                        {taskUpdates.length === 0 ? (
                            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 text-center">
                                No task updates. Click "Add Task" to start.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {taskUpdates.map(update => {
                                    const task = taskMap.get(update.taskId);
                                    const originalHours = task?.estimatedRemainingLaborHours || task?.estimatedTotalLaborHours || 0;
                                    const delta = update.laborHoursRemaining - originalHours;
                                    return (
                                        <div
                                            key={update.id}
                                            className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200"
                                        >
                                            <select
                                                value={update.taskId}
                                                onChange={e => updateTaskSelection(update.id, e.target.value)}
                                                className="flex-1 bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value={update.taskId}>
                                                    {task?.name || update.taskId}
                                                </option>
                                                {availableTasks.map(t => (
                                                    <option key={t.taskId} value={t.taskId}>
                                                        {t.name || t.taskId}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={update.laborHoursRemaining}
                                                    onChange={e => updateHours(update.id, parseFloat(e.target.value) || 0)}
                                                    min={0}
                                                    step={0.5}
                                                    className="w-20 bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <span className="text-xs text-gray-500">hrs (total)</span>
                                            </div>
                                            {delta !== 0 && (
                                                <span
                                                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${delta > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                        }`}
                                                >
                                                    {delta > 0 ? '+' : ''}
                                                    {delta.toFixed(1)}h
                                                </span>
                                            )}
                                            <button
                                                onClick={() => removeTaskUpdate(update.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* KAN-468: Task Interruptions Section */}
                    {planId && (
                        <div className="space-y-3 border-t border-gray-200 pt-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <h4 className="text-sm font-medium text-gray-700">Task Interruptions</h4>
                            </div>

                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 space-y-3">
                                {/* TEMPORARY: Time Override for Testing */}
                                <div className="bg-red-50 rounded p-2 border border-red-200 space-y-2">
                                    <div className="flex items-center gap-1 text-xs font-medium text-red-700">
                                        ⏰ TEMP: API Time Override
                                        {isTimeOverrideActive && <span className="ml-1 bg-red-500 text-white px-1 rounded">ACTIVE</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="datetime-local"
                                            value={apiTimeOverride}
                                            onChange={e => setApiTimeOverride(e.target.value)}
                                            className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs"
                                        />
                                        <button
                                            onClick={() => handleSetTimeOverride(apiTimeOverride ? new Date(apiTimeOverride).toISOString() : null)}
                                            disabled={!apiTimeOverride}
                                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
                                        >
                                            Set
                                        </button>
                                        <button
                                            onClick={() => { handleSetTimeOverride(null); setApiTimeOverride(''); }}
                                            className="bg-gray-500 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                {/* Create Interruption Form */}
                                <div className="space-y-2">
                                    <select
                                        value={selectedInterruptTask}
                                        onChange={e => setSelectedInterruptTask(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    >
                                        <option value="">Select a task to interrupt...</option>
                                        {tasks.filter(t => !activeInterruptions.some(i => i.taskId === t.taskId)).map(t => (
                                            <option key={t.taskId} value={t.taskId}>
                                                {t.name || t.taskId}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flex gap-2">
                                        <select
                                            value={interruptReason}
                                            onChange={e => setInterruptReason(e.target.value as any)}
                                            className="flex-1 bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                        >
                                            <option value="material">🧱 Material</option>
                                            <option value="equipment">🔧 Equipment</option>
                                            <option value="other">❓ Other</option>
                                        </select>

                                        <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-md px-2">
                                            <span className="text-xs text-gray-500">Max Workers:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={maxWorkersDuringInterrupt}
                                                onChange={e => setMaxWorkersDuringInterrupt(parseInt(e.target.value) || 0)}
                                                className="w-12 text-sm text-center border-0 focus:ring-0"
                                            />
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        value={interruptNotes}
                                        onChange={e => setInterruptNotes(e.target.value)}
                                        placeholder="Notes (optional)"
                                        className="w-full bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500"
                                    />

                                    <button
                                        onClick={handleCreateInterruption}
                                        disabled={!selectedInterruptTask || isCreatingInterrupt}
                                        className="w-full flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCreatingInterrupt ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Pause className="w-4 h-4" />
                                        )}
                                        Create Interruption
                                    </button>
                                </div>

                                {/* Active Interruptions List */}
                                {activeInterruptions.length > 0 && (
                                    <div className="border-t border-amber-200 pt-2 space-y-2">
                                        <div className="text-xs font-medium text-amber-700">Active Interruptions:</div>
                                        {activeInterruptions.map(int => (
                                            <div key={int.taskId} className="flex items-center justify-between bg-white rounded-md p-2 text-xs">
                                                <div>
                                                    <span className="font-medium">{tasks.find(t => t.taskId === int.taskId)?.name || int.taskId}</span>
                                                    <span className="ml-2 text-gray-500">
                                                        ({int.reason === 'material' ? '🧱' : int.reason === 'equipment' ? '🔧' : '❓'} {int.reason})
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleResolveInterruption(int.taskId)}
                                                    disabled={isResolvingInterrupt === int.taskId}
                                                    className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
                                                >
                                                    {isResolvingInterrupt === int.taskId ? (
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <Play className="w-3 h-3" />
                                                    )}
                                                    Resolve
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Error/Result Messages */}
                                {interruptError && (
                                    <div className="flex items-center gap-2 bg-red-100 text-red-700 rounded-md p-2 text-xs">
                                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                        <span>{interruptError}</span>
                                    </div>
                                )}

                                {interruptResult && (
                                    <div className={`rounded-md p-2 text-xs ${interruptResult.action === 'CREATE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                                        <div className="font-semibold">
                                            {interruptResult.action === 'CREATE' ? '⚠️ Interruption Created' : '✅ Interruption Resolved'}
                                        </div>
                                        <div>{interruptResult.message}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Current Time Section */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>Current Time:</span>
                        </div>
                        <input
                            type="datetime-local"
                            value={currentTime}
                            onChange={e => setCurrentTime(e.target.value)}
                            className="bg-white border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {getTimezoneAbbr()}
                        </span>
                        <button
                            onClick={setNow}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                        >
                            Now
                        </button>
                        <button
                            onClick={setPlanStart}
                            disabled={!planStartTime}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
                        >
                            Plan Start
                        </button>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSubmit}
                            disabled={(taskUpdates.length === 0 && workerUpdates.length === 0) || isSubmitting || isLoading}
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Adjusting...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Apply Adjustment</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Results Section */}
                    {result && (
                        <div className="space-y-3 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                📊 Adjustment Results
                            </h4>

                            {/* Summary Stats */}
                            {summaryStats && (
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                        {summaryStats.impactedCount} task{summaryStats.impactedCount !== 1 ? 's' : ''} impacted
                                    </span>
                                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded">
                                        {summaryStats.workersReassigned} worker{summaryStats.workersReassigned !== 1 ? 's' : ''} affected
                                    </span>
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                                        +{summaryStats.totalAdded} added
                                    </span>
                                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                                        -{summaryStats.totalRemoved} removed
                                    </span>
                                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                                        ~{summaryStats.totalUpdated} updated
                                    </span>
                                </div>
                            )}

                            {/* Changes List */}
                            <div className="space-y-2">
                                {/* Added */}
                                {result.addedWorkerTasks.length > 0 && (
                                    <div className="bg-green-50 rounded-lg p-3">
                                        <button
                                            onClick={() => toggleSection('added')}
                                            className="w-full flex items-center justify-between text-xs font-semibold text-green-800 mb-2"
                                        >
                                            <span className="flex items-center gap-1">🟢 ADDED ({result.addedWorkerTasks.length})</span>
                                            {expandedSections.has('added') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        {expandedSections.has('added') && (
                                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                                {result.addedWorkerTasks.map((a, i) => {
                                                    const worker = a.workerId ? workerMap.get(a.workerId) : undefined;
                                                    const task = taskMap.get(a.taskId);
                                                    const isWait = !a.workerId || a.workerId === '__WAIT__' || a.workerId === 'null';
                                                    const workerDisplay = isWait ? 'Non-Labor (Wait)' : (worker?.name || a.workerId);
                                                    return (
                                                        <div key={i} className="text-xs text-green-900 font-mono">
                                                            {workerDisplay} → {task?.name || a.taskId} | {formatDateTime(a.startDate || '')} - {formatDateTime(a.endDate || '')}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Removed */}
                                {result.removedWorkerTasks.length > 0 && (
                                    <div className="bg-red-50 rounded-lg p-3">
                                        <button
                                            onClick={() => toggleSection('removed')}
                                            className="w-full flex items-center justify-between text-xs font-semibold text-red-800 mb-2"
                                        >
                                            <span className="flex items-center gap-1">🔴 REMOVED ({result.removedWorkerTasks.length})</span>
                                            {expandedSections.has('removed') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        {expandedSections.has('removed') && (
                                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                                {result.removedWorkerTasks.map((r, i) => {
                                                    const worker = r.workerId ? workerMap.get(r.workerId) : undefined;
                                                    const task = taskMap.get(r.taskId);
                                                    const isWait = !r.workerId || r.workerId === '__WAIT__' || r.workerId === 'null';
                                                    const workerDisplay = isWait ? 'Non-Labor (Wait)' : (worker?.name || r.workerId);
                                                    return (
                                                        <div key={i} className="text-xs text-red-900 font-mono line-through opacity-70">
                                                            {workerDisplay} → {task?.name || r.taskId} | {formatDateTime(r.startDate || '')} - {formatDateTime(r.endDate || '')}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Updated */}
                                {result.updatedWorkerTasks.length > 0 && (
                                    <div className="bg-yellow-50 rounded-lg p-3">
                                        <button
                                            onClick={() => toggleSection('updated')}
                                            className="w-full flex items-center justify-between text-xs font-semibold text-yellow-800 mb-2"
                                        >
                                            <span className="flex items-center gap-1">🟡 UPDATED ({result.updatedWorkerTasks.length})</span>
                                            {expandedSections.has('updated') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        {expandedSections.has('updated') && (
                                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                                {result.updatedWorkerTasks.map((u, i) => {
                                                    const worker = u.workerId ? workerMap.get(u.workerId) : undefined;
                                                    const task = taskMap.get(u.taskId);
                                                    const isWait = !u.workerId || u.workerId === '__WAIT__' || u.workerId === 'null';
                                                    const workerDisplay = isWait ? 'Non-Labor (Wait)' : (worker?.name || u.workerId);
                                                    return (
                                                        <div key={i} className="text-xs text-yellow-900 font-mono">
                                                            {workerDisplay} → {task?.name || u.taskId} | end: {formatDateTime(u.previousEndDate || '')} → {formatDateTime(u.endDate || '')}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Impacted Tasks */}
                            {result.impactedTasks.filter(t => t.status !== 'UNAFFECTED').length > 0 && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <button
                                        onClick={() => toggleSection('impacted')}
                                        className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 mb-2"
                                    >
                                        <span>Impacted Tasks</span>
                                        {expandedSections.has('impacted') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    {expandedSections.has('impacted') && (
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {result.impactedTasks
                                                .filter(t => t.status !== 'UNAFFECTED')
                                                .map((t, i) => {
                                                    const task = taskMap.get(t.taskId);
                                                    const statusColor = {
                                                        EXTENDED: 'text-red-600',
                                                        SHORTENED: 'text-green-600',
                                                        REASSIGNED: 'text-blue-600',
                                                        UNAFFECTED: 'text-gray-600',
                                                    }[t.status];
                                                    const statusIcon = {
                                                        EXTENDED: '🔴',
                                                        SHORTENED: '🟢',
                                                        REASSIGNED: '🔵',
                                                        UNAFFECTED: '⚪',
                                                    }[t.status];
                                                    return (
                                                        <div key={i} className="flex items-center gap-2 text-xs">
                                                            <span>{statusIcon}</span>
                                                            <span className="font-medium">{task?.name || t.taskId}</span>
                                                            <span className={`font-semibold ${statusColor}`}>{t.status}</span>
                                                            {t.previousEndDate && t.newEndDate && (
                                                                <span className="text-gray-500">
                                                                    {formatDateTime(t.previousEndDate)} → {formatDateTime(t.newEndDate)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Warnings: Deficits & Idle Workers */}
                            {((result.deficitTasks && result.deficitTasks.length > 0) || (result.idleWorkers && result.idleWorkers.length > 0)) && (
                                <div className="bg-orange-50 rounded-lg p-3">
                                    <button
                                        onClick={() => toggleSection('warnings')}
                                        className="w-full flex items-center justify-between text-xs font-semibold text-orange-800 mb-2"
                                    >
                                        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Warnings</span>
                                        {expandedSections.has('warnings') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    {expandedSections.has('warnings') && (
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {result.deficitTasks?.map((d, i) => {
                                                const task = taskMap.get(d.taskId);
                                                return (
                                                    <div key={`d-${i}`} className="text-xs text-orange-900">
                                                        ⚠️ {task?.name || d.taskId} has {d.deficitHours.toFixed(1)}h deficit
                                                    </div>
                                                );
                                            })}
                                            {result.idleWorkers && result.idleWorkers.length > 0 && (
                                                <>
                                                    {(showAllIdle ? result.idleWorkers : result.idleWorkers.slice(0, 3)).map((w, i) => {
                                                        const worker = workerMap.get(w.workerId);
                                                        return (
                                                            <div key={`w-${i}`} className="text-xs text-orange-900">
                                                                💤 {worker?.name || w.workerName || w.workerId} idle from {formatDateTime(w.availableFrom)}
                                                            </div>
                                                        );
                                                    })}
                                                    {!showAllIdle && result.idleWorkers.length > 3 && (
                                                        <button
                                                            onClick={() => setShowAllIdle(true)}
                                                            className="text-xs text-orange-600 hover:underline font-medium mt-1"
                                                        >
                                                            +{result.idleWorkers.length - 3} more...
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PlanAdjustmentPanel;
