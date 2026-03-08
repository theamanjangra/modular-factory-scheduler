import * as admin from 'firebase-admin';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// NAMESPACE for UUID v5 (Randomly generated once)
const IMPORT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard ISO OID Namespace

/**
 * SKILL_NAMES Mapping from src/types/index.ts
 */
const SKILL_NAMES: Record<string, string> = {
    'A': 'framing',
    'B': 'finishCarpentry',
    'C': 'electricalTrim',
    'V': 'electricalRough',
    'D': 'plumbing',
    'E': 'drywallHanging',
    'F': 'drywallMud',
    'G': 'texture',
    'H': 'painting',
    'I': 'roofing',
    'J': 'flooring',
    'K': 'boxMoving',
    'L': 'cutting',
    'M': 'hvac'
};

// --- CONFIG ---
const prisma = new PrismaClient();
const serviceAccountPath = path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json');

// --- FIREBASE INIT ---
admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
});

const db = admin.firestore();

// Valid Prisma Enum Skills
const VALID_SKILLS = new Set([
    'framing', 'finishCarpentry', 'electricalTrim', 'electricalRough',
    'plumbing', 'drywallHanging', 'drywallMud', 'texture', 'painting',
    'roofing', 'flooring', 'boxMoving', 'cutting', 'hvac'
]);

// --- HELPERS ---
function mapSkillLetter(letter: string): string | null {
    const mapped = SKILL_NAMES[letter];
    if (mapped && VALID_SKILLS.has(mapped)) return mapped;
    // Fallback?
    if (VALID_SKILLS.has(letter)) return letter;
    return null; // Skip invalid
}

async function main() {
    console.log("🚀 Starting Import from Firebase (Read-Only)...");

    // 0. CLEANUP (Strict order for FKs)
    console.log("\n🧹 Cleaning up existing Local Data...");
    const safeDelete = async (table: any) => {
        try { await table.deleteMany({}); } catch (e) { /* ignore */ }
    };

    // Children first
    await safeDelete(prisma.issue);
    await safeDelete(prisma.taskInterruption);

    // Some tables might not exist in client yet if not regenerated, use try/catch
    try { await prisma.workerTaskAssignment.deleteMany({}); } catch (e) { }
    await safeDelete(prisma.workerTask);
    await safeDelete(prisma.task);

    await safeDelete(prisma.workerDepartment);
    await safeDelete(prisma.workerTaskTemplate);
    await safeDelete(prisma.timeLog);

    await safeDelete(prisma.travelerStation);
    await safeDelete(prisma.traveler);
    await safeDelete(prisma.module);
    await safeDelete(prisma.moduleProfile);
    await safeDelete(prisma.project);

    await safeDelete(prisma.worker);
    await safeDelete(prisma.taskTemplate);
    await safeDelete(prisma.department);

    console.log("✅ Cleanup Complete.");


    // 1. Ensure Shifts Exist Local (By Name to avoid dups)
    console.log("\n--- SHIFTS (Creating Defaults if missing) ---");
    let shift1 = await prisma.shift.findFirst({ where: { name: "Day Shift (07:00-15:00)" } });
    if (!shift1) {
        shift1 = await prisma.shift.create({
            data: {
                id: uuidv4(),
                name: "Day Shift (07:00-15:00)",
                startTime: new Date('1970-01-01T07:00:00Z'),
                endTime: new Date('1970-01-01T15:00:00Z'),
                weekdayOrdinals: [1, 2, 3, 4, 5]
            }
        });
    }

    let shift2 = await prisma.shift.findFirst({ where: { name: "Night Shift (15:00-23:00)" } });
    if (!shift2) {
        shift2 = await prisma.shift.create({
            data: {
                id: uuidv4(),
                name: "Night Shift (15:00-23:00)",
                startTime: new Date('1970-01-01T15:00:00Z'),
                endTime: new Date('1970-01-01T23:00:00Z'),
                weekdayOrdinals: [1, 2, 3, 4, 5]
            }
        });
    }
    console.log("✅ Shifts Ready:", shift1.name, shift2.name);


    // 2. Import Workers
    console.log("\n--- WORKERS (Importing from Firestore) ---");
    const workersSnap = await db.collection('workers').get();
    console.log(`Found ${workersSnap.size} workers in Firestore.`);
    let createdWorkers = 0;

    // Ensure departments exist first based on worker roles? Or just use default station/dept.
    // For now, let's create a "General" station if needed.
    let defaultStation = await prisma.station.findFirst({ where: { name: 'General' } });
    if (!defaultStation) {
        defaultStation = await prisma.station.create({
            data: { id: uuidv4(), name: 'General', order: 0 }
        });
    }

    for (const doc of workersSnap.docs) {
        const data = doc.data();
        // Map data
        const skills: string[] = [];
        if (data.rankedSkills && Array.isArray(data.rankedSkills)) {
            // Filter invalid skills if needed, or assume names are valid if they match enum
            // For safety, filter against VALID_SKILLS
            skills.push(...data.rankedSkills.filter((s: string) => VALID_SKILLS.has(s)));
        } else if (data.rankedSkillLetters && Array.isArray(data.rankedSkillLetters)) {
            const mapped = data.rankedSkillLetters.map((l: string) => mapSkillLetter(l)).filter((s): s is string => s !== null);
            skills.push(...mapped);
        }

        // Upsert Worker
        // Use deterministic UUID from doc.id (64 chars) or fallback
        const wId = uuidv5(doc.id, IMPORT_NAMESPACE);

        await prisma.worker.upsert({
            where: { id: wId },
            create: {
                id: wId,
                employeeId: data.employeeId,
                firstName: data.firstName || 'Unknown',
                lastName: data.lastName || 'Worker',
                stationId: defaultStation.id,
                shiftId: shift1.id, // Default to shift 1
                rankedSkills: skills as any, // Prisma Enum
                // isActive: data.isActive !== false // Removed as not in schema
            },
            update: {
                firstName: data.firstName,
                lastName: data.lastName,
                rankedSkills: skills as any,
                // isActive: data.isActive !== false
            }
        });
        createdWorkers++;
    }
    console.log(`✅ Imported/Updated ${createdWorkers} workers locally.`);


    // 3. Import Task Templates -> Create Local Templates
    console.log("\n--- TASK TEMPLATES (Importing from Firestore) ---");
    const ttSnap = await db.collection('taskTemplates').get();
    console.log(`Found ${ttSnap.size} task templates.`);

    let createdTemplates = 0;
    const templateIds: string[] = [];

    for (const doc of ttSnap.docs) {
        const data = doc.data();

        // Ensure Dept Exists (By Name)
        let deptId = 'general';
        const deptName = data.departmentName || 'General';

        let existingDept = await prisma.department.findFirst({
            where: { name: { equals: deptName, mode: 'insensitive' } }
        });

        if (existingDept) {
            deptId = existingDept.id;
        } else {
            console.log(`Creating missing department: ${deptName}`);
            const newDept = await prisma.department.create({
                data: { id: uuidv4(), name: deptName }
            });
            deptId = newDept.id;
        }

        // Skills mapping (Templates likely use letters based on check)
        const templateSkills: string[] = [];
        if (data.rankedSkillLetters && Array.isArray(data.rankedSkillLetters)) {
            const mapped = data.rankedSkillLetters.map((l: string) => mapSkillLetter(l)).filter((s): s is string => s !== null);
            templateSkills.push(...mapped);
        }

        // Upsert TaskTemplate with Deterministic UUID v5
        const ttId = uuidv5(doc.id, IMPORT_NAMESPACE);

        const tt = await prisma.taskTemplate.upsert({
            where: { id: ttId },
            create: {
                id: ttId,
                name: data.name || 'Untitled Template',
                departmentId: deptId,
                stationId: defaultStation.id, // Using general station to avoid complexity mapping stations
                minWorkers: data.minWorkers || 1,
                maxWorkers: data.maxWorkers || 2,
                rankedSkills: templateSkills as any,
                taskType: 'default',
                order: data.order || 0
            },
            update: {
                name: data.name,
                minWorkers: data.minWorkers,
                maxWorkers: data.maxWorkers,
                rankedSkills: templateSkills as any
            }
        });
        templateIds.push(tt.id);
        createdTemplates++;
    }
    console.log(`✅ Imported/Updated ${createdTemplates} task templates locally.`);


    // 4. Generate Dummy Project & Tasks (Since 'tasks' collection is empty)
    console.log("\n--- GENERATING TASKS (Simulation Mode) ---");
    // Create Project
    const proj = await prisma.project.create({
        data: { name: `Imported Sim ${new Date().toISOString()}` }
    });

    // Create 5 Units (Modules)
    const UNIT_COUNT = 5;
    let tasksCreated = 0;

    // Create Default Traveler Template
    // We try to find first, or create with UUID
    let defaultTT = await prisma.travelerTemplate.findFirst({ where: { name: 'Standard Traveler' } });
    if (!defaultTT) {
        defaultTT = await prisma.travelerTemplate.create({
            data: { id: uuidv4(), name: 'Standard Traveler' }
        });
    }

    for (let i = 1; i <= 3; i++) { // Reduced to 3
        const mpId = uuidv4();
        const mp = await prisma.moduleProfile.create({
            data: { id: mpId, name: `Unit ${i}`, projectId: proj.id }
        });

        const travelerId = uuidv4();
        const moduleId = uuidv4();

        // Create Module (needs MP and TT)
        const unitModule = await prisma.module.create({
            data: {
                id: moduleId,
                moduleProfileId: mp.id,
                travelerTemplateId: defaultTT.id,
                serialNumber: `SN-${i}`
            }
        });

        // Create Traveler (needs Module, MP, TT)
        const traveler = await prisma.traveler.create({
            data: {
                id: travelerId,
                moduleId: unitModule.id, // Now it exists
                moduleProfileId: mp.id,
                travelerTemplateId: defaultTT.id,
                isShipped: false
            }
        });

        // Create a Task for EACH Template found
        for (const tId of templateIds) {
            await prisma.task.create({
                data: {
                    travelerId: traveler.id,
                    taskTemplateId: tId,
                    leadStatus: 'pending',
                    qamStatus: 'pending',
                    createdAt: new Date()
                }
            });
            tasksCreated++;
        }
    }
    console.log(`✅ Generated ${tasksCreated} tasks across ${UNIT_COUNT} units for simulation.`);

    console.log("\n-----------------------------------");
    console.log("🎉 IMPORT COMPLETE");
    console.log("You can now refresh the Local UI to see the Production Data Simulation.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
