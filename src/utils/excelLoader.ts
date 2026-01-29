
import * as XLSX from 'xlsx';
import { Worker, Task } from '../types';

export interface ParsedData {
    workers: Worker[];
    tasks: Task[];
}

export function parseExcelData(buffer: Buffer): ParsedData {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Parse Workers
    const workersSheet = workbook.Sheets['Workers'];
    const workers: Worker[] = [];
    if (workersSheet) {
        // Dynamic Header Finding
        const range = XLSX.utils.decode_range(workersSheet['!ref'] || "A1:Z100");
        const aoa = XLSX.utils.sheet_to_json(workersSheet, { header: 1, range: 0 }) as any[][];

        let headerRowIndex = -1;
        for (let i = 0; i < aoa.length; i++) {
            if (aoa[i] && aoa[i].includes('Name')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex > -1) {
            const rows: any[] = XLSX.utils.sheet_to_json(workersSheet, { range: headerRowIndex });

            rows.forEach((row, index) => {
                const name = row['Name'];
                if (!name) return;

                const preferences: Record<string, number> = {};
                const shiftPreferenceRaw = row['ShiftPreference'] || row['Shift Preference'] || row['Shift'] || '';
                const shiftPreference = typeof shiftPreferenceRaw === 'string'
                    ? shiftPreferenceRaw.trim()
                    : (shiftPreferenceRaw || '').toString().trim();

                Object.keys(row).forEach(key => {
                    if (key !== 'Name' && key !== 'RankedSkills' && key !== 'Skills') {
                        const val = parseInt(row[key]);
                        if (!isNaN(val)) {
                            preferences[key] = val;
                        }
                    }
                });

                workers.push({
                    workerId: `w_${index + 1}`,
                    name: name,
                    shiftPreference: shiftPreference || undefined,
                    preferences: preferences
                });
            });
        }
    }

    // Parse Tasks
    const tasksSheet = workbook.Sheets['Tasks'];
    const tasks: Task[] = [];
    if (tasksSheet) {
        const aoa = XLSX.utils.sheet_to_json(tasksSheet, { header: 1, range: 0 }) as any[][];
        let headerRowIndex = -1;
        for (let i = 0; i < aoa.length; i++) {
            if (aoa[i] && aoa[i].includes('TaskName')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex > -1) {
            const rows: any[] = XLSX.utils.sheet_to_json(tasksSheet, { range: headerRowIndex });

            rows.forEach((row, index) => {
                const nameRaw = row['TaskName'];
                if (!nameRaw) return;
                const name = String(nameRaw).trim();

                // Map ShiftPreference column (1/2/3 or text) to shiftCompletionPreference
                const shiftPrefRaw = row['ShiftPreference'] || row['Shift Preference'];
                let shiftCompletionPreference: 'mustCompleteWithinShift' | 'prefersCompleteWithinShift' | 'doesNotMatter' | undefined = undefined;
                if (shiftPrefRaw !== undefined && shiftPrefRaw !== null && `${shiftPrefRaw}`.trim() !== '') {
                    const prefNum = Number(shiftPrefRaw);
                    if (prefNum === 3) {
                        shiftCompletionPreference = 'mustCompleteWithinShift';
                    } else if (prefNum === 2) {
                        shiftCompletionPreference = 'prefersCompleteWithinShift';
                    } else if (prefNum === 1) {
                        shiftCompletionPreference = 'doesNotMatter';
                    }
                }

                const isNonWorkerRaw = row['Is non-worker task'];
                const isNonWorker = isNonWorkerRaw === 1 || isNonWorkerRaw === '1';
                const nonWorkerDurationRaw = Number(row['Non-worker duration']);
                const nonWorkerTaskDuration = !isNaN(nonWorkerDurationRaw) ? nonWorkerDurationRaw : undefined;

                let taskType: 'default' | 'subassembly' | 'nonWorker' | undefined;
                if (isNonWorker) {
                    taskType = 'nonWorker';
                }

                const minWorkersRaw = Number(row['MinWorkers']);
                const maxWorkersRaw = Number(row['MaxWorkers']);
                // Default to 1 only if NaN (missing/invalid), but allow 0
                const minWorkers = !isNaN(minWorkersRaw) ? minWorkersRaw : 1;
                const maxWorkers = !isNaN(maxWorkersRaw) ? maxWorkersRaw : 1;
                const laborHours = Number(row['LaborHoursRemaining']) || 0;
                const totalHours = isNonWorker && nonWorkerTaskDuration !== undefined
                    ? nonWorkerTaskDuration
                    : laborHours;
                tasks.push({
                    taskId: `t_${index + 1}`,
                    name: name,
                    estimatedTotalLaborHours: totalHours,
                    estimatedRemainingLaborHours: totalHours,
                    minWorkers: minWorkers,
                    maxWorkers: maxWorkers,
                    prerequisiteTaskIds: [],
                    shiftCompletionPreference,
                    taskType: taskType,
                    nonWorkerTaskDuration: isNonWorker ? nonWorkerTaskDuration : undefined
                });
            });

            // Second pass for prerequisites
            const taskNameMap = new Map(tasks.map(t => [t.name, t.taskId]));
            rows.forEach((row, index) => {
                if (row['PrerequisiteTask']) {
                    const prereqName = String(row['PrerequisiteTask']).trim();
                    const prereqId = taskNameMap.get(prereqName);
                    if (prereqId && tasks[index]) {
                        tasks[index].prerequisiteTaskIds = [prereqId];
                    }
                }
            });
        }
    }

    return { workers, tasks };
}
