
import { PrismaClient, Skill, ModuleAttributeType, TaskType, WorkerRole } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DATA_FILE = 'Vederra Data Loading Developer (1).xlsx';

// --- MAPPINGS ---
// Map Excel Skill Code (A, B...) to Prisma Enum `Skill`
// Note: We need to be careful to match the schema enums exactly.
// Schema Enums: 
// framing, finishCarpentry, electricalTrim, electricalRough, plumbing, 
// drywallHanging, drywallMud, texture, painting, roofing, flooring, 
// boxMoving, cutting, hvac
const SKILL_MAPPING: Record<string, Skill> = {
    'A': Skill.framing,
    'B': Skill.electricalRough, // "Electrical Rough"
    'C': Skill.plumbing,        // "Plumbing Rough" -> map to plumbing? Or do we need generic logic?
    'D': Skill.hvac,
    'E': Skill.drywallHanging,
    'F': Skill.drywallMud,
    'G': Skill.texture,
    'H': Skill.finishCarpentry,
    'I': Skill.painting,
    'J': Skill.electricalTrim,
    'K': Skill.plumbing, // "Plumbing Trim" -> map to plumbing?
    'L': Skill.roofing,
    'M': Skill.flooring,
    'N': Skill.boxMoving,
    'O': Skill.cutting, // "Pre assembly" -> cutting? Or generic? schema has "cutting". Excel says "Pre assembly". 
    'P': Skill.boxMoving // "General Labor" -> ?? schema doesn't have generalLabor. Only boxMoving/cutting.
};
// Note: Some mapping might be imperfect. I'll do my best. 
// "Pre assembly" might strictly be "cutting" in the schema? 
// "General Labor" -> maybe no specific skill or "boxMoving"? 

// Map Excel Attribute Names to Types
const ATTRIBUTE_TYPES: Record<string, ModuleAttributeType> = {
    'default': ModuleAttributeType.number
};

async function main() {
    console.log(`🚀 Starting Seed from ${DATA_FILE}...`);

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
    if (!skillsSheet) {
        console.error("❌ 'Module attributes' sheet not found!");
        return;
    }
    const skillsData = XLSX.utils.sheet_to_json(skillsSheet, { header: 1 }) as any[][];

    // Data starts at Row 3 (index 2)
    const attributeNameMap = new Map<string, string>();
    const attributeIdMap = new Map<number, string>(); // ID from Excel (1, 2...) -> DB ID

    for (let i = 2; i < skillsData.length; i++) {
        const row = skillsData[i];

        // Col E (index 4) = ID # (1, 2, 3...)
        // Col F (index 5) = Attribute Name

        const excelIdRaw = row[4];
        const attrName = row[5];

        if (attrName && excelIdRaw) {
            const excelId = Number(excelIdRaw);

            const existing = await prisma.moduleAttribute.findFirst({ where: { name: attrName.toString() } });
            let dbAttr;
            if (existing) {
                dbAttr = existing;
            } else {
                dbAttr = await prisma.moduleAttribute.create({
                    data: {
                        name: attrName.toString(),
                        moduleAttributeType: ModuleAttributeType.number
                    }
                });
                console.log(`  + Created Attribute [${excelId}]: ${attrName}`);
            }
            attributeNameMap.set(attrName.toString(), dbAttr.id);
            attributeIdMap.set(excelId, dbAttr.id);
        }
    }

    // ==========================================
    // 2. DEPARTMENTS (Sheet: "Departments and skills")
    // ==========================================
    console.log('\n--- 2. Processing DEPARTMENTS ---');
    const deptSheet = workbook.Sheets['Departments and skills'];
    const deptData = XLSX.utils.sheet_to_json(deptSheet, { header: 1 }) as any[][];

    const departmentNameMap = new Map<string, string>();

    // Finds "DEPARTMENTS" header in Col P (index 15)?
    // Dump shows "DEPARTMENTS" at row 1, col 15. Data starts row 2.
    // Actually it's simpler to just hardcode distinct values from "Task Template Data" or just look at Col P.

    // Let's look at Col P in deptData
    for (let i = 2; i < deptData.length; i++) {
        const deptName = deptData[i][15]; // Col P
        if (deptName && typeof deptName === 'string') {
            const existing = await prisma.department.findFirst({ where: { name: deptName } });
            let dbDept;
            if (existing) {
                dbDept = existing;
            } else {
                dbDept = await prisma.department.create({ data: { name: deptName } });
                console.log(`  + Created Department: ${deptName}`);
            }
            departmentNameMap.set(deptName, dbDept.id);
        }
    }

    // Ensure standard departments exist if missing from that list
    const standardDepts = ['Structure', 'MEP', 'Building Envelope', 'Interior / Exterior', 'Preassembly'];
    for (const d of standardDepts) {
        if (!departmentNameMap.has(d)) {
            const existing = await prisma.department.findFirst({ where: { name: d } });
            if (existing) {
                departmentNameMap.set(d, existing.id);
            } else {
                const newD = await prisma.department.create({ data: { name: d } });
                departmentNameMap.set(d, newD.id);
                console.log(`  + Created Missing Department: ${d}`);
            }
        }
    }

    // ==========================================
    // 3. WORKERS (All "Workers - *" Sheets)
    // ==========================================
    console.log('\n--- 3. Processing WORKERS ---');
    // We need a dummy Station to assign workers to, as Station is required.
    let defaultStation = await prisma.station.findFirst({ where: { name: 'General Station' } });
    if (!defaultStation) {
        defaultStation = await prisma.station.create({ data: { name: 'General Station', order: 999 } });
    }

    const workerSheets = workbook.SheetNames.filter(n => n.startsWith('Workers'));
    for (const sheetName of workerSheets) {
        console.log(`  > Processing ${sheetName}...`);
        const ws = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        // Find header row index (Robust check)
        let headerRowIdx = -1;
        for (let i = 0; i < data.length; i++) {
            const firstCell = data[i][0]?.toString().trim().toLowerCase();
            if (firstCell === 'first name') {
                headerRowIdx = i;
                break;
            }
        }
        if (headerRowIdx === -1) {
            console.log(`    ⚠️ Could not find 'First name' header in ${sheetName}`);
            continue;
        }

        // Process workers
        for (let i = headerRowIdx + 1; i < data.length; i++) {
            const row = data[i];
            const firstName = row[0]?.toString().trim();
            const lastName = row[1]?.toString().trim();
            if (!firstName && !lastName) continue;

            // Simple dedup by name
            const existing = await prisma.worker.findFirst({
                where: { firstName: firstName, lastName: lastName }
            });

            if (!existing) {
                await prisma.worker.create({
                    data: {
                        firstName: firstName || '',
                        lastName: lastName || '',
                        stationId: defaultStation.id,
                        role: WorkerRole.worker, // Default
                        rankedSkills: [] // TODO: Parse skills if critical
                    }
                });
                console.log(`    + Added Worker: ${firstName} ${lastName}`);
            }
        }
    }

    // ==========================================
    // 4. PROJECTS & MODULE PROFILES (Sheet: "Module Profile Data")
    // ==========================================
    console.log('\n--- 4. Processing MODULE PROFILES ---');
    const profileSheet = workbook.Sheets['Module Profile Data'];
    if (profileSheet) {
        const data = XLSX.utils.sheet_to_json(profileSheet, { header: 1 }) as any[][];
        // Header Row 4 (index 3) - Project, Profile, Serial Number...
        // Attributes start at Col E (index 4)

        // Identify Attribute Columns
        const headerRow = data[3]; // Row 4
        // Map col Index -> Attribute ID
        const colToAttrId = new Map<number, string>();

        // Start checking from Col E (4)
        for (let c = 4; c < headerRow.length; c++) {
            const colName = headerRow[c];
            if (colName && attributeNameMap.has(colName.toString())) {
                colToAttrId.set(c, attributeNameMap.get(colName.toString())!);
            }
        }

        for (let i = 4; i < data.length; i++) {
            const row = data[i];
            const projectName = row[0]; // Thelcrest
            const profileBase = row[1]; // Duplex ...
            const serial = row[2];      // 2601-01

            if (!projectName || !serial) continue;

            // 4a. Ensure Project
            let project = await prisma.project.findFirst({ where: { name: projectName } });
            if (!project) {
                project = await prisma.project.create({ data: { name: projectName } });
                console.log(`  + Created Project: ${projectName}`);
            }

            // 4b. Create ModuleProfile
            const profileName = `${profileBase} (${serial})`;

            // Check if exists
            let modProfile = await prisma.moduleProfile.findFirst({ where: { name: profileName } });
            if (!modProfile) {
                modProfile = await prisma.moduleProfile.create({
                    data: {
                        name: profileName,
                        projectId: project.id
                    }
                });
                console.log(`    + Created Profile: ${profileName}`);

                // 4c. Link Attributes
                for (const [colIdx, attrId] of colToAttrId.entries()) {
                    const val = row[colIdx];
                    if (val !== undefined && val !== null && val !== '') {
                        await prisma.moduleProfileModuleAttribute.create({
                            data: {
                                moduleProfileId: modProfile.id,
                                moduleAttributeId: attrId,
                                value: val.toString()
                            }
                        });
                    }
                }
            }
        }
    }

    // ==========================================
    // 5. TASK TEMPLATES (Sheet: "Task Template Data")
    // ==========================================
    console.log('\n--- 5. Processing TASK TEMPLATES ---');
    const taskSheet = workbook.Sheets['Task Template Data'];
    const taskIdMap = new Map<number, string>(); // Excel Task # -> DB ID

    if (taskSheet) {
        const data = XLSX.utils.sheet_to_json(taskSheet, { header: 1 }) as any[][];
        // Header is Row 2 (index 1)
        // Data starts Row 3 (index 2)

        for (let i = 2; i < data.length; i++) {
            const row = data[i];
            const stationName = row[0]?.toString();
            const deptName = row[1]?.toString(); // Department ID
            const taskNum = row[2]; // Task #
            const taskName = row[3];
            const taskDesc = row[4];
            const prereqNum = row[5]; // Prerequisite task
            const minWorkers = row[6] || 1;
            const maxWorkers = row[7] || 1;
            const moduleAttrIdsRaw = row[8]; // Module attributes (comma sep?) "1" or "10"
            const rankedSkillsRaw = row[9]; // "A,H,P,O"

            if (!taskName) continue;

            // Resolve Station
            let station = await prisma.station.findFirst({ where: { name: stationName } });
            if (!station) {
                station = await prisma.station.create({
                    data: { name: stationName, order: parseInt(stationName) || 999 }
                });
            }

            // Resolve Department
            // The sheet uses names like "Structure", "MEP". Map to our DB IDs.
            let deptId = departmentNameMap.get(deptName);
            if (!deptId) {
                // Fallback or warning?
                // Try create?
                const d = await prisma.department.create({ data: { name: deptName } });
                deptId = d.id;
                departmentNameMap.set(deptName, deptId);
            }

            // Resolve Skills to Enum Array
            const rankedSkills: Skill[] = [];
            if (rankedSkillsRaw) {
                const codes = rankedSkillsRaw.toString().split(',').map((s: string) => s.trim());
                codes.forEach((c: string) => {
                    if (SKILL_MAPPING[c]) rankedSkills.push(SKILL_MAPPING[c]);
                });
            }

            // Create Task Template
            const taskTemplate = await prisma.taskTemplate.create({
                data: {
                    name: taskName,
                    description: taskDesc,
                    stationId: station.id,
                    departmentId: deptId,
                    taskType: TaskType.default,
                    order: typeof taskNum === 'number' ? taskNum : 999,
                    minWorkers: Number(minWorkers),
                    maxWorkers: Number(maxWorkers),
                    rankedSkills: rankedSkills
                }
            });
            console.log(`  + Created Task: [${taskNum}] ${taskName}`);
            taskIdMap.set(taskNum, taskTemplate.id);

            // TODO: Link Module Attributes (Drivers)
            // The sheet has "Module attributes" column (Col I / index 8). 
            // Values are like "1" or "10". This maps to attributeIdMap I created in step 1.
            if (moduleAttrIdsRaw) {
                const attrExcelIds = moduleAttrIdsRaw.toString().split(',').map((s: string) => s.trim());
                for (const aeId of attrExcelIds) {
                    const dbAttrId = attributeIdMap.get(parseInt(aeId));
                    if (dbAttrId) {
                        await prisma.taskTemplateModuleAttribute.create({
                            data: {
                                taskTemplateId: taskTemplate.id,
                                moduleAttributeId: dbAttrId
                            }
                        });
                    }
                }
            }

            // Handle Prerequisite Later? Or now if ordered?
            // Since we iterate in order, if prereq < current, it exists.
            if (prereqNum) {
                const preId = taskIdMap.get(prereqNum);
                if (preId) {
                    await prisma.taskTemplate.update({
                        where: { id: taskTemplate.id },
                        data: { prerequisiteTaskTemplateId: preId }
                    });
                }
            }
        }
    }

    // ==========================================
    // 6. TIME STUDIES (Sheet: "TIme Study Data")
    // ==========================================
    console.log('\n--- 6. Processing TIME STUDIES ---');
    // Note: Excel sheet has typo "TIme Study Data"
    const timeSheet = workbook.Sheets['TIme Study Data'] || workbook.Sheets['Time Study Data'];
    if (timeSheet) {
        const data = XLSX.utils.sheet_to_json(timeSheet, { header: 1 }) as any[][];
        // Header Row 2 (index 1)
        // Data Row 3 (index 2)

        for (let i = 2; i < data.length; i++) {
            const row = data[i];
            const taskNum = row[0]; // Task # is at Column A (index 0)
            const taskName = row[1];
            const modAttrNum = row[2]; // Module Attributes (ID from Sheet 1)
            const val = row[3]; // Value (e.g. 62.5) -- This corresponds to the attr value
            const clockTime = row[4]; // Clock Time
            const laborers = row[5]; // Laborers

            if (!taskNum) continue;

            const tplId = taskIdMap.get(taskNum);
            if (!tplId) {
                console.warn(`    ! TimeStudy skipped: Task #${taskNum} (${taskName}) not found.`);
                continue;
            }

            // Create TimeStudy
            const timeStudy = await prisma.timeStudy.create({
                data: {
                    taskTemplateId: tplId,
                    clockTime: Number(clockTime),
                    workerCount: Number(laborers),
                    // We can also store the "date" if needed, default now
                }
            });

            // Link to Attribute and Value
            // The row says "Module Attributes: 1" and "Value: 62.5"
            // This means for this TimeStudy, the driver (Length) was 62.5.
            if (modAttrNum) {
                const dbAttrId = attributeIdMap.get(Number(modAttrNum));
                if (dbAttrId) {
                    await prisma.timeStudyModuleAttribute.create({
                        data: {
                            timeStudyId: timeStudy.id,
                            moduleAttributeId: dbAttrId,
                            value: String(val)
                        }
                    });
                }
            }
        }
        console.log(`  + Imported Time Studies.`);
    }

    console.log('\n✅ SEEDING COMPLETE!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
