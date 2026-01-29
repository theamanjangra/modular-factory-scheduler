import { useMemo, useRef, useState, useEffect } from 'react';
import { AlertCircle, Calendar, Download, Loader2, Play, Upload } from 'lucide-react';
import { usePlanData, type MultiShiftOptions, type SchedulingConfig } from '../hooks/usePlanData';
import { PlanGanttVisualization } from './PlanGanttVisualization';
import type { AdjustmentResult } from '../types';
import PlanAdjustmentPanel from './PlanAdjustmentPanel';
import { formatInTimeZone } from 'date-fns-tz';
import { FACTORY_TIMEZONE, timeToIso, getTimezoneAbbr } from '../utils/timezone';

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
    const { data, loading, error, runMultiShift, exportMultiShift, adjustPlan } = usePlanData();
    const [shift1Start, setShift1Start] = useState('07:00');
    const [shift1End, setShift1End] = useState('13:00');
    const [useShift2, setUseShift2] = useState(true);
    const [shift2Start, setShift2Start] = useState('13:00');
    const [shift2End, setShift2End] = useState('17:00');
    const [startingShiftPct, setStartingShiftPct] = useState(0.75);
    const [endingShiftPct, setEndingShiftPct] = useState(0.25);
    const [minAssignmentMinutes, setMinAssignmentMinutes] = useState<30 | 60 | 90>(30);
    const [timeStepMinutes, setTimeStepMinutes] = useState(5);
    const [transitionGapMs, setTransitionGapMs] = useState(0);
    const [adjustmentResult, setAdjustmentResult] = useState<AdjustmentResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!fileInputRef.current?.files?.[0]) return;
        setAdjustmentResult(null); // Clear previous adjustment on new run
        const { shift1Date, shift2Date } = shiftDates;
        // Build wall-clock ISO (no timezone conversion; matches backend expectations).
        const toWallClockIso = (hhmm: string, date: string) => `${date}T${hhmm.padStart(5, '0')}:00.000Z`;

        const options: MultiShiftOptions = {
            startTime: toWallClockIso(shift1Start, shift1Date),
            endTime: useShift2 ? toWallClockIso(shift2End, shift2Date) : toWallClockIso(shift1End, shift1Date),
            shift1StartTime: toWallClockIso(shift1Start, shift1Date),
            shift1EndTime: toWallClockIso(shift1End, shift1Date),
            useShift2,
            shift2StartTime: useShift2 ? toWallClockIso(shift2Start, shift2Date) : undefined,
            shift2EndTime: useShift2 ? toWallClockIso(shift2End, shift2Date) : undefined,
            startingShiftPct,
            endingShiftPct: useShift2 ? endingShiftPct : undefined,
            startingShiftId: 'shift-1',
            endingShiftId: useShift2 ? 'shift-2' : 'shift-1',
            scheduling: schedulingConfig
        };

        runMultiShift(fileInputRef.current.files[0], options);
    };

    const handleExportMultiShift = () => {
        if (!fileInputRef.current?.files?.[0]) return;
        const { shift1Date, shift2Date } = shiftDates;
        // Build wall-clock ISO (no timezone conversion; matches backend expectations).
        const toWallClockIso = (hhmm: string, date: string) => `${date}T${hhmm.padStart(5, '0')}:00.000Z`;

        const options = {
            startTime: toWallClockIso(shift1Start, shift1Date),
            endTime: useShift2 ? toWallClockIso(shift2End, shift2Date) : toWallClockIso(shift1End, shift1Date),
            shift1StartTime: toWallClockIso(shift1Start, shift1Date),
            shift1EndTime: toWallClockIso(shift1End, shift1Date),
            useShift2,
            shift2StartTime: useShift2 ? toWallClockIso(shift2Start, shift2Date) : undefined,
            shift2EndTime: useShift2 ? toWallClockIso(shift2End, shift2Date) : undefined,
            startingShiftPct,
            endingShiftPct: useShift2 ? endingShiftPct : undefined,
            startingShiftId: 'shift-1',
            endingShiftId: useShift2 ? 'shift-2' : 'shift-1',
            scheduling: schedulingConfig
        };

        exportMultiShift(fileInputRef.current.files[0], options);
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
                            <span className="text-xs font-medium text-gray-500">Version 2.1</span>
                        </div>
                    </div>

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

                    {/* Multi-Shift Configuration */}
                    <div className="flex items-center gap-3 bg-gray-100/50 px-4 py-2 rounded-xl border border-gray-200/50">
                        <div className="flex flex-col text-xs text-gray-500">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">Multi-Shift Planning</span>
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                                    <Calendar size={10} />
                                    <span>{shiftDates.shift1Date}</span>
                                    {useShift2 && <span>→ {shiftDates.shift2Date}</span>}
                                </div>
                                <span className="text-[10px] font-medium text-gray-500">({getTimezoneAbbr()})</span>
                            </div>
                            <div className="flex gap-2 items-center mt-1">
                                <label className="flex items-center gap-1">
                                    Shift 1
                                    <input type="time" value={shift1Start} onChange={(e) => setShift1Start(e.target.value)} className="border rounded px-2 py-1 text-xs w-28" />
                                    <span>-</span>
                                    <input type="time" value={shift1End} onChange={(e) => setShift1End(e.target.value)} className="border rounded px-2 py-1 text-xs w-28" />
                                </label>
                                <label className="flex items-center gap-1">
                                    Rate
                                    <input type="number" step="0.05" min="0.5" max="1" value={startingShiftPct} onChange={(e) => setStartingShiftPct(parseFloat(e.target.value))} className="border rounded px-2 py-1 text-xs w-20" />
                                </label>
                            </div>
                            <div className="flex gap-2 items-center mt-1">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={useShift2} onChange={(e) => setUseShift2(e.target.checked)} />
                                    Use Shift 2
                                </label>
                                <label className="flex items-center gap-1">
                                    <input type="time" value={shift2Start} onChange={(e) => setShift2Start(e.target.value)} disabled={!useShift2} className="border rounded px-2 py-1 text-xs w-28" />
                                    <span>-</span>
                                    <input type="time" value={shift2End} onChange={(e) => setShift2End(e.target.value)} disabled={!useShift2} className="border rounded px-2 py-1 text-xs w-28" />
                                </label>
                                <label className="flex items-center gap-1">
                                    Rate
                                    <input type="number" step="0.05" min="0" max="1" value={endingShiftPct} onChange={(e) => setEndingShiftPct(parseFloat(e.target.value))} disabled={!useShift2} className="border rounded px-2 py-1 text-xs w-20" />
                                </label>
                            </div>
                        </div>
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
                {data ? (
                    <div className="h-[650px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                        <PlanGanttVisualization
                            data={data}
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
                {data && data.tasks && data.tasks.length > 0 && (
                    <div className="mt-8 mb-8 bg-white/50 backdrop-blur-sm rounded-2xl p-1 border border-gray-100/50">
                        <PlanAdjustmentPanel
                            tasks={data.tasks}
                            workers={data.workers || []}
                            planId={data.planId}
                            planStartTime={planWindow?.startIso}
                            onAdjust={handleAdjustPlan}
                            isLoading={loading}
                            // NEW: Pass shift configuration
                            shift1={{ date: shiftDates.shift1Date, startTime: shift1Start, endTime: shift1End }}
                            shift2={useShift2 ? { date: shiftDates.shift2Date, startTime: shift2Start, endTime: shift2End } : undefined}
                            useShift2={useShift2}
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
