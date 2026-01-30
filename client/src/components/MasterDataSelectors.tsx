import React, { useEffect, useState } from 'react';
import { Calendar, Users, Box, FileText, Briefcase } from 'lucide-react';

// Types matching backend response
interface StartEnd { startTime: string; endTime: string; }
interface Shift { id: string; name: string; startTime: string; endTime: string; }
interface Department { id: string; name: string; }
interface ModuleProfile { id: string; name: string; }
interface TravelerTemplate { id: string; name: string; }
interface Worker { id: string; firstName: string; lastName: string; }

interface MasterDataSelectorsProps {
    onSelectionChange: (selections: {
        shift1Id?: string;
        shift2Id?: string;
        departmentId?: string;
        moduleProfileId?: string;
        travelerTemplateId?: string;
    }) => void;
}

export const MasterDataSelectors: React.FC<MasterDataSelectorsProps> = ({ onSelectionChange }) => {
    // Data State
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [moduleProfiles, setModuleProfiles] = useState<ModuleProfile[]>([]);
    const [travelerTemplates, setTravelerTemplates] = useState<TravelerTemplate[]>([]);

    // Selection State
    const [selectedShift1, setSelectedShift1] = useState<string>('');
    const [selectedShift2, setSelectedShift2] = useState<string>('');
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [selectedProfile, setSelectedProfile] = useState<string>('');
    const [selectedTempl, setSelectedTempl] = useState<string>('');

    // Fetch Data
    useEffect(() => {
        const fetchMasterData = async () => {
            const API_BASE = import.meta.env.VITE_API_URL || '';
            try {
                const [resShifts, resDepts, resProfiles, resTempls] = await Promise.all([
                    fetch(`${API_BASE}/api/v1/master/shifts`),
                    fetch(`${API_BASE}/api/v1/master/departments`),
                    fetch(`${API_BASE}/api/v1/master/module-profiles`),
                    fetch(`${API_BASE}/api/v1/master/traveler-templates`)
                ]);

                const dShifts = await resShifts.json();
                const dDepts = await resDepts.json();
                const dProfiles = await resProfiles.json();
                const dTempls = await resTempls.json();

                if (dShifts.success) setShifts(dShifts.data);
                if (dDepts.success) setDepartments(dDepts.data);
                if (dProfiles.success) setModuleProfiles(dProfiles.data);
                if (dTempls.success) setTravelerTemplates(dTempls.data);

            } catch (e) {
                console.error("Failed to fetch master data", e);
            }
        };

        fetchMasterData();
    }, []);

    // Notify Parent of Changes
    useEffect(() => {
        onSelectionChange({
            shift1Id: selectedShift1,
            shift2Id: selectedShift2,
            departmentId: selectedDept,
            moduleProfileId: selectedProfile,
            travelerTemplateId: selectedTempl
        });
    }, [selectedShift1, selectedShift2, selectedDept, selectedProfile, selectedTempl]);

    return (
        <div className="flex flex-wrap items-center gap-3 bg-white/60 p-2 rounded-xl border border-blue-100 shadow-sm">
            {/* Shifts */}
            <div className="flex items-center gap-2">
                <Calendar size={14} className="text-blue-600" />
                <select
                    value={selectedShift1}
                    onChange={e => setSelectedShift1(e.target.value)}
                    className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 cursor-pointer hover:bg-white/50 rounded"
                >
                    <option value="">Shift 1 (Default)</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({new Date(s.startTime).getUTCHours()}:00-{new Date(s.endTime).getUTCHours()}:00)</option>)}
                </select>
                <span className="text-gray-300">|</span>
                <select
                    value={selectedShift2}
                    onChange={e => setSelectedShift2(e.target.value)}
                    className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 cursor-pointer hover:bg-white/50 rounded"
                >
                    <option value="">Shift 2 (None)</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            <div className="h-4 w-px bg-gray-300 mx-1"></div>

            {/* Configs */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1" title="Department">
                    <Briefcase size={14} className="text-purple-600" />
                    <select
                        value={selectedDept}
                        onChange={e => setSelectedDept(e.target.value)}
                        className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 w-24 cursor-pointer"
                    >
                        <option value="">All Depts</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-1" title="Module Profile">
                    <Box size={14} className="text-orange-600" />
                    <select
                        value={selectedProfile}
                        onChange={e => setSelectedProfile(e.target.value)}
                        className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 w-32 cursor-pointer"
                    >
                        <option value="">Select Profile...</option>
                        {moduleProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-1" title="Traveler Template">
                    <FileText size={14} className="text-green-600" />
                    <select
                        value={selectedTempl}
                        onChange={e => setSelectedTempl(e.target.value)}
                        className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 w-32 cursor-pointer"
                    >
                        <option value="">Select Template...</option>
                        {travelerTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
};
