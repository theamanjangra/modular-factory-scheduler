import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getShiftById = async (shiftId: string) => {
    // Mock implementation since Shift model is missing from Prisma Schema
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(7, 0, 0, 0); // 07:00

    const endTime = new Date(now);
    endTime.setHours(17, 30, 0, 0); // 17:30 (10.5 hrs)

    return {
        id: shiftId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
    };
};

export const getWorkersNameWithShiftId = async (shiftId: string) => {
    try {
        const employees = await prisma.employee.findMany();

        return {
            workers: employees.map((e) => {
                const parts = e.name ? e.name.split(' ') : ['Unknown'];
                const firstName = parts[0];
                const lastName = parts.slice(1).join(' ');

                return {
                    id: `w_${e.id}`,
                    firstName,
                    lastName
                };
            })
        };
    } catch (error) {
        console.error("Error fetching workers:", error);
        return { workers: [] };
    }
};
