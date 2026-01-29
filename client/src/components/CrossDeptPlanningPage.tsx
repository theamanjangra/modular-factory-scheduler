
import React, { useRef } from 'react';
import { useCrossDeptPlanning } from '../hooks/useCrossDeptPlanning';
import { StationGanttVisualization } from './StationGanttVisualization';

// Simple Icons
const UploadIcon = () => (
    <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const BalanceIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
);

export const CrossDeptPlanningPage: React.FC = () => {
    const { uploadFile, data, isLoading, error, mode, toggleBalance, currentPlan } = useCrossDeptPlanning();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            uploadFile(e.target.files[0]);
        }
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] p-6 bg-gray-50 flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cross-Department Work Planner</h1>
                    <p className="text-sm text-gray-500 mt-1">Optimization for Multi-Skill Factories</p>
                </div>

                {!data && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group border-2 border-dashed border-gray-300 rounded-xl px-6 py-4 flex items-center gap-4 cursor-pointer hover:border-blue-500 bg-white hover:bg-blue-50 transition-all"
                    >
                        <UploadIcon />
                        <div className="text-left">
                            <div className="text-sm font-semibold text-gray-700 group-hover:text-blue-700">Upload Optimization Master</div>
                            <div className="text-xs text-gray-400">.xlsx files supported</div>
                        </div>
                        <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} />
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                    <span className="font-bold mr-2">Error:</span> {error}
                </div>
            )}

            {isLoading && (
                <div className="flex-grow flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-gray-500 font-medium">Running Optimization Algorithms...</div>
                    <div className="text-xs text-gray-400 mt-1">Analyzing skills and departments</div>
                </div>
            )}

            {data && currentPlan && !isLoading && (
                <>
                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${mode === 'department' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>
                                {mode === 'department' ? 'Department Locked' : 'Skill Balanced'}
                            </div>
                            <div className="text-sm text-gray-600">
                                <strong>{currentPlan.stats.tasksFullyStaffed}</strong> tasks staffed,
                                <span className="text-red-600 ml-2 font-medium">{currentPlan.deficitTasks.length} deficits</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Re-Upload
                            </button>
                            <button
                                onClick={toggleBalance}
                                className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-md ${mode === 'department'
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 active:scale-95'
                                        : 'bg-gray-700 hover:bg-gray-800'
                                    }`}
                            >
                                <BalanceIcon />
                                {mode === 'department' ? 'Auto-Balance Resources' : 'Reset to Department View'}
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-grow min-h-0">
                        <StationGanttVisualization plan={currentPlan} workers={data.workers} />
                    </div>
                </>
            )}
        </div>
    );
};
