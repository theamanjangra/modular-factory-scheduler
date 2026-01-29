/**
 * Station Data Loader
 *
 * Parses station and traveler data from the Vederra Labor Optimization Master Excel file.
 * The "Time Study List" sheet has a block structure where stations group tasks,
 * and each task row contains traveler/box IDs.
 *
 * Used by the Cross-Department Planning feature to create the iOS-style
 * station-based Gantt visualization.
 */

import * as XLSX from 'xlsx';

// Station to Department mapping (from Vederra Data Loading Developer.xlsx - Task Template Data)
// Note: Some stations belong to multiple departments (overlapping)
export const STATION_DEPARTMENT_MAP: Record<number, string[]> = {
    1: ['Structure'],
    2: ['MEP'],
    3: ['Structure'],
    4: ['Structure'],
    5: ['Structure'],  // Assumed based on pattern
    6: ['MEP'],
    7: ['Building Envelope'],
    8: ['MEP'],
    9: ['Building Envelope'],
    10: ['MEP', 'Building Envelope'],
    11: ['Building Envelope'],
    12: ['Building Envelope'],
    13: ['Building Envelope', 'Interior/Exterior'],
    14: ['Interior/Exterior', 'MEP Finish'],
    15: ['Interior/Exterior'],
    16: ['Interior/Exterior'],
    17: ['Interior/Exterior'],
    18: ['Interior/Exterior', 'MEP Finish'],
    19: ['Interior/Exterior', 'Final Close-Out'],
    20: ['MEP Finish', 'Final Close-Out'],
    21: ['Final Close-Out'],
};

// Department colors for visualization
export const DEPARTMENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    'Structure': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    'MEP': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
    'Building Envelope': { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
    'Interior/Exterior': { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
    'MEP Finish': { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
    'Final Close-Out': { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
};

export interface StationTask {
    stationNumber: number;
    taskName: string;
    duration: number;        // Hours from "Time " column
    workerCount: number;     // From "Guys" column
    travelerId: string;      // From "Serial #" column (box/module ID)
    departments: string[];   // Derived from STATION_DEPARTMENT_MAP
}

export interface TravelerInfo {
    travelerId: string;
    stationNumber: number;
    tasks: StationTask[];
}

export interface StationInfo {
    stationNumber: number;
    departments: string[];
    travelers: string[];     // Unique traveler IDs at this station
    tasks: StationTask[];
    totalHours: number;
}

export interface ParsedStationData {
    stations: Map<number, StationInfo>;
    travelers: Map<string, TravelerInfo>;
    allDepartments: string[];
    summary: {
        totalStations: number;
        totalTravelers: number;
        totalTasks: number;
        totalHours: number;
    };
}

/**
 * Parse station and traveler data from the Time Study List sheet
 */
export function parseStationData(buffer: Buffer): ParsedStationData {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Try to find the Time Study List sheet
    const sheetName = workbook.SheetNames.find(name =>
        name.toLowerCase().includes('time study') ||
        name.toLowerCase().includes('timestudy')
    ) || 'Time Study List';

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        console.warn(`[StationDataLoader] Sheet "${sheetName}" not found, returning empty data`);
        return createEmptyResult();
    }

    // Parse as array of arrays to handle block structure
    const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const stations = new Map<number, StationInfo>();
    const travelers = new Map<string, TravelerInfo>();
    const allDepartments = new Set<string>();

    let currentStation = 0;
    let totalTasks = 0;
    let totalHours = 0;

    // Find header row (Row 2 based on user info, index 1)
    // Headers: TASK 1, Time , Guys, Serial #
    let headerRowIndex = -1;
    let taskColIndex = -1;
    let timeColIndex = -1;
    let guysColIndex = -1;
    let serialColIndex = -1;

    for (let i = 0; i < Math.min(10, aoa.length); i++) {
        const row = aoa[i];
        if (!row) continue;

        for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toLowerCase().trim();
            if (cell === 'task 1' || cell === 'task') taskColIndex = j;
            if (cell === 'time' || cell === 'time ') timeColIndex = j;
            if (cell === 'guys' || cell === 'workers') guysColIndex = j;
            if (cell === 'serial #' || cell === 'serial' || cell === 'serialnumber') serialColIndex = j;
        }

        if (taskColIndex >= 0 && timeColIndex >= 0) {
            headerRowIndex = i;
            break;
        }
    }

    // Default column indices if not found (based on user info: Serial # is column 8)
    if (taskColIndex < 0) taskColIndex = 0;
    if (timeColIndex < 0) timeColIndex = 1;
    if (guysColIndex < 0) guysColIndex = 2;
    if (serialColIndex < 0) serialColIndex = 8;

    console.log(`[StationDataLoader] Header row: ${headerRowIndex}, Columns: task=${taskColIndex}, time=${timeColIndex}, guys=${guysColIndex}, serial=${serialColIndex}`);

    // Parse data rows
    for (let i = (headerRowIndex >= 0 ? headerRowIndex + 1 : 2); i < aoa.length; i++) {
        const row = aoa[i];
        if (!row || row.length === 0) continue;

        // Check if this is a station header row (e.g., "Station 1", "STATION 2")
        const firstCell = String(row[0] || '').trim();
        const stationMatch = firstCell.match(/station\s*(\d+)/i);
        if (stationMatch) {
            currentStation = parseInt(stationMatch[1], 10);

            // Initialize station if not exists
            if (!stations.has(currentStation)) {
                const depts = STATION_DEPARTMENT_MAP[currentStation] || ['Unknown'];
                depts.forEach(d => allDepartments.add(d));

                stations.set(currentStation, {
                    stationNumber: currentStation,
                    departments: depts,
                    travelers: [],
                    tasks: [],
                    totalHours: 0
                });
            }
            continue;
        }

        // Skip if no current station
        if (currentStation === 0) continue;

        // Parse task row
        const taskName = String(row[taskColIndex] || '').trim();
        if (!taskName) continue;

        const duration = parseFloat(row[timeColIndex]) || 0;
        const workerCount = parseInt(row[guysColIndex], 10) || 1;
        const travelerId = String(row[serialColIndex] || '').trim() || `traveler_${currentStation}_${i}`;

        const task: StationTask = {
            stationNumber: currentStation,
            taskName,
            duration,
            workerCount,
            travelerId,
            departments: STATION_DEPARTMENT_MAP[currentStation] || ['Unknown']
        };

        // Add to station
        const station = stations.get(currentStation)!;
        station.tasks.push(task);
        station.totalHours += duration;
        if (!station.travelers.includes(travelerId)) {
            station.travelers.push(travelerId);
        }

        // Add to traveler map
        if (!travelers.has(travelerId)) {
            travelers.set(travelerId, {
                travelerId,
                stationNumber: currentStation,
                tasks: []
            });
        }
        travelers.get(travelerId)!.tasks.push(task);

        totalTasks++;
        totalHours += duration;
    }

    console.log(`[StationDataLoader] Parsed ${stations.size} stations, ${travelers.size} travelers, ${totalTasks} tasks`);

    return {
        stations,
        travelers,
        allDepartments: Array.from(allDepartments),
        summary: {
            totalStations: stations.size,
            totalTravelers: travelers.size,
            totalTasks,
            totalHours
        }
    };
}

/**
 * Get primary department for a station (first in the list)
 */
export function getPrimaryDepartment(stationNumber: number): string {
    const depts = STATION_DEPARTMENT_MAP[stationNumber];
    return depts?.[0] || 'Unknown';
}

/**
 * Get department color scheme
 */
export function getDepartmentColor(department: string): { bg: string; border: string; text: string } {
    return DEPARTMENT_COLORS[department] || { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' };
}

/**
 * Create empty result for error cases
 */
function createEmptyResult(): ParsedStationData {
    return {
        stations: new Map(),
        travelers: new Map(),
        allDepartments: [],
        summary: {
            totalStations: 0,
            totalTravelers: 0,
            totalTasks: 0,
            totalHours: 0
        }
    };
}

/**
 * Group stations by department for the visualization
 */
export function groupStationsByDepartment(data: ParsedStationData): Map<string, StationInfo[]> {
    const grouped = new Map<string, StationInfo[]>();

    data.stations.forEach(station => {
        const primaryDept = station.departments[0] || 'Unknown';
        if (!grouped.has(primaryDept)) {
            grouped.set(primaryDept, []);
        }
        grouped.get(primaryDept)!.push(station);
    });

    // Sort stations within each department
    grouped.forEach(stations => {
        stations.sort((a, b) => a.stationNumber - b.stationNumber);
    });

    return grouped;
}
