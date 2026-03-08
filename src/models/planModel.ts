import { prisma } from '../config/db';

export interface PlanWithAssignments {
    id: string;
    name: string | null;
    createdAt: Date;
    updatedAt: Date;
    inputSnapshot?: any;
    assignments: {
        id: string;
        workerId: string;
        taskId: string;
        shiftId: string | null;
        startTime: Date;
        endTime: Date;
    }[];
}

/** Fetch a plan with all its assignments */
export const getPlanById = async (planId: string): Promise<PlanWithAssignments | null> => {
    // Persistent mode - deferred until schema migration adds assignments relation
    throw new Error('Persistent plan retrieval not yet implemented. Use ephemeral mode (planId = "ephemeral").');
};

/** Fetch assignments still active at or after a given time */
export const getActiveAssignments = async (planId: string, afterTime: Date) => {
    throw new Error('Persistent plan retrieval not yet implemented. Use ephemeral mode.');
};

/** Fetch a plan with all its assignments AND snapshot */
export const getPlanWithSnapshot = async (planId: string): Promise<(PlanWithAssignments & { inputSnapshot?: any }) | null> => {
    throw new Error('Persistent plan retrieval not yet implemented. Use ephemeral mode (planId = "ephemeral").');
};
