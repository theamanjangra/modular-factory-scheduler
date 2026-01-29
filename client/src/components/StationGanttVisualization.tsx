/**
 * StationGanttVisualization
 *
 * iOS-style station-based Gantt chart for Cross-Department Planning.
 * Displays:
 * - Stations as major row groups (numbered 1, 2, 3, 4...)
 * - Travelers/Boxes as sub-rows within each station
 * - Color-coded blocks showing deficit, cross-dept help, availability
 * - Surplus/Deficit badges on the right
 */

import React, { useMemo } from 'react';
import { TimelineBuffer } from '../types/crossDeptTypes';

interface Props {
    plan: {
        timeline: TimelineBuffer[];
        deficitTasks: any[];
        idleWorkers?: any[];
        stats?: any;
    };
    workers: any[];
}

const START_HOUR = 7;  // 7 AM
const END_HOUR = 15;   // 3 PM (matching iOS screenshot)
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Department colors
const DEPT_COLORS: Record<string, string> = {
    'structure': '#fef3c7',
    'mep': '#dbeafe',
    'building envelope': '#d1fae5',
    'interior/exterior': '#fce7f3',
    'mep finish': '#e0e7ff',
    'final close-out': '#f3e8ff',
    'closeup': '#d1fae5',
    'roofing': '#fef3c7',
    'siding': '#d1fae5',
    'flooring': '#fce7f3',
    'roof / ceiling assembly': '#e0e7ff',
};

// Helper: Get block style based on type
const getBlockStyle = (item: TimelineBuffer, allWorkers: any[]) => {
    if (item.isDeficit) {
        return {
            bg: 'bg-red-50',
            border: 'border-red-300',
            text: 'text-red-700',
            type: 'deficit'
        };
    }

    const taskDept = (item.departmentId || '').toLowerCase();
    const isCrossDept = item.assignedWorkers.some(wid => {
        const w = allWorkers.find((worker: any) => worker.workerId === wid);
        const wDept = (w?.departmentId || '').toLowerCase();
        return wDept && wDept !== taskDept && wDept !== 'unknown';
    });

    if (isCrossDept) {
        return {
            bg: 'bg-blue-50',
            border: 'border-blue-300',
            text: 'text-blue-700',
            type: 'helping_from'
        };
    }

    if (item.assignedWorkers.length === 0) {
        return {
            bg: 'bg-green-50',
            border: 'border-green-300',
            text: 'text-green-700',
            type: 'available'
        };
    }

    return {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        text: 'text-gray-700',
        type: 'working'
    };
};

// Helper: Get source department for cross-dept workers
const getSourceDepartment = (item: TimelineBuffer, allWorkers: any[]): string | null => {
    const taskDept = (item.departmentId || '').toLowerCase();

    for (const wid of item.assignedWorkers) {
        const w = allWorkers.find((worker: any) => worker.workerId === wid);
        const wDept = (w?.departmentId || '').toLowerCase();
        if (wDept && wDept !== taskDept && wDept !== 'unknown') {
            return w?.departmentId || wDept;
        }
    }
    return null;
};

// Worker icon component
const WorkerIcon = () => (
    <span className="text-sm">👷</span>
);

export const StationGanttVisualization: React.FC<Props> = ({ plan, workers }) => {
    const { timeline, deficitTasks } = plan;

    // Group by Station -> Traveler
    const grouped = useMemo(() => {
        const groups: Record<string, {
            stationNum: number;
            travelers: Record<string, {
                items: TimelineBuffer[];
                surplusDeficit: number;
            }>;
        }> = {};

        timeline.forEach(item => {
            // Extract station number
            const stationStr = item.station || 'Station 1';
            const stationMatch = stationStr.match(/(\d+)/);
            const stationNum = stationMatch ? parseInt(stationMatch[1]) : 1;
            const stationKey = `${stationNum}`;

            const travelerId = item.travelerId || 'Unknown';

            if (!groups[stationKey]) {
                groups[stationKey] = {
                    stationNum,
                    travelers: {}
                };
            }

            if (!groups[stationKey].travelers[travelerId]) {
                groups[stationKey].travelers[travelerId] = {
                    items: [],
                    surplusDeficit: 0
                };
            }

            groups[stationKey].travelers[travelerId].items.push(item);

            // Calculate surplus/deficit
            if (item.isDeficit) {
                // Deficit hours (negative)
                const durationHours = calculateDuration(item.startDate, item.endDate);
                groups[stationKey].travelers[travelerId].surplusDeficit -= durationHours;
            } else if (item.assignedWorkers.length > 0) {
                // Assigned hours (positive surplus capacity)
                const durationHours = calculateDuration(item.startDate, item.endDate);
                groups[stationKey].travelers[travelerId].surplusDeficit += durationHours * 0.5; // Surplus factor
            }
        });

        // Sort stations numerically
        const sortedStations = Object.keys(groups).sort((a, b) =>
            groups[a].stationNum - groups[b].stationNum
        );

        return { groups, sortedStations };
    }, [timeline]);

    // Time labels (7am to 3pm)
    const timeLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
        const hour = START_HOUR + i;
        return {
            hour,
            label: hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`
        };
    });

    const getPositionStyle = (startIso: string, endIso: string) => {
        const dStart = new Date(startIso);
        const dEnd = new Date(endIso);

        const startH = dStart.getUTCHours() + (dStart.getUTCMinutes() / 60);
        const endH = dEnd.getUTCHours() + (dEnd.getUTCMinutes() / 60);

        const s = Math.max(START_HOUR, startH);
        const e = Math.min(END_HOUR, endH);

        const leftPct = ((s - START_HOUR) / TOTAL_HOURS) * 100;
        const widthPct = Math.max(5, ((e - s) / TOTAL_HOURS) * 100);

        return { left: `${leftPct}%`, width: `${widthPct}%` };
    };

    return (
        <div className="flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden">
            {/* iOS-style Header */}
            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-bold">V</span>
                        </div>
                        <span className="text-white font-semibold text-lg">Vederra</span>
                        <span className="text-gray-400 text-xs uppercase tracking-wider ml-1">MODULAR</span>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2">
                    <button className="px-5 py-2 text-sm font-medium text-gray-400 rounded-full border border-gray-600 hover:bg-gray-700 transition-colors">
                        Items
                    </button>
                    <button className="px-5 py-2 text-sm font-medium text-gray-400 rounded-full border border-gray-600 hover:bg-gray-700 transition-colors">
                        Crews
                    </button>
                    <button className="px-5 py-2 text-sm font-medium text-gray-400 rounded-full border border-gray-600 hover:bg-gray-700 transition-colors">
                        Factory Floor
                    </button>
                    <button className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-full">
                        Schedule
                    </button>
                </div>

                <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                    Logout
                </button>
            </div>

            {/* Time Axis Header */}
            <div className="flex bg-gray-100 border-b border-gray-300">
                <div className="w-16 flex-shrink-0 bg-gray-200" /> {/* Station number column */}
                <div className="flex-grow relative h-10">
                    {timeLabels.map((t, i) => (
                        <div
                            key={t.hour}
                            className="absolute top-0 bottom-0 flex items-center"
                            style={{ left: `${(i / TOTAL_HOURS) * 100}%` }}
                        >
                            <div className="border-l border-gray-300 border-dashed h-full" />
                            <span className="text-xs text-gray-500 font-medium pl-1">
                                {t.label}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="w-16 flex-shrink-0" /> {/* Surplus/Deficit column */}
            </div>

            {/* Main Content */}
            <div className="flex-grow overflow-y-auto bg-white">
                {grouped.sortedStations.map(stationKey => {
                    const station = grouped.groups[stationKey];
                    const travelerIds = Object.keys(station.travelers);

                    return (
                        <div key={stationKey} className="border-b border-gray-200">
                            {travelerIds.map((travelerId, travelerIdx) => {
                                const traveler = station.travelers[travelerId];
                                const surplusDeficit = Math.round(traveler.surplusDeficit);

                                return (
                                    <div
                                        key={travelerId}
                                        className="flex border-b border-gray-100 last:border-b-0 min-h-[80px] hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Station Number Column */}
                                        <div className="w-16 flex-shrink-0 bg-gray-100 flex items-center justify-center border-r border-gray-200">
                                            {travelerIdx === 0 && (
                                                <span className="text-2xl font-bold text-gray-600">
                                                    {station.stationNum}
                                                </span>
                                            )}
                                        </div>

                                        {/* Timeline Area */}
                                        <div className="flex-grow relative py-2 px-1">
                                            {/* Traveler ID Label */}
                                            <div className="absolute top-2 left-2 z-10">
                                                <span className="text-lg font-bold text-gray-800">
                                                    {travelerId}
                                                </span>
                                            </div>

                                            {/* Grid Lines */}
                                            {timeLabels.map((t, i) => (
                                                <div
                                                    key={t.hour}
                                                    className="absolute top-0 bottom-0 border-l border-dashed border-gray-200"
                                                    style={{ left: `${(i / TOTAL_HOURS) * 100}%` }}
                                                />
                                            ))}

                                            {/* Task Blocks */}
                                            <div className="pt-8 space-y-1">
                                                {traveler.items.map((item, idx) => {
                                                    const style = getBlockStyle(item, workers);
                                                    const posStyle = getPositionStyle(item.startDate, item.endDate);
                                                    const sourceDept = getSourceDepartment(item, workers);
                                                    const workerCount = item.assignedWorkers.length;

                                                    // Build label based on type
                                                    let label = '';
                                                    let showToolsIcon = false;

                                                    if (item.isDeficit) {
                                                        const hours = calculateDuration(item.startDate, item.endDate);
                                                        label = `${Math.round(hours)} HOURS NEEDED`;
                                                        showToolsIcon = true;
                                                    } else if (sourceDept) {
                                                        label = `${workerCount} WORKER${workerCount > 1 ? 'S' : ''} HELPING FROM ${sourceDept.toUpperCase()}`;
                                                    } else if (workerCount > 0) {
                                                        label = `${workerCount} WORKER${workerCount > 1 ? 'S' : ''} AVAILABLE`;
                                                    }

                                                    return (
                                                        <div
                                                            key={`${item.taskId}-${idx}`}
                                                            className={`absolute h-8 rounded-md border ${style.bg} ${style.border} flex items-center px-2 gap-1 overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
                                                            style={{
                                                                ...posStyle,
                                                                top: `${32 + idx * 36}px`
                                                            }}
                                                            title={`${item.taskName}\n${item.assignedWorkerNames?.join(', ') || 'No workers'}`}
                                                        >
                                                            {/* Worker Icons or Tools Icon */}
                                                            {showToolsIcon ? (
                                                                <span className="text-sm">🛠️</span>
                                                            ) : (
                                                                Array.from({ length: Math.min(workerCount, 3) }).map((_, i) => (
                                                                    <WorkerIcon key={i} />
                                                                ))
                                                            )}

                                                            {/* Label */}
                                                            <span className={`text-xs font-bold uppercase tracking-wide truncate ${style.text}`}>
                                                                {label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Surplus/Deficit Badge Column */}
                                        <div className="w-16 flex-shrink-0 flex items-start justify-center pt-3 border-l border-gray-200">
                                            {surplusDeficit !== 0 && (
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-bold ${surplusDeficit > 0
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-red-500 text-white'
                                                        }`}
                                                >
                                                    {surplusDeficit > 0 ? '+' : ''}{surplusDeficit}h
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}

                {/* Empty State */}
                {grouped.sortedStations.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        <p className="text-lg font-medium">No Schedule Data</p>
                        <p className="text-sm">Upload an Excel file to see the station schedule</p>
                    </div>
                )}
            </div>

            {/* Save Plan Button (iOS style) */}
            <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-center">
                <button className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full shadow-sm transition-colors">
                    Save Plan
                </button>
            </div>
        </div>
    );
};

// Helper: Calculate duration in hours
function calculateDuration(startIso: string, endIso: string): number {
    const start = new Date(startIso);
    const end = new Date(endIso);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}
