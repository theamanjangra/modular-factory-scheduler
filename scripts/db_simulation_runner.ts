
import { PrismaClient } from '@prisma/client';
import { SchedulingAdapterService, ExternalSchedulingInput, ExternalProductionPlanShift, ExternalTask } from '../src/services/schedulingAdapterService';
import { addDays, setHours, setMinutes, startOfDay, addMinutes } from 'date-fns';

// const prisma = new PrismaClient(); // DB not used in mock mode
const adapter = new SchedulingAdapterService();

async function runSimulation() {
    console.log("--- Starting DB Simulation Runner (MOCK MODE) ---");

    try {
        // 1. Fetch Active Work (MOCKED)
        console.log("⚠️ DB Connection failed previously. Using MOck DATA for simulation.");

        // Mocking 5 active tasks across 3 travelers
        const externalTasks: ExternalTask[] = [
            {
                id: "mock-task-1",
                department: { id: "dept-assembly" },
                traveler: { id: "trav-101" },
                name: "Assemble Chassis",
                estimatedLaborHours: 4.0
            },
            {
                id: "mock-task-2",
                department: { id: "dept-wiring" },
                traveler: { id: "trav-101" },
                name: "Install Main Harness",
                estimatedLaborHours: 2.5
            },
            {
                id: "mock-task-3",
                department: { id: "dept-assembly" },
                traveler: { id: "trav-102" },
                name: "Mount Body Panels",
                estimatedLaborHours: 3.0
            },
            {
                id: "mock-task-4",
                department: { id: "dept-paint" },
                traveler: { id: "trav-102" },
                name: "Prep for Paint",
                estimatedLaborHours: 1.5
            },
            {
                id: "mock-task-5",
                department: { id: "dept-qa" },
                traveler: { id: "trav-103" },
                name: "Final Inspection",
                estimatedLaborHours: 0.5
            }
        ];

        console.log(`Generated ${externalTasks.length} mock tasks.`);

        // 3. Generate Shifts (Simulate Next 3 Days, 7am-3pm)
        const today = startOfDay(new Date());
        const shifts: ExternalProductionPlanShift[] = [];

        // Create 3 days of shifts
        for (let i = 0; i < 3; i++) {
            const date = addDays(today, i);
            const shiftStart = setMinutes(setHours(date, 7), 0); // 7:00 AM
            const shiftEnd = setMinutes(setHours(date, 15), 0);  // 3:00 PM

            shifts.push({
                id: `sim-shift-${i}`,
                shift: {
                    id: `shift-template-day`,
                    // Seconds from midnight
                    startTime: 7 * 3600,
                    endTime: 15 * 3600,
                    weekDayOrdinal: date.getDay() || 7
                }
            });
        }

        // 4. Construct Payload
        const input: ExternalSchedulingInput = {
            startDate: shifts[0]?.shift ? new Date().toISOString() : new Date().toISOString(), // Rough start
            endDate: addDays(new Date(), 3).toISOString(),
            shifts: shifts,
            tasks: externalTasks
        };

        // 5. Run Adapter
        console.log("Running Scheduling Adapter...");
        const result = await adapter.run(input);

        console.log("--- Simulation Complete ---");
        console.log(`Assignments Generated: ${result.assignments.length}`);
        console.log(`Deficits: ${result.deficitTasks.length}`);
        console.table(result.shift1Summary);

    } catch (error) {
        console.error("Simulation Failed:", error);
    } finally {
        // await prisma.$disconnect();
    }
}

runSimulation();
