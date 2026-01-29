import { useMemo, useState, useRef, Component, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { scaleTime as d3ScaleTime } from 'd3-scale';
import type { Assignment, PlanResponse } from '../types';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Props {
    data: PlanResponse;
    highlightedTaskIds?: Set<string>;
}

// Utility for safe className merging
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Helper: Format time as HH:MM
const formatTime = (date: Date) => {
    try {
        if (!date || isNaN(date.getTime())) return '--:--';
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    } catch (e) {
        return '--:--';
    }
};

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: string }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: '' };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error: error.toString() };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Gantt Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    <h3 className="font-bold">Gantt Visualization Crashed</h3>
                    <pre className="text-xs mt-2 overflow-auto">{this.state.error}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

// Colors for grid and UI
const colors = {
    grid: '#e5e7eb',
    gridLight: '#f3f4f6',
    text: '#374151',
    textLight: '#9ca3af',
    nightGap: '#1e293b',
    barIdle: {
        bg: '#f3f4f6',
        border: '#d1d5db',
        text: '#6b7280',
    }
};

// Worker color palette for task view - High contrast dark blue
const workerColors = Array(12).fill({
    bg: 'rgba(29, 78, 216, 0.85)',
    border: '#1e3a8a',
    text: '#ffffff'
});

// Fixed time constants
const SIDEBAR_WIDTH = 160;  // slightly wider for readability
const NIGHT_GAP_WIDTH_PX = 60;  // SMALL gap, not 25% of day
const ROW_HEIGHT_WORKER = 40;
const ROW_HEIGHT_TASK_BASE = 32;  // Base height per worker lane in task view
const ROW_HEIGHT_TASK_MIN = 56;   // Minimum row height for task view
const HEADER_HEIGHT = 56;
const NON_LABOR_ROW_ID = '__non_labor__';

const PlanGanttInner: React.FC<Props> = ({ data, highlightedTaskIds }) => {
    const [viewMode, setViewMode] = useState<'worker' | 'task'>('worker');
    const [showNonLabor, setShowNonLabor] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [debug, setDebug] = useState(false);
    const [containerWidth, setContainerWidth] = useState(1200); // fallback

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;
            if (width && width > 0) {
                setContainerWidth(width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const DAY_WIDTH_PX = Math.max(800, containerWidth - SIDEBAR_WIDTH - 40);

    // Process Data
    const processed = useMemo((): any => {
        try {
            const rawAssignments = data.assignments || [];
            const assignments = rawAssignments
                .filter((x): x is Assignment => x.type !== 'comment')
                .map(a => {
                    // FORCE LOCAL TIME: Treat the ISO string as wall-clock time by stripping 'Z'
                    // This prevents the browser from shifting 07:00 UTC to 12:30 IST
                    const sStr = (a.startDate || a.startTime || '2000-01-01').replace('Z', '');
                    const eStr = (a.endDate || a.endTime || '2000-01-01').replace('Z', '');

                    const s = new Date(sStr);
                    const e = new Date(eStr);
                    return { ...a, s, e };
                })
                .filter(a => !isNaN(a.s.getTime()) && !isNaN(a.e.getTime()));

            // Get all unique workers/tasks for consistent row ordering and progress lookup
            let allRowIds: string[] = [];
            const rowIdToProgressMap = new Map<string, number>();
            const taskIdToLabel = new Map<string, string>();

            // Create worker name lookup map (prefer Excel-provided names)
            const workerNameMap = new Map<string, string>();
            if (data.workers) {
                data.workers.forEach(w => {
                    if (w.workerId && w.name) {
                        workerNameMap.set(w.workerId, w.name);
                    }
                });
            }
            assignments.forEach(a => {
                if (a.workerId && a.workerName && !workerNameMap.has(a.workerId)) {
                    workerNameMap.set(a.workerId, a.workerName);
                }
            });

            if (viewMode === 'worker') {
                allRowIds = Array.from(new Set(assignments.filter(a => a.workerId && a.workerId !== 'GAP_VIRTUAL_WORKER').map(a => a.workerId))).sort();
                if (showNonLabor) {
                    const hasNonLabor = assignments.some(a => !a.workerId || a.workerId === 'GAP_VIRTUAL_WORKER');
                    if (hasNonLabor) {
                        allRowIds.push(NON_LABOR_ROW_ID);
                    }
                }
            } else {
                // Task View: Include ALL tasks from input file, plus any dynamic ones found in assignments, excluding 'IDLE'
                const taskIdSet = new Set<string>();
                const taskNameCounts = new Map<string, number>();
                const taskIdToBaseName = new Map<string, string>();

                // 1. Add from input file (by taskId to avoid collapsing duplicates)
                if (data.tasks) {
                    data.tasks.forEach(t => {
                        if (!t.taskId) return;
                        const baseName = (t.name || t.taskId).toString().trim() || t.taskId;
                        taskIdToBaseName.set(t.taskId, baseName);
                        taskNameCounts.set(baseName, (taskNameCounts.get(baseName) || 0) + 1);
                        taskIdSet.add(t.taskId);
                    });
                }

                taskIdToBaseName.forEach((baseName, taskId) => {
                    const count = taskNameCounts.get(baseName) || 0;
                    const label = count > 1 ? `${baseName} (${taskId})` : baseName;
                    taskIdToLabel.set(taskId, label);
                });

                // 2. Add from assignments (if any valid ones missing)
                assignments.forEach(a => {
                    if (a.taskName === 'IDLE') return;
                    const taskKey = a.taskId || a.taskName;
                    if (!taskKey) return;
                    taskIdSet.add(taskKey);
                    if (!taskIdToLabel.has(taskKey)) {
                        const label = (a.taskName || taskKey).toString().trim() || taskKey;
                        taskIdToLabel.set(taskKey, label);
                    }
                });

                allRowIds = Array.from(taskIdSet).sort();

                // Calculate progress locally (by taskId)
                const taskRequiredHoursMap = new Map<string, number>();
                if (data.tasks) {
                    data.tasks.forEach(t => {
                        if (!t.taskId) return;
                        const required = Number(t.estimatedTotalLaborHours ?? t.estimatedRemainingLaborHours ?? 0);
                        if (!isNaN(required)) {
                            taskRequiredHoursMap.set(t.taskId, required);
                        }
                    });
                } else if (data.taskProgress) {
                    data.taskProgress.forEach((tp: any) => {
                        if (!tp.taskId) return;
                        const required = Number(tp.totalRequiredHours ?? 0);
                        if (!isNaN(required)) {
                            taskRequiredHoursMap.set(tp.taskId, required);
                        }
                    });
                }

                const taskWorkedHoursMap = new Map<string, number>();
                assignments.forEach(a => {
                    if (!a.taskId || a.taskName === 'IDLE') return;
                    const durationHrs = (a.e.getTime() - a.s.getTime()) / (1000 * 60 * 60);
                    taskWorkedHoursMap.set(a.taskId, (taskWorkedHoursMap.get(a.taskId) || 0) + durationHrs);
                });

                taskRequiredHoursMap.forEach((required, taskId) => {
                    if (required <= 0) return;
                    const worked = taskWorkedHoursMap.get(taskId) || 0;
                    const pct = Math.min(100, (worked / required) * 100);
                    rowIdToProgressMap.set(taskId, pct);
                });
            }

            // Get all unique workers for color assignment
            // Get all unique workers for color assignment (Exclude GAP_VIRTUAL_WORKER)
            const allWorkerIds = Array.from(new Set(assignments.filter(a => a.workerId && a.workerId !== 'GAP_VIRTUAL_WORKER').map(a => a.workerId))).sort();
            const workerColorMap = new Map<string, typeof workerColors[0]>();
            allWorkerIds.forEach((wid, idx) => {
                workerColorMap.set(wid, workerColors[idx % workerColors.length]);
            });

            // Group assignments by calendar date (day)
            const getDateKey = (date: Date) => {
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            };

            const dayGroups = new Map<string, typeof assignments>();
            assignments.forEach(a => {
                const dayKey = getDateKey(a.s);
                if (!dayGroups.has(dayKey)) {
                    dayGroups.set(dayKey, []);
                }
                dayGroups.get(dayKey)!.push(a);
            });

            const sortedDayKeys = Array.from(dayGroups.keys()).sort();

            // DEBUG: Log day groupings to diagnose Shift 2 visibility issue
            console.log('[Gantt Debug] Total raw assignments:', rawAssignments.length);
            console.log('[Gantt Debug] Filtered assignments:', assignments.length);
            console.log('[Gantt Debug] Days found:', sortedDayKeys);
            sortedDayKeys.forEach(dayKey => {
                console.log(`[Gantt Debug] Day ${dayKey}: ${dayGroups.get(dayKey)?.length || 0} assignments`);
            });

            // Calculate dynamic day start/end based on parsed hours (Wall Clock)
            let startH = 6;
            let endH = 18;

            if (assignments.length > 0) {
                let min = 24;
                let max = 0;
                assignments.forEach(a => {
                    const h1 = a.s.getHours() + (a.s.getMinutes() / 60);
                    const h2 = a.e.getHours() + (a.e.getMinutes() / 60);
                    if (h1 < min) min = h1;
                    if (h2 > max) max = h2;
                });
                // startH = Math.floor(min);
                // endH = Math.ceil(max);
                // startH = Math.max(0, startH - 1);
                // endH = Math.min(24, Math.max(endH + 1, startH + 4));
                startH = 6;
                endH = 22;
            }

            const viewStartHour = startH;
            const viewEndHour = endH;

            // Pre-calculate max concurrency for task view
            const taskMaxWorkers = new Map<string, number>();
            if (viewMode === 'task') {
                const tempTaskMap = new Map<string, Map<string, number>>();
                assignments.forEach(a => {
                    const tId = a.taskId || a.taskName || 'Unknown';
                    if (!tempTaskMap.has(tId)) tempTaskMap.set(tId, new Map());

                    const key = `${a.s.toISOString()}|${a.e.toISOString()}`;
                    const slots = tempTaskMap.get(tId)!;
                    slots.set(key, (slots.get(key) || 0) + 1);
                });

                tempTaskMap.forEach((slots, tId) => {
                    let max = 1;
                    slots.forEach(count => {
                        if (count > max) max = count;
                    });
                    taskMaxWorkers.set(tId, max);
                });
            }

            // Create day sections
            const daySections = sortedDayKeys.map((dayKey, idx) => {
                const dayAssignments = dayGroups.get(dayKey)!;
                const [y, m, d] = dayKey.split('-').map(Number);
                const axisStart = new Date(y, m - 1, d, viewStartHour, 0, 0);
                const axisEnd = new Date(y, m - 1, d, viewEndHour, 0, 0);

                const timeScale = d3ScaleTime()
                    .domain([axisStart, axisEnd])
                    .range([0, DAY_WIDTH_PX]);

                let rows: { id: string, label: string, items: any[], maxWorkers?: number }[] = [];

                if (viewMode === 'worker') {
                    const validWorkItems = dayAssignments.filter(a => !!a.workerId && a.workerId !== 'GAP_VIRTUAL_WORKER');
                    const nonLaborItems = showNonLabor
                        ? dayAssignments.filter(a => !a.workerId || a.workerId === '__WAIT__' || a.workerId === 'null' || a.workerId === 'GAP_VIRTUAL_WORKER')
                        : [];
                    const workerIds = Array.from(new Set(validWorkItems.map(a => a.workerId))).sort();
                    rows = workerIds.map(wid => ({
                        id: wid,
                        label: wid.replace('w_', 'W'),
                        items: validWorkItems.filter(a => a.workerId === wid)
                    }));
                    if (showNonLabor && nonLaborItems.length > 0) {
                        rows.push({
                            id: NON_LABOR_ROW_ID,
                            label: 'Non-Labor / Wait',
                            items: nonLaborItems
                        });
                    }
                } else {
                    const taskIds = Array.from(new Set(dayAssignments.map(a => a.taskId || a.taskName || 'Unknown'))).sort();
                    rows = taskIds.map(tId => {
                        const taskAssignments = dayAssignments.filter(a => (a.taskId || a.taskName) === tId);
                        return {
                            id: tId,
                            label: taskIdToLabel.get(tId) || tId,
                            items: taskAssignments.map(a => ({
                                ...a,
                                workerId: a.workerId || '?',
                                workerLabel: workerNameMap.get(a.workerId) || (a.workerId || '?').replace('w_', 'W'),
                                isTaskView: true
                            })),
                            maxWorkers: taskMaxWorkers.get(tId) || 1
                        };
                    });
                }

                const dateLabel = new Date(y, m - 1, d).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });

                return {
                    dayKey,
                    dateLabel,
                    timeScale,
                    rows,
                    dayStart: axisStart,
                    dayEnd: axisEnd,
                    shiftNumber: idx + 1
                };
            });

            // Calculate Min/Max Dates for Debugging
            let minD = 'N/A';
            let maxD = 'N/A';
            if (assignments.length > 0) {
                const sortedDates = assignments.map(a => a.s.getTime()).sort((a, b) => a - b);
                minD = new Date(sortedDates[0]).toLocaleString();
                maxD = new Date(sortedDates[sortedDates.length - 1]).toLocaleString();
            }

            const debugStats = {
                totalRaw: rawAssignments.length,
                parsed: assignments.length,
                days: sortedDayKeys.length,
                uniqueWorkers: allWorkerIds,
                dateRange: `${minD} - ${maxD}`
            };


            return { daySections, debugStats, allRowIds, workerColorMap, workerNameMap, taskMaxWorkers, dayStartHour: viewStartHour, dayEndHour: viewEndHour, rowIdToProgressMap, taskIdToLabel };
        } catch (err) {
            console.error('Gantt processing error', err);
            const now = new Date();
            const fallbackScale = d3ScaleTime()
                .domain([now, new Date(now.getTime() + 8 * 60 * 60 * 1000)])
                .range([0, DAY_WIDTH_PX]);
            return {
                daySections: [{
                    dayKey: now.toISOString().split('T')[0],
                    dateLabel: now.toDateString(),
                    timeScale: fallbackScale,
                    rows: [],
                    dayStart: now,
                    dayEnd: new Date(now.getTime() + 8 * 60 * 60 * 1000),
                    shiftNumber: 1
                }],
                debugStats: { totalRaw: 0, parsed: 0, days: 0, uniqueWorkers: [], dateRange: 'N/A' },
                allRowIds: [],
                workerColorMap,
                workerNameMap: new Map<string, string>(),
                taskMaxWorkers: new Map<string, number>(),
                dayStartHour: now.getHours(),
                dayEndHour: now.getHours() + 8,
                rowIdToProgressMap: new Map<string, number>(),
                taskIdToLabel: new Map<string, string>()
            };
        }
    }, [data, viewMode, DAY_WIDTH_PX, showNonLabor]);

    const { daySections, debugStats, allRowIds, workerColorMap, workerNameMap, taskMaxWorkers, dayStartHour, dayEndHour, rowIdToProgressMap, taskIdToLabel } = processed as any;

    // Calculate row heights - FIXED for task view
    const FIXED_TASK_ROW_HEIGHT = 120; // Increased height for better visibility

    const getRowHeight = (rowId: string) => {
        if (viewMode === 'worker') {
            return ROW_HEIGHT_WORKER;
        }
        return FIXED_TASK_ROW_HEIGHT;
    };

    // Calculate cumulative Y positions for rows
    const rowYPositions = useMemo(() => {
        const positions: number[] = [];
        let currentY = 0;
        allRowIds.forEach((rowId: string) => {
            positions.push(currentY);
            currentY += getRowHeight(rowId);
        });
        return positions;
    }, [allRowIds, viewMode, taskMaxWorkers]);

    const numDays = daySections.length;
    const totalRowsHeight = rowYPositions.length > 0
        ? rowYPositions[rowYPositions.length - 1] + getRowHeight(allRowIds[allRowIds.length - 1])
        : 0;

    // Total dimensions
    const timelineWidth = (numDays * DAY_WIDTH_PX) + ((numDays - 1) * NIGHT_GAP_WIDTH_PX);
    const totalChartWidth = SIDEBAR_WIDTH + timelineWidth;
    // Increase overall vertical space to show more rows comfortably
    const totalHeight = totalRowsHeight + HEADER_HEIGHT + 200;

    // Generate hour ticks dynamically - EVERY HOUR
    const hourTicks = useMemo(() => {
        const ticks: number[] = [];
        for (let h = dayStartHour; h <= dayEndHour; h++) {
            ticks.push(h);
        }
        return ticks;
    }, [dayStartHour, dayEndHour]);

    return (
        <div className="w-full h-full bg-white text-gray-900 flex flex-col font-sans rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* DEBUG TOGGLE */}
            {debug && (
                <div className="absolute top-16 left-4 right-4 bg-gray-900 text-green-400 p-4 rounded z-50 text-xs font-mono overflow-auto max-h-48 opacity-95">
                    <div className="flex justify-between items-start mb-2">
                        <strong>DEBUG INFO</strong>
                        <button onClick={() => setDebug(false)} className="text-white hover:text-red-400">[x]</button>
                    </div>
                    <div>Raw: {debugStats.totalRaw} | Parsed: {debugStats.parsed} | Days: {debugStats.days}</div>
                    <div>Workers: {JSON.stringify(debugStats.uniqueWorkers)}</div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-gray-900">Strategic Operation View</h2>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400 mt-0.5">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 uppercase">v3.3 Wrapping</span>
                            <button onClick={() => setDebug(!debug)} className="underline hover:text-blue-500">
                                {debug ? 'Hide' : 'Debug'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button onClick={() => setViewMode('worker')}
                        className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-all", viewMode === 'worker' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500")}>
                        By Worker
                    </button>
                    <button onClick={() => setViewMode('task')}
                        className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-all", viewMode === 'task' ? "bg-white text-teal-600 shadow-sm" : "text-gray-500")}>
                        By Task
                    </button>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    {viewMode === 'worker' && (
                        <label className="flex items-center gap-1 text-gray-500">
                            <input
                                type="checkbox"
                                checked={showNonLabor}
                                onChange={(e) => setShowNonLabor(e.target.checked)}
                                className="accent-blue-600"
                            />
                            <span>Show non-labor</span>
                        </label>
                    )}
                    {viewMode === 'task' && (
                        <span className="text-gray-400 italic">Workers color-coded</span>
                    )}
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded" style={{ background: colors.barIdle.bg, border: `1px dashed ${colors.barIdle.border}` }}></span> Idle
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded" style={{ background: colors.nightGap }}></span> Night
                    </span>
                </div>
            </div>

            {/* Horizontal Scrolling Chart */}
            <div className="flex-1 overflow-auto" ref={containerRef}>
                {/* Sticky Shift/Time Header */}
                <div className="sticky top-0 z-30 bg-white flex" style={{ marginBottom: -HEADER_HEIGHT, width: totalChartWidth }}>
                    <div className="sticky left-0 z-40 bg-white shrink-0" style={{ width: SIDEBAR_WIDTH }}>
                        <svg width={SIDEBAR_WIDTH} height={HEADER_HEIGHT} style={{ display: 'block' }}>
                            <rect x={0} y={0} width={SIDEBAR_WIDTH} height={HEADER_HEIGHT} fill="#fafafa" />
                            <line x1={SIDEBAR_WIDTH} y1={0} x2={SIDEBAR_WIDTH} y2={HEADER_HEIGHT} stroke={colors.grid} strokeWidth={2} />
                            <text x={SIDEBAR_WIDTH / 2} y={HEADER_HEIGHT / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={colors.text}>
                                {viewMode === 'worker' ? 'Workers' : 'Tasks'}
                            </text>
                            <line x1={0} y1={HEADER_HEIGHT} x2={SIDEBAR_WIDTH} y2={HEADER_HEIGHT} stroke={colors.grid} strokeWidth={2} />
                        </svg>
                    </div>
                    <svg width={timelineWidth} height={HEADER_HEIGHT} style={{ display: 'block' }}>
                        <line x1={0} y1={HEADER_HEIGHT} x2={timelineWidth} y2={HEADER_HEIGHT} stroke={colors.grid} strokeWidth={2} />

                        {/* Day Headers + Hour Labels */}
                        {daySections.map((section: any, dayIdx: number) => {
                            const xOffset = dayIdx * (DAY_WIDTH_PX + NIGHT_GAP_WIDTH_PX);
                            const { timeScale, dateLabel, shiftNumber, dayStart } = section;

                            return (
                                <g key={`sticky-${section.dayKey}`} transform={`translate(${xOffset}, 0)`}>
                                    <rect x={0} y={0} width={DAY_WIDTH_PX} height={HEADER_HEIGHT} fill="#f0f9ff" />
                                    <text x={DAY_WIDTH_PX / 2} y={18} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0369a1">
                                        Shift {shiftNumber}
                                    </text>
                                    <text x={DAY_WIDTH_PX / 2} y={36} textAnchor="middle" fontSize={10} fill="#0284c7">
                                        {dateLabel}
                                    </text>
                                    {hourTicks.map(hour => {
                                        const tickDate = new Date(dayStart);
                                        tickDate.setHours(hour, 0, 0, 0);
                                        const x = timeScale(tickDate);
                                        return (
                                            <text key={`${section.dayKey}-${hour}`} x={x} y={HEADER_HEIGHT - 6} textAnchor="middle" fontSize={9} fill={colors.textLight}>
                                                {hour.toString().padStart(2, '0')}:00
                                            </text>
                                        );
                                    })}
                                    <line x1={DAY_WIDTH_PX} y1={0} x2={DAY_WIDTH_PX} y2={HEADER_HEIGHT} stroke={colors.grid} strokeWidth={1} />
                                </g>
                            );
                        })}
                    </svg>
                </div>
                <div className="flex min-w-max">
                    <div className="sticky left-0 z-20 bg-white shrink-0" style={{ width: SIDEBAR_WIDTH }}>
                        <svg width={SIDEBAR_WIDTH} height={totalHeight} style={{ display: 'block', minHeight: '100%' }}>
                            <rect x={0} y={0} width={SIDEBAR_WIDTH} height={totalHeight} fill="#fafafa" />
                            <line x1={SIDEBAR_WIDTH} y1={0} x2={SIDEBAR_WIDTH} y2={totalHeight} stroke={colors.grid} strokeWidth={2} />
                            <line x1={0} y1={HEADER_HEIGHT} x2={SIDEBAR_WIDTH} y2={HEADER_HEIGHT} stroke={colors.grid} />

                            {/* Row Labels */}
                            {allRowIds.map((id: string, i: number) => {
                                const rowY = rowYPositions[i];
                                const rowHeight = getRowHeight(id);

                                // For worker view: use worker name from lookup, fallback to ID
                                let label = viewMode === 'worker'
                                    ? (id === NON_LABOR_ROW_ID ? 'Non-Labor / Wait' : (workerNameMap.get(id) || id.replace('w_', 'W')))
                                    : (taskIdToLabel.get(id) || id);
                                let subText = '';

                                // Add percentage for Task View
                                if (viewMode === 'task' && rowIdToProgressMap) {
                                    const pct = rowIdToProgressMap.get(id.trim()); // Lookup trimmed
                                    if (pct !== undefined) {
                                        subText = `(${pct.toFixed(0)}%)`;
                                    }
                                }

                                return (
                                    <g key={id} transform={`translate(0, ${HEADER_HEIGHT + rowY})`}>
                                        <rect width={SIDEBAR_WIDTH} height={rowHeight} fill={i % 2 === 0 ? '#fafafa' : '#f5f5f5'} />
                                        <circle cx={16} cy={rowHeight / 2} r={3} fill={viewMode === 'worker' ? '#3b82f6' : '#14b8a6'} />

                                        {/* Use foreignObject for word wrapping */}
                                        <foreignObject x={28} y={4} width={SIDEBAR_WIDTH - 32} height={rowHeight - 8}>
                                            <div className="flex flex-col justify-center h-full text-[11px] font-medium text-gray-700 leading-tight" style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
                                                <span>{label}</span>
                                                {subText && <span className="text-[10px] text-gray-500 font-bold">{subText}</span>}
                                            </div>
                                        </foreignObject>

                                        <line x1={0} y1={rowHeight} x2={SIDEBAR_WIDTH} y2={rowHeight} stroke={colors.gridLight} />
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                    <svg width={timelineWidth} height={totalHeight} style={{ display: 'block', minHeight: '100%', overflow: 'visible' }}>
                        <defs>
                            <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="8" height="8">
                                <path d="M-2,2 l4,-4
                                     M0,8 l8,-8
                                     M6,10 l4,-4"
                                    style={{ stroke: '#e5e7eb', strokeWidth: 2 }} />
                            </pattern>
                        </defs>
                        {/* Day Sections (horizontal layout) */}
                        {daySections.map((section: any, dayIdx: number) => {
                            const xOffset = dayIdx * (DAY_WIDTH_PX + NIGHT_GAP_WIDTH_PX);
                            const { timeScale, dateLabel, shiftNumber, dayStart } = section;

                            return (
                                <g key={section.dayKey} transform={`translate(${xOffset}, 0)`}>
                                    {/* Day Header */}
                                    <rect x={0} y={0} width={DAY_WIDTH_PX} height={HEADER_HEIGHT} fill="#f0f9ff" />
                                    <text x={DAY_WIDTH_PX / 2} y={18} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0369a1">
                                        Shift {shiftNumber}
                                    </text>
                                    <text x={DAY_WIDTH_PX / 2} y={36} textAnchor="middle" fontSize={10} fill="#0284c7">
                                        {dateLabel}
                                    </text>
                                    <line x1={0} y1={HEADER_HEIGHT} x2={DAY_WIDTH_PX} y2={HEADER_HEIGHT} stroke={colors.grid} strokeWidth={2} />

                                    {/* Hour Grid Lines & Labels */}
                                    {hourTicks.map(hour => {
                                        const tickDate = new Date(dayStart);
                                        tickDate.setHours(hour, 0, 0, 0);
                                        const x = timeScale(tickDate);

                                        return (
                                            <g key={hour}>
                                                <line
                                                    x1={x} y1={HEADER_HEIGHT}
                                                    x2={x} y2={totalHeight}
                                                    stroke={colors.gridLight}
                                                    strokeDasharray="0"
                                                />
                                                <text x={x} y={HEADER_HEIGHT - 6} textAnchor="middle" fontSize={9} fill={colors.textLight}>
                                                    {hour.toString().padStart(2, '0')}:00
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Time Axis - tick marks */}
                                    <g className="pointer-events-none">
                                        {/* Use simplified ticks() to avoid crash if domain is small */}
                                        {section.timeScale.ticks().map((tick: Date, i: number) => {
                                            const x = section.timeScale(tick);
                                            return (
                                                <g key={i} transform={`translate(${x}, 0)`}>
                                                    <line y1={0} y2={8} stroke="#d1d5db" strokeWidth={1} />
                                                    <text y={20} textAnchor="middle" fontSize={10} fill="#6b7280" fontWeight={500}>
                                                        {formatTime(tick)}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </g>

                                    {/* Row backgrounds */}
                                    {allRowIds.map((rowId: string, i: number) => {
                                        const rowY = rowYPositions[i];
                                        const rowHeight = getRowHeight(rowId);
                                        return (
                                            <g key={`bg-${rowId}-${dayIdx}`}>
                                                <rect
                                                    x={0}
                                                    y={HEADER_HEIGHT + rowY}
                                                    width={DAY_WIDTH_PX}
                                                    height={rowHeight}
                                                    fill={i % 2 === 0 ? '#ffffff' : '#f1f5f9'}
                                                />
                                                <line
                                                    x1={0}
                                                    y1={HEADER_HEIGHT + rowY + rowHeight}
                                                    x2={DAY_WIDTH_PX}
                                                    y2={HEADER_HEIGHT + rowY + rowHeight}
                                                    stroke="#cbd5e1"
                                                    strokeWidth={1}
                                                />
                                            </g>
                                        );
                                    })}

                                    {/* Task Bars */}
                                    {allRowIds.map((rowId: string, rowIdx: number) => {
                                        const sectionRow = section.rows.find((r: any) => r.id === rowId);
                                        if (!sectionRow) return null;

                                        const rowY = rowYPositions[rowIdx];
                                        const rowHeight = getRowHeight(rowId);

                                        // FIX: Filter out IDLE blocks that overlap with actual work to prevent UI clutter
                                        const visibleItems = sectionRow.items.filter((item: any) => {
                                            if (item.taskName !== 'IDLE') return true;
                                            const iStart = item.s.getTime();
                                            const iEnd = item.e.getTime();
                                            // 1s buffer overlap check
                                            return !sectionRow.items.some((other: any) => {
                                                if (other.taskName === 'IDLE') return false;
                                                const oStart = other.s.getTime();
                                                const oEnd = other.e.getTime();
                                                return (iStart < oEnd - 1000) && (iEnd > oStart + 1000);
                                            });
                                        });

                                        return visibleItems.map((item: any, itemIdx: number) => {
                                            const x = timeScale(item.s);
                                            const xEnd = timeScale(item.e);
                                            if (isNaN(x) || isNaN(xEnd)) return null;

                                            const clampedX = Math.max(0, x);
                                            const clampedXEnd = Math.min(DAY_WIDTH_PX, xEnd);
                                            const w = Math.max(4, clampedXEnd - clampedX);
                                            if (w <= 0) return null;

                                            const isIdle = item.taskName === 'IDLE';

                                            // For TASK VIEW: stack workers vertically with strict lanes
                                            if (viewMode === 'task' && item.isTaskView) {
                                                if (item.isWaitTask) {
                                                    const y = HEADER_HEIGHT + rowY + 6;
                                                    const barHeight = rowHeight - 12;
                                                    return (
                                                        <g key={`${rowId}-${itemIdx}`}>
                                                            <rect
                                                                x={clampedX}
                                                                y={y}
                                                                width={w}
                                                                height={barHeight}
                                                                rx={4}
                                                                fill="url(#diagonalHatch)"
                                                                stroke="#9ca3af"
                                                                strokeWidth={1}
                                                            />
                                                            <text
                                                                x={clampedX + w / 2}
                                                                y={y + barHeight / 2 + 4}
                                                                textAnchor="middle"
                                                                fontSize={11}
                                                                fontWeight={600}
                                                                fill="#6b7280"
                                                                style={{ pointerEvents: 'none' }}
                                                            >
                                                                {w > 30 ? 'WAIT / DRY' : ''}
                                                            </text>
                                                            <title>{`Wait/Dry Time\n${formatTime(item.s)} - ${formatTime(item.e)}`}</title>
                                                        </g>
                                                    );
                                                }

                                                // Assign a strict lane index based on worker ID to ensure no overlap ever.
                                                const uniqueWorkersInRow = Array.from(new Set(sectionRow.items.map((i: any) => i.workerId))).sort();
                                                const workerLaneIndex = uniqueWorkersInRow.indexOf(item.workerId);
                                                const laneHeight = (rowHeight - 10) / Math.max(1, uniqueWorkersInRow.length);
                                                const barHeight = Math.max(2, laneHeight - 2);
                                                const y = HEADER_HEIGHT + rowY + 5 + (workerLaneIndex * laneHeight);
                                                const workerColor = workerColorMap.get(item.workerId) || workerColors[0];

                                                return (
                                                    <g key={`${rowId}-${itemIdx}`}>
                                                        <rect
                                                            x={clampedX}
                                                            y={y}
                                                            width={w}
                                                            height={barHeight}
                                                            rx={2}
                                                            fill={highlightedTaskIds?.has(item.taskId || item.taskName) ? '#f59e0b' : workerColor.bg}
                                                            stroke={highlightedTaskIds?.has(item.taskId || item.taskName) ? '#b45309' : workerColor.border}
                                                            strokeWidth={1}
                                                        />
                                                        {/* Only show label if bar is tall enough */}
                                                        {barHeight > 10 && (
                                                            <text
                                                                x={clampedX + 4}
                                                                y={y + barHeight / 2 + 5}
                                                                fontSize={14}
                                                                fontWeight={700}
                                                                fill={workerColor.text}
                                                                style={{ pointerEvents: 'none' }}
                                                            >
                                                                {w > 20 ? item.workerLabel : ''}
                                                            </text>
                                                        )}
                                                        <title>{`${item.workerLabel} on ${rowId}\n${formatTime(item.s)} - ${formatTime(item.e)}`}</title>
                                                    </g>
                                                );
                                            }

                                            // WORKER VIEW: non-labor rendering
                                            if (viewMode === 'worker' && rowId === NON_LABOR_ROW_ID && item.isWaitTask) {
                                                const y = HEADER_HEIGHT + rowY + 6;
                                                const barHeight = rowHeight - 12;
                                                return (
                                                    <g key={`${rowId}-${itemIdx}`}>
                                                        <rect
                                                            x={clampedX}
                                                            y={y}
                                                            width={w}
                                                            height={barHeight}
                                                            rx={4}
                                                            fill="url(#diagonalHatch)"
                                                            stroke="#9ca3af"
                                                            strokeWidth={1}
                                                        />
                                                        <text
                                                            x={clampedX + 6}
                                                            y={y + barHeight / 2 + 4}
                                                            fontSize={12}
                                                            fontWeight={600}
                                                            fill="#6b7280"
                                                            style={{ pointerEvents: 'none' }}
                                                        >
                                                            {w > 50 ? (item.taskName?.substring(0, Math.floor(w / 6)) || '') : ''}
                                                        </text>
                                                        <title>{`${item.taskName || rowId}\n${formatTime(item.s)} - ${formatTime(item.e)}`}</title>
                                                    </g>
                                                );
                                            }

                                            // WORKER VIEW: standard rendering
                                            const style = isIdle ? colors.barIdle : (workerColorMap.get(item.workerId) || workerColors[0]);
                                            const y = HEADER_HEIGHT + rowY + 6;
                                            const barHeight = rowHeight - 12;
                                            const isHighlighted = !isIdle && highlightedTaskIds?.has(item.taskId || item.taskName);

                                            return (
                                                <g key={`${rowId}-${itemIdx}`}>
                                                    <rect
                                                        x={clampedX}
                                                        y={y}
                                                        width={w}
                                                        height={barHeight}
                                                        rx={4}
                                                        fill={isHighlighted ? '#f59e0b' : style.bg}
                                                        stroke={isHighlighted ? '#b45309' : style.border}
                                                        strokeWidth={1.5}
                                                        strokeDasharray={isIdle ? "3 2" : "0"}
                                                        opacity={isIdle ? 0.7 : 1}
                                                    />
                                                    <text
                                                        x={clampedX + 6}
                                                        y={y + barHeight / 2 + 4}
                                                        fontSize={12}
                                                        fontWeight={600}
                                                        fill={style.text}
                                                        style={{ pointerEvents: 'none' }}
                                                    >
                                                        {w > 50 ? (item.taskName?.substring(0, Math.floor(w / 6)) || '') : ''}
                                                    </text>
                                                    <title>{`${item.taskName || rowId}\n${formatTime(item.s)} - ${formatTime(item.e)}`}</title>
                                                </g>
                                            );
                                        });
                                    })}

                                    {/* Right border of day */}
                                    <line x1={DAY_WIDTH_PX} y1={0} x2={DAY_WIDTH_PX} y2={totalHeight} stroke={colors.grid} strokeWidth={1} />
                                </g>
                            );
                        })}

                        {/* Night Gap Indicators (between days) */}
                        {/* Night Gap - Subtle Divider Between Days */}
                        {daySections.slice(0, -1).map((_: any, dayIdx: number) => {
                            const xOffset = ((dayIdx + 1) * DAY_WIDTH_PX) + (dayIdx * NIGHT_GAP_WIDTH_PX);

                            return (
                                <g key={`night-${dayIdx}`} transform={`translate(${xOffset}, 0)`}>
                                    {/* Light background */}
                                    <rect x={0} y={0} width={NIGHT_GAP_WIDTH_PX} height={totalHeight} fill="#f1f5f9" />
                                    {/* Dashed center line */}
                                    <line
                                        x1={NIGHT_GAP_WIDTH_PX / 2}
                                        y1={HEADER_HEIGHT}
                                        x2={NIGHT_GAP_WIDTH_PX / 2}
                                        y2={totalHeight}
                                        stroke="#cbd5e1"
                                        strokeWidth={2}
                                        strokeDasharray="8 4"
                                    />
                                    {/* Small label */}
                                    <text
                                        x={NIGHT_GAP_WIDTH_PX / 2}
                                        y={HEADER_HEIGHT / 2 + 4}
                                        textAnchor="middle"
                                        fontSize={9}
                                        fontWeight={500}
                                        fill="#94a3b8"
                                    >
                                        ••
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        </div>
    );
};

export const PlanGanttVisualization: React.FC<Props> = (props) => {
    return (
        <ErrorBoundary>
            <PlanGanttInner {...props} />
        </ErrorBoundary>
    );
};
