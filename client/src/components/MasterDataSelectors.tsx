import React, { useEffect, useState } from 'react';
import { Calendar, Users, Box, FileText, Briefcase } from 'lucide-react';
import { listShifts, listDepartments, listModuleProfiles, listTravelerTemplates } from "../dataconnect-generated";
import { dc } from "../firebase";

// Types matching SDK response (simplified)
interface Shift { id: string; name: string; startTime: string; endTime: string; }
interface Department { id: string; name: string; }
interface ModuleProfile { id: string; name: string; }
interface TravelerTemplate { id: string; name: string; }

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

                console.log('DEBUG: Raw Data Connect Responses', {
                    shifts: dShifts.data,
                    depts: dDepts.data,
                    profiles: dProfiles.data,
                    templs: dTempls.data
                });

                // Map results to state (handling potential nulls/undefined safely)
                if (dShifts.data.shifts) {
                    setShifts(dShifts.data.shifts.map(s => ({
                        id: s.id,
                        name: s.name || 'Unnamed',
                        startTime: s.startTime || '',
                        endTime: s.endTime || ''
                    })));
                }

                if (dDepts.data.departments) {
                    setDepartments(dDepts.data.departments.map(d => ({
                        id: d.id,
                        name: d.name || 'Unnamed Dept'
                    })));
                }

                if (dProfiles.data.moduleProfiles) {
                    setModuleProfiles(dProfiles.data.moduleProfiles.map(p => ({
                        id: p.id,
                        name: p.name || 'Unnamed Profile'
                    })));
                }

                if (dTempls.data.travelerTemplates) {
                    setTravelerTemplates(dTempls.data.travelerTemplates.map(t => ({
                        id: t.id,
                        name: t.name || 'Unnamed Template'
                    })));
                }

            } catch (e) {
                console.error("Failed to fetch master data from Data Connect", e);
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
                    {shifts.map(s => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                            {s.startTime && s.endTime ? ` (${new Date(s.startTime).getUTCHours()}:00-${new Date(s.endTime).getUTCHours()}:00)` : ''}
                        </option>
                    ))}
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

