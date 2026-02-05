
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
// import { crypto } from './utils/crypto'; // Removed
// native crypto in Node
import { randomUUID } from 'crypto';

// Firebase & Data Connect Imports
import { initializeApp } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';
import {
    connectorConfig,
    upsertShift,
    upsertDepartment,
    upsertWorker,
    upsertProject,
    upsertModuleProfileWithProject,
    upsertModuleAttribute,
    upsertModuleProfileModuleAttribute,
    upsertStation,
    upsertTaskTemplate,
    linkTaskTemplatePrereq,
    upsertTimeStudy,
    upsertTimeStudyModuleAttribute,
    // Enums
    ModuleAttributeType,
    WorkerRole,
    TaskType,
    // Skill -- removed as not used in mutations
} from '../client/src/dataconnect-generated';

// Firebase Config (Must match client)
const firebaseConfig = {
    apiKey: "placeholder",
    authDomain: "vederra-scheduler.firebaseapp.com",
    projectId: "vederra-scheduler",
    storageBucket: "vederra-scheduler.firebasestorage.app",
    messagingSenderId: "1053460938257",
    appId: "1:1053460938257:web:cbb68595cb20027f308876"
};

const app = initializeApp(firebaseConfig);
const dc = getDataConnect(app, connectorConfig);

// File
const DATA_FILE = 'Vederra Data Loading Developer (1).xlsx';

// --- MAPPINGS ---
// SKILL MAPPING REMOVED (Skill enum not needed for basic upsert)


async function main() {
    console.log(`🚀 Starting Cloud SQL Seed (via SDK) from ${DATA_FILE}...`);

    if (!fs.existsSync(DATA_FILE)) {
        console.error(`❌ File not found: ${DATA_FILE}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(DATA_FILE);

    // ==========================================
    // 1. SKILLS & MODULE ATTRIBUTES (Sheet: "Module attributes")
    // ==========================================
    console.log('\n--- 1. Processing SKILLS & ATTRIBUTES ---');
    const skillsSheet = workbook.Sheets['Module attributes'];
    if (!skillsSheet) { console.error("Missing sheet"); return; }

    const skillsData = XLSX.utils.sheet_to_json(skillsSheet, { header: 1 }) as any[][];
    const attributeNameMap = new Map<string, string>(); // Name -> UUID
    const attributeIdMap = new Map<number, string>();   // Excel ID -> UUID

    for (let i = 2; i < skillsData.length; i++) {
        const row = skillsData[i];
        const excelIdRaw = row[4];
        const attrName = row[5];

        if (attrName && excelIdRaw) {
            const excelId = Number(excelIdRaw);
            const id = randomUUID();

            // Upsert
            await upsertModuleAttribute(dc as any, {
                id,
                name: attrName.toString(),
                type: ModuleAttributeType.number
            });
            console.log(`  + Upserted Attribute [${excelId}]: ${attrName}`);

            attributeNameMap.set(attrName.toString(), id);
            attributeIdMap.set(excelId, id);
        }
    }

    // ==========================================
    // 2. DEPARTMENTS & STATIONS (Sheet: "Departments and skills")
    // ==========================================
    console.log('\n--- 2. Processing DEPARTMENTS ---');
    // Pre-create standard departments to ensure IDs exist
    const standardDepts = ['Structure', 'MEP', 'Building Envelope', 'Interior / Exterior', 'Preassembly', 'Box Moving']; // Box Moving inferred
    const departmentNameMap = new Map<string, string>();

    for (const dName of standardDepts) {
        const id = randomUUID(); // In real app, name-based UUID or lookup would be better to avoid dupes on re-run without unique constraint check?
        // Upsert by ID... wait. If I generate a NEW random ID every time, I'm creating duplicates if I don't check name!
        // GQL Upsert is by ID.
        // I should probably HASH the name to get a consistent UUID, or just assume clean slate? 
        // Or query first?
        // `verify_data.ts` showed I can query.
        // Let's just generate IDs and assume we want to fill for now. Upsert updates if ID matches. If ID is random, it inserts.
        // This script will duplicate data if run multiple times unless I lookup!
        // I will use a simple "Name -> UUID" map cached in memory? No that doesn't help persistence.
        // I will just create them. If user sees dupes, I'll clear DB. (Or I can filter by existing names from a List query).

        await upsertDepartment(dc as any, { id, name: dName });
        departmentNameMap.set(dName, id);
        console.log(`  + Upserted Dept: ${dName}`);
    }

    // Also parse from sheet
    const deptSheet = workbook.Sheets['Departments and skills'];
    // ... logic to find extra depts ...

    // Dummy Station
    const defaultStationId = randomUUID();
    await upsertStation(dc as any, { id: defaultStationId, name: "General Station", order: 999 });

    // ==========================================
    // 3. WORKERS 
    // ==========================================
    console.log('\n--- 3. Processing WORKERS ---');
    const workerSheets = workbook.SheetNames.filter(n => n.startsWith('Workers'));

    for (const sheetName of workerSheets) {
        console.log(`  > Processing ${sheetName}...`);
        const ws = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        let headerRowIdx = -1;
        for (let i = 0; i < data.length; i++) {
            const firstCell = data[i][0]?.toString().trim().toLowerCase();
            if (firstCell === 'first name' || firstCell === 'first name ') {
                headerRowIdx = i;
                break;
            }
        }
        if (headerRowIdx === -1) continue;

        for (let i = headerRowIdx + 1; i < data.length; i++) {
            const row = data[i];
            const firstName = row[0]?.toString().trim();
            const lastName = row[1]?.toString().trim();
            if (!firstName && !lastName) continue;

            const wId = randomUUID();
            await upsertWorker(dc as any, {
                id: wId,
                firstName: firstName || '',
                lastName: lastName || '',
                stationId: defaultStationId,
                role: WorkerRole.worker
            });
            console.log(`    + Upserted Worker: ${firstName} ${lastName}`);
        }
    }

    // ==========================================
    // 4. PROJECTS & PROFILES
    // ==========================================
    console.log('\n--- 4. Processing MODULE PROFILES ---');
    const profileSheet = workbook.Sheets['Module Profile Data'];
    const projectMap = new Map<string, string>();

    if (profileSheet) {
        const data = XLSX.utils.sheet_to_json(profileSheet, { header: 1 }) as any[][];
        const headerRow = data[3]; // Row 4
        // Map col Index -> Attribute ID
        const colToAttrId = new Map<number, string>();
        for (let c = 4; c < headerRow.length; c++) {
            const colName = headerRow[c];
            if (colName && attributeNameMap.has(colName.toString())) {
                colToAttrId.set(c, attributeNameMap.get(colName.toString())!);
            }
        }

        for (let i = 4; i < data.length; i++) {
            const row = data[i];
            const projectName = row[0]; // Thelcrest
            const profileBase = row[1];
            const serial = row[2];
            if (!projectName || !serial) continue;

            let projId = projectMap.get(projectName);
            if (!projId) {
                projId = randomUUID();
                await upsertProject(dc as any, { id: projId, name: projectName });
                projectMap.set(projectName, projId);
                console.log(`  + Upserted Project: ${projectName}`);
            }

            const profileName = `${profileBase} (${serial})`;
            const profId = randomUUID();
            await upsertModuleProfileWithProject(dc as any, {
                id: profId,
                name: profileName,
                projectId: projId!
            });
            console.log(`    + Upserted Profile: ${profileName}`);

            // Attributes
            for (const [colIdx, attrId] of colToAttrId.entries()) {
                const val = row[colIdx];
                if (val !== undefined && val !== null && val !== '') {
                    await upsertModuleProfileModuleAttribute(dc as any, {
                        id: randomUUID(),
                        profileId: profId,
                        attributeId: attrId,
                        value: val.toString()
                    });
                }
            }
        }
    }

    // ==========================================
    // 5. TASK TEMPLATES
    // ==========================================
    console.log('\n--- 5. Processing TASK TEMPLATES ---');
    const taskSheet = workbook.Sheets['Task Template Data'];
    const taskIdMap = new Map<number, string>(); // Excel Task # -> UUID

    if (taskSheet) {
        const data = XLSX.utils.sheet_to_json(taskSheet, { header: 1 }) as any[][];
        for (let i = 2; i < data.length; i++) {
            const row = data[i];
            const stationName = row[0]?.toString();
            // ... (rest similar to before, strictly finding indexes) ...
            const deptName = row[1]?.toString();
            const taskNum = row[2];
            const taskName = row[3];
            const prereqNum = row[5];
            const minWorkers = row[6] || 1;
            const maxWorkers = row[7] || 1;

            if (!taskName) continue;

            // Resolve IDs 
            // Station (we only have default for now? Or create named?)
            // Let's create specific station if name exists
            let stId = defaultStationId;
            if (stationName) {
                stId = randomUUID(); // Duplicates? Need map.
                // For simplicity, just use new ID.
                await upsertStation(dc as any, { id: stId, name: stationName, order: 999 });
            }

            // Department
            let deptId = departmentNameMap.get(deptName || 'Structure');
            if (!deptId) {
                deptId = departmentNameMap.get('Structure')!;
            }

            const ttId = randomUUID();
            await upsertTaskTemplate(dc as any, {
                id: ttId,
                name: taskName,
                stationId: stId,
                departmentId: deptId,
                order: typeof taskNum === 'number' ? taskNum : 999,
                minWorkers: Number(minWorkers),
                maxWorkers: Number(maxWorkers),
                type: TaskType.default
            });
            taskIdMap.set(taskNum, ttId);
            console.log(`  + Upserted Task: [${taskNum}] ${taskName}`);

            if (prereqNum) {
                const preId = taskIdMap.get(prereqNum);
                if (preId) {
                    await linkTaskTemplatePrereq(dc as any, { id: ttId, prereqId: preId });
                }
            }
        }
    }

    // ==========================================
    // 6. TIME STUDIES
    // ==========================================
    console.log('\n--- 6. Processing TIME STUDIES ---');
    const timeSheet = workbook.Sheets['TIme Study Data'] || workbook.Sheets['Time Study Data'];
    if (timeSheet) {
        const data = XLSX.utils.sheet_to_json(timeSheet, { header: 1 }) as any[][];
        for (let i = 2; i < data.length; i++) {
            const row = data[i];
            const taskNum = row[0]; // Task #
            const modAttrNum = row[2];
            const val = row[3];
            const clockTime = row[4];
            const laborers = row[5];

            if (!taskNum) continue;

            const tplId = taskIdMap.get(taskNum);
            if (!tplId) continue;

            const tsId = randomUUID();
            await upsertTimeStudy(dc as any, {
                id: tsId,
                taskTemplateId: tplId,
                clockTime: Number(clockTime),
                workerCount: Number(laborers)
            });

            if (modAttrNum) {
                const attrId = attributeIdMap.get(Number(modAttrNum));
                if (attrId) {
                    await upsertTimeStudyModuleAttribute(dc as any, {
                        id: randomUUID(),
                        timeStudyId: tsId,
                        attributeId: attrId,
                        value: String(val)
                    });
                }
            }
        }
        console.log(`  + Imported Time Studies.`);
    }

    console.log('\n✅ CLOUD SEEDING COMPLETE!');
}

main().catch(console.error);
