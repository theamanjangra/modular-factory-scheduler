import * as fs from 'fs';
import * as path from 'path';

function slugify(s: string) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40);
}

function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = lines[0].split(',').map(h => h.trim());

    // Improved parser: Only treats " as specific if it's the FIRST char of the field
    const rows = lines.slice(1).map(line => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;

        let i = 0;
        // precise character loop
        while (i < line.length) {
            const ch = line[i];

            // Check if we are starting a quoted field
            // Must be at start of field (cur is empty) and not already in quotes
            if (cur.length === 0 && !inQuotes && ch === '"') {
                inQuotes = true;
                i++;
                continue;
            }

            // If we are in quotes, check for closing quote
            if (inQuotes && ch === '"') {
                // Check if it's an escaped quote ("")
                if (i + 1 < line.length && line[i + 1] === '"') {
                    cur += '"';
                    i += 2; // skip both
                    continue;
                } else {
                    // It is a closing quote
                    inQuotes = false;
                    i++;
                    continue;
                }
            }

            // If comma, check if it's a delimiter or content
            if (ch === ',') {
                if (inQuotes) {
                    cur += ch;
                } else {
                    // Field done
                    result.push(cur);
                    cur = '';
                }
                i++;
                continue;
            }

            // Normal char
            cur += ch;
            i++;
        }
        // Push last field
        result.push(cur);

        return result.map(r => r.trim());
    });

    return rows.map(cols => {
        const obj: any = {};
        for (let i = 0; i < header.length; i++) {
            obj[header[i]] = cols[i] ?? '';
        }
        return obj;
    });
}

function toTasks(records: any[]) {
    // 1. First Pass: Assign IDs and build Lookup Map
    const tempTasks = records.map((r, index) => {
        const name = r['TaskName'] || r['Task'] || r['TaskName'];
        // Generate ID: T-1, T-2, ...
        const id = `T-${index + 1}`;

        return {
            taskId: id,
            name: name,
            estimatedRemainingLaborHours: r['LaborHoursRemaining'] ? Number(r['LaborHoursRemaining']) : undefined,
            minWorkers: r['MinWorkers'] ? Number(r['MinWorkers']) : undefined,
            maxWorkers: r['MaxWorkers'] ? Number(r['MaxWorkers']) : undefined,
            prerequisiteRaw: r['PrerequisiteTask'] // Temporary storage
        };
    });

    // Build name->id map (case-insensitive for robustness)
    const nameMap = new Map<string, string>();
    tempTasks.forEach(t => {
        if (t.name) nameMap.set(t.name.trim().toLowerCase(), t.taskId);
    });

    // 2. Second Pass: Resolve Dependencies
    return tempTasks.map(t => {
        let prereqId: string | null = null;

        if (t.prerequisiteRaw && t.prerequisiteRaw.trim().length > 0) {
            const rawName = t.prerequisiteRaw.trim();
            // Try to find ID
            const foundId = nameMap.get(rawName.toLowerCase());
            if (foundId) {
                prereqId = foundId;
            } else {
                console.warn(`Warning: Could not resolve prerequisite '${rawName}' for task '${t.name}' (${t.taskId})`);
            }
        }

        return {
            taskId: t.taskId,
            name: t.name,
            estimatedRemainingLaborHours: t.estimatedRemainingLaborHours,
            minWorkers: t.minWorkers,
            maxWorkers: t.maxWorkers,
            prerequisiteTaskId: prereqId // Singular field as requested
        };
    });
}

// CLI
const cwd = process.cwd();
const csvPath = process.argv[2] || path.join(cwd, 'scripts', 'sample_tasks.csv');
const outPath = process.argv[3] || path.join(cwd, 'scripts', 'sample_tasks.json');

if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(2);
}

const csvText = fs.readFileSync(csvPath, 'utf8');
const records = parseCsv(csvText);
const tasks = toTasks(records);
fs.writeFileSync(outPath, JSON.stringify(tasks, null, 2), 'utf8');
console.log('Wrote', outPath);
console.log(JSON.stringify(tasks.slice(0, 5), null, 2)); // Log first 5 for verification
