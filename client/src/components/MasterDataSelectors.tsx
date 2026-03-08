import React, { useEffect, useState } from 'react';
import { Calendar, Box, FileText, Briefcase } from 'lucide-react';
import { listShifts, listDepartments, listModuleProfiles, listTravelerTemplates } from "../dataconnect-generated";
import { dc } from "../firebase";

// Types matching SDK response (simplified)
// Types matching SDK response (simplified)
interface Shift { id: string; name: string; startTime: string; endTime: string; }
interface Department { id: string; name: string; }
interface ModuleProfile { id: string; name: string; }
interface TravelerTemplate { id: string; name: string; }

export interface ShiftConfig {
    id: string; // "shift-1", "shift-2", or UUID from DB
    dbShiftId: string; // ID from DB
    name: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    productionRate: number;
}

interface MasterDataSelectorsProps {
    shiftsConfig: ShiftConfig[];
    onShiftsConfigChange: (newConfig: ShiftConfig[]) => void;

    // Other selections
    departmentId?: string;
    moduleProfileId?: string;
    travelerTemplateId?: string;
    onOtherSelectionChange: (selections: {
        departmentId?: string;
        moduleProfileId?: string;
        travelerTemplateId?: string;
    }) => void;
}

export const MasterDataSelectors: React.FC<MasterDataSelectorsProps> = ({
    shiftsConfig,
    onShiftsConfigChange,
    departmentId,
    moduleProfileId,
    travelerTemplateId,
    onOtherSelectionChange
}) => {
    // Data State
    const [dbShifts, setDbShifts] = useState<Shift[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [moduleProfiles, setModuleProfiles] = useState<ModuleProfile[]>([]);
    const [travelerTemplates, setTravelerTemplates] = useState<TravelerTemplate[]>([]);

    // Fetch Data using Data Connect SDK
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                // Execute parallel queries
                const [dShifts, dDepts, dProfiles, dTempls] = await Promise.all([
                    listShifts(dc),
                    listDepartments(dc),
                    listModuleProfiles(dc),
                    listTravelerTemplates(dc)
                ]);

                // Map results to state (handling potential nulls/undefined safely)
                if (dShifts.data.shifts) {
                    const uniqueShifts = new Map<string, Shift>();
                    const cleanName = (n: string) => n.replace(/Shift \d+ \((.*?)\)/i, '$1 Shift').replace('Shift Shift', 'Shift');

                    dShifts.data.shifts.forEach(s => {
                        const name = cleanName(s.name || 'Unnamed');
                        const key = `${name}|${s.startTime}|${s.endTime}`;
                        if (!uniqueShifts.has(key)) {
                            uniqueShifts.set(key, { id: s.id, name: name, startTime: s.startTime || '', endTime: s.endTime || '' });
                        }
                    });

                    setDbShifts(Array.from(uniqueShifts.values()).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')));
                }

                if (dDepts.data.departments) {
                    const uniqueDepts = new Map<string, Department>();
                    dDepts.data.departments.forEach(d => {
                        const name = (d.name || 'Unnamed').replace(/\s+[a-f0-9]+$/i, '').trim();
                        if (!uniqueDepts.has(name)) uniqueDepts.set(name, { id: d.id, name: name });
                    });
                    setDepartments(Array.from(uniqueDepts.values()).sort((a, b) => a.name.localeCompare(b.name)));
                }

                if (dProfiles.data.moduleProfiles) {
                    const uniqueProfiles = new Map<string, ModuleProfile>();
                    dProfiles.data.moduleProfiles.forEach(p => {
                        const name = (p.name || 'Unnamed').replace(/\s*\([^)]*\)$/, '').trim();
                        if (!uniqueProfiles.has(name)) uniqueProfiles.set(name, { id: p.id, name: name });
                    });
                    setModuleProfiles(Array.from(uniqueProfiles.values()).sort((a, b) => a.name.localeCompare(b.name)));
                }

                if (dTempls.data.travelerTemplates) {
                    const uniqueTempls = new Map<string, TravelerTemplate>();
                    dTempls.data.travelerTemplates.forEach(t => {
                        const name = (t.name || 'Unnamed').trim();
                        if (!uniqueTempls.has(name)) uniqueTempls.set(name, { id: t.id, name: name });
                    });
                    setTravelerTemplates(Array.from(uniqueTempls.values()).sort((a, b) => a.name.localeCompare(b.name)));
                }

            } catch (e) {
                console.error("Failed to fetch master data from Data Connect", e);
            }
        };

        fetchMasterData();
    }, []);

    const handleAddShift = () => {
        const lastShift = shiftsConfig[shiftsConfig.length - 1];
        const newId = `shift-${shiftsConfig.length + 1}`;
        // Default to next day or same day + 8 hours?
        // Let's just clone the last one but increment date if logical, or just add empty.

        onShiftsConfigChange([
            ...shiftsConfig,
            {
                id: newId,
                dbShiftId: '',
                name: `Shift ${shiftsConfig.length + 1}`,
                date: lastShift ? lastShift.date : new Date().toISOString().split('T')[0],
                startTime: '07:00',
                endTime: '15:00',
                productionRate: 0.5
            }
        ]);
    };

    const handleRemoveShift = (index: number) => {
        const newShifts = [...shiftsConfig];
        newShifts.splice(index, 1);
        onShiftsConfigChange(newShifts);
    };

    const handleUpdateShift = (index: number, updates: Partial<ShiftConfig>) => {
        const newShifts = [...shiftsConfig];
        newShifts[index] = { ...newShifts[index], ...updates };

        // Auto-update times if DB shift changed
        if (updates.dbShiftId) {
            const dbShift = dbShifts.find(s => s.id === updates.dbShiftId);
            if (dbShift) {
                try {
                    const s = new Date(dbShift.startTime);
                    const e = new Date(dbShift.endTime);
                    if (!isNaN(s.getTime())) newShifts[index].startTime = s.toISOString().substring(11, 16);
                    if (!isNaN(e.getTime())) newShifts[index].endTime = e.toISOString().substring(11, 16);
                    newShifts[index].name = dbShift.name;
                } catch (err) { console.error("Failed to parse shift times", err); }
            }
        }

        onShiftsConfigChange(newShifts);
    };

    return (
        <div className="flex flex-wrap items-center gap-3 bg-white/60 p-2 rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col gap-2">
                {shiftsConfig.map((shift, idx) => (
                    <div key={shift.id} className="flex items-center gap-2 bg-white/50 p-1 rounded-lg border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 w-4">{idx + 1}</span>

                        {/* Date Picker */}
                        <div className="relative group">
                            <Calendar size={12} className="absolute left-1.5 top-1.5 text-blue-400 pointer-events-none" />
                            <input
                                type="date"
                                value={shift.date}
                                onChange={(e) => handleUpdateShift(idx, { date: e.target.value })}
                                className="pl-6 pr-1 py-0.5 text-xs border border-gray-200 rounded text-gray-600 focus:ring-1 focus:ring-blue-500 w-[110px]"
                            />
                        </div>

                        {/* DB Shift Selector */}
                        <select
                            value={shift.dbShiftId}
                            onChange={(e) => handleUpdateShift(idx, { dbShiftId: e.target.value })}
                            className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 cursor-pointer hover:bg-white/80 rounded w-[120px]"
                        >
                            <option value="">(Custom)</option>
                            {dbShifts.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({new Date(s.startTime).getUTCHours()}-{new Date(s.endTime).getUTCHours()})
                                </option>
                            ))}
                        </select>

                        {/* Manual Times */}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <input
                                type="time"
                                value={shift.startTime}
                                onChange={(e) => handleUpdateShift(idx, { startTime: e.target.value })}
                                className="w-[55px] p-0 border-none bg-transparent text-right"
                            />
                            <span>-</span>
                            <input
                                type="time"
                                value={shift.endTime}
                                onChange={(e) => handleUpdateShift(idx, { endTime: e.target.value })}
                                className="w-[55px] p-0 border-none bg-transparent"
                            />
                        </div>

                        {/* Rate */}
                        <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                            <span className="text-[9px] text-gray-400 uppercase">Rate</span>
                            <input
                                type="number"
                                step={0.05} min={0} max={1}
                                value={shift.productionRate}
                                onChange={(e) => handleUpdateShift(idx, { productionRate: parseFloat(e.target.value) })}
                                className="w-10 text-xs bg-transparent border-0 p-0 focus:ring-0 text-center font-mono text-blue-600"
                            />
                        </div>

                        {/* Remove Button */}
                        <button
                            onClick={() => handleRemoveShift(idx)}
                            disabled={shiftsConfig.length === 1}
                            className="text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300 transition-colors"
                            title="Remove Shift"
                        >
                            &times;
                        </button>
                    </div>
                ))}

                <button
                    onClick={handleAddShift}
                    className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium py-1 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
                >
                    + Add Shift
                </button>
            </div>

            <div className="h-full w-px bg-gray-200 mx-1"></div>

            {/* Configs */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1" title="Department">
                    <Briefcase size={14} className="text-purple-600" />
                    <select
                        value={departmentId}
                        onChange={e => onOtherSelectionChange({ departmentId: e.target.value })}
                        className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 w-24 cursor-pointer"
                    >
                        <option value="">All Depts</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-1" title="Module Profile">
                    <Box size={14} className="text-orange-600" />
                    <select
                        value={moduleProfileId}
                        onChange={e => onOtherSelectionChange({ moduleProfileId: e.target.value })}
                        className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 w-32 cursor-pointer"
                    >
                        <option value="">Select Profile...</option>
                        {moduleProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-1" title="Traveler Template">
                    <FileText size={14} className="text-green-600" />
                    <select
                        value={travelerTemplateId}
                        onChange={e => onOtherSelectionChange({ travelerTemplateId: e.target.value })}
                        className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 w-32 cursor-pointer"
                    >
                        <option value="">Select Template...</option>
                        {travelerTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>
        </div >
    );
};
