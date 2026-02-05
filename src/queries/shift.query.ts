
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ShiftInfo = {
    id: string;
    name?: string | null;
    startTime: string;
    endTime: string;
    lunchStartTime?: string | null;
    lunchEndTime?: string | null;
};

export const getShiftById = async (shiftId: string): Promise<ShiftInfo | null> => {
    try {
        // const shift = await prisma.shift.findUnique({
        //     where: { id: shiftId }
        // });
        const shift: any = null; // MOCK FORCE NULL

        if (shift && shift.startTime && shift.endTime) {
            return {
                id: shift.id,
                name: shift.name,
                startTime: shift.startTime.toISOString(),
                endTime: shift.endTime.toISOString(),
                lunchStartTime: shift.lunchStartTime?.toISOString() || null,
                lunchEndTime: shift.lunchEndTime?.toISOString() || null
            };
        }

        // Shift not found or missing times - return null to trigger fallback
        return null;
    } catch (error) {
        console.error("Error fetching shift:", error);
        return null;
    }
};

export const getWorkersNameWithShiftId = async (shiftId: string) => {
    try {
        // const workers = await prisma.worker.findMany({
        //     where: shiftId ? { shiftId } : undefined
        // });
        const workers: any[] = []; // MOCK FORCE EMPTY

        return {
            workers: workers.map((w) => ({
                id: w.id,
                firstName: w.firstName || 'Unknown',
                lastName: w.lastName || ''
            }))
        };
    } catch (error) {
        console.error("Error fetching workers:", error);
        return { workers: [] };
    }
};

// Helper to build a default shift when not found in database
export const buildDefaultShift = (shiftId: string, referenceTime?: string): ShiftInfo => {
    let baseDate = '2024-01-01';
    if (referenceTime && referenceTime.includes('T')) {
        const d = new Date(referenceTime);
        if (!isNaN(d.getTime())) {
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            baseDate = `${y}-${m}-${day}`;
        }
    }

    // Default shift times
    return {
        id: shiftId,
        startTime: `${baseDate}T07:00:00Z`,
        endTime: `${baseDate}T17:00:00Z`
    };
};
