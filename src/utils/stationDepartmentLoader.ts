
import * as XLSX from 'xlsx';

export interface TaskTemplateInfo {
    department: string;
    description: string;
    requiredSkills: string[];
}

export interface StationTemplateMap {
    [stationId: number]: {
        department: string; // fallback
        tasks: Map<string, TaskTemplateInfo>; // keyed by Task Name (lowercase)
        templates: TaskTemplateInfo[]; // Array for iteration/search
    };
}

export interface CrossDeptTask {
    id: string;
    station: string; // e.g. "Station 1"
    department: string;
    taskName: string;
    travelerId: string;
    durationHours: number;
    minWorkers: number;
    maxWorkers: number;
    requiredSkills: string[];
}

export interface MatchableWorker {
    workerId: string;
    name: string;
    skills: Record<string, number>;
    departmentId: string;
}

// Helper to parse "2 HRS 10 MIN" or "45 MIN"
function parseDurationString(timeStr: string): number {
    if (!timeStr) return 0;
    let totalHours = 0;

    const str = String(timeStr).toUpperCase();

    // Check for HRS
    const hrsMatch = str.match(/(\d+)\s*HRS?/);
    if (hrsMatch) {
        totalHours += parseInt(hrsMatch[1], 10);
    }

    // Check for MIN
    const minMatch = str.match(/(\d+)\s*MIN/);
    if (minMatch) {
        totalHours += parseInt(minMatch[1], 10) / 60;
    }

    return totalHours;
}

export function loadStationTemplateMap(buffer: Buffer): StationTemplateMap {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets['Task Template Data'];
    if (!sheet) {
        console.warn("Sheet 'Task Template Data' not found for mapping.");
        return {};
    }

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    if (data.length < 2) return {};

    // Find headers
    const headers = data[1];
    const stationIdx = headers.indexOf('Station');
    const deptIdx = headers.indexOf('Department ID');
    const nameIdx = headers.indexOf('Name');
    const descIdx = headers.indexOf('Task Description');
    const skillsIdx = headers.indexOf('Ranked skills');

    const map: StationTemplateMap = {};
    if (stationIdx === -1 || deptIdx === -1) return map; // basic requirement

    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        const station = row[stationIdx];
        const dept = row[deptIdx];
        const name = nameIdx !== -1 ? row[nameIdx] : null;
        const desc = descIdx !== -1 ? row[descIdx] : '';
        const skillsRaw = skillsIdx !== -1 ? row[skillsIdx] : '';

        if (station && dept) {
            const stNum = parseInt(station);
            if (!isNaN(stNum)) {
                if (!map[stNum]) {
                    map[stNum] = { department: String(dept).trim(), tasks: new Map(), templates: [] };
                }

                // Populate task specific info
                if (name) {
                    const cleanName = String(name).trim();
                    const cleanNameKey = cleanName.toLowerCase();
                    const skillList = String(skillsRaw).split(',').map(s => s.trim()).filter(s => s);

                    const info: TaskTemplateInfo = {
                        department: String(dept).trim(),
                        description: String(desc || ''),
                        requiredSkills: skillList
                    };

                    map[stNum].tasks.set(cleanNameKey, info);
                    map[stNum].templates.push(info);
                }
            }
        }
    }
    return map;
}

export function loadCrossDeptTasks(buffer: Buffer, templateMap: StationTemplateMap): CrossDeptTask[] {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets['Time Study List'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const tasks: CrossDeptTask[] = [];

    let currentStation: number | null = null;
    let colIndexSerial = -1;
    let colIndexTime = -1;
    let colIndexGuys = -1;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const col0 = String(row[0] || '').trim();

        // 1. Check for Station Header
        if (col0.toLowerCase().startsWith('station')) {
            const parts = col0.split(' ');
            if (parts.length >= 2) {
                const num = parseInt(parts[1]);
                if (!isNaN(num)) {
                    currentStation = num;
                }
            }
            continue;
        }

        // 2. Check for TASK header row (updates column indices)
        if (col0.startsWith('TASK')) {
            colIndexSerial = row.indexOf('Serial #');
            colIndexTime = row.findIndex((c: any) => String(c).trim() === 'Time');
            colIndexGuys = row.indexOf('Guys');
            continue;
        }

        // 3. Process Data Row
        if (currentStation !== null && row[1]) {
            if (colIndexSerial !== -1 && row[colIndexSerial]) {
                const travelerId = String(row[colIndexSerial]);
                const taskName = String(row[1]);
                const timeVal = row[colIndexTime];
                const guysVal = row[colIndexGuys];

                const duration = typeof timeVal === 'string' ? parseDurationString(timeVal) : (Number(timeVal) || 0);
                const workers = Number(guysVal) || 1;

                // Lookup Department & Skills
                let dept = 'Unknown';
                let requiredSkills: string[] = [];

                const stTemplate = templateMap[currentStation];
                if (stTemplate) {
                    dept = stTemplate.department; // default to station dept

                    // 1. Try exact/key match on Name
                    const key = taskName.trim().toLowerCase();
                    const tInfo = stTemplate.tasks.get(key);

                    if (tInfo) {
                        requiredSkills = tInfo.requiredSkills;
                    } else {
                        // 2. Try searching in Description
                        const cleanTaskName = taskName.trim().toLowerCase();
                        if (cleanTaskName.length > 3) { // Avoid matching short common words if any
                            const match = stTemplate.templates.find(t =>
                                t.description.toLowerCase().includes(cleanTaskName)
                            );
                            if (match) {
                                requiredSkills = match.requiredSkills;
                            }
                        }
                    }
                }

                tasks.push({
                    id: `t_${tasks.length + 1}`,
                    station: `Station ${currentStation}`,
                    department: dept,
                    taskName: taskName,
                    travelerId: travelerId,
                    durationHours: duration,
                    minWorkers: workers,
                    maxWorkers: workers,
                    requiredSkills
                });
            }
        }
    }

    return tasks;
}

export function loadSkilledWorkers(buffer: Buffer, templateMap: StationTemplateMap): MatchableWorker[] {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets['Cross Functional Skills'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    if (data.length < 5) return [];

    // Row 2 (index 2) contains Skill Codes: [..., 'A', 'B', 'C'...]
    const codeRow = data[2];
    // Row 3 (index 3) contains Headers: [..., 'Employee ', ...]
    const headerRow = data[3];

    // Find Employee Name index
    const empIdx = headerRow.findIndex((h: any) => String(h).trim().toLowerCase().includes('employee'));
    const homeStationIdx = headerRow.findIndex((h: any) => String(h).trim().toLowerCase().includes('home station'));

    if (empIdx === -1) return [];

    // Map column index to Skill Code
    const skillMap = new Map<number, string>();
    for (let i = 0; i < codeRow.length; i++) {
        const val = String(codeRow[i] || '').trim();
        // Skill codes are usually single letters A-M (maybe V)
        // Check if length 1 and is letter? Or just use non-empty.
        // Row 2 had 'Labor Type', then empty, then 'A'.
        // Valid Set from logic: A, B, C, V, D, E, F, G, H, I, J, K, L, M
        if (val.length === 1 && /[A-Z]/.test(val)) {
            skillMap.set(i, val);
        }
    }

    const workers: MatchableWorker[] = [];

    // Data starts at Row 4 (index 4)
    for (let i = 4; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[empIdx]) continue;

        const name = String(row[empIdx]).trim();
        let dept = 'Unknown';

        if (homeStationIdx !== -1) {
            const stVal = row[homeStationIdx];
            const stNum = parseInt(stVal);
            if (!isNaN(stNum) && templateMap[stNum]) {
                dept = templateMap[stNum].department;
            }
        }

        const skills: Record<string, number> = {};
        skillMap.forEach((code, idx) => {
            const val = row[idx];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                // Check if number
                const num = parseInt(val);
                if (!isNaN(num)) {
                    skills[code] = num;
                } else if (String(val).trim().toUpperCase() === 'X') {
                    // X means yes, but rank unknown. Assign default rank 3 (competent)?
                    skills[code] = 3;
                }
            }
        });

        workers.push({
            workerId: `w_${workers.length + 1}`,
            name,
            departmentId: dept,
            skills
        });
    }

    return workers;
}
