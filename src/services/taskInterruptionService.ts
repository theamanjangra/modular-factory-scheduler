import { TaskInterruption, TaskInterruptionReason, CreateInterruptionRequest, InterruptionResponse } from '../types';

/**
 * KAN-468: Task Interruption Service
 * 
 * Simple, clean service for managing task interruptions.
 * Works in-memory (ephemeral) - no database dependency.
 */
export class TaskInterruptionService {
    // In-memory store: planId -> taskId -> interruption
    private interruptions: Map<string, Map<string, TaskInterruption>> = new Map();

    // ========================================
    // TEMPORARY: Time override for testing
    // TODO: Remove this before production
    // ========================================
    private timeOverride: string | null = null;

    /**
     * TEMPORARY: Set a time override for testing.
     * Pass null to clear and use real time.
     */
    public setTimeOverride(isoTime: string | null): void {
        this.timeOverride = isoTime;
        console.log(`[TEMP] Time override set to: ${isoTime || 'REAL TIME'}`);
    }

    /**
     * TEMPORARY: Get the current time override.
     */
    public getTimeOverride(): string | null {
        return this.timeOverride;
    }

    /**
     * Get current time (uses override if set, otherwise real time).
     */
    private getCurrentTime(): string {
        return this.timeOverride || new Date().toISOString();
    }
    // ========================================

    /**
     * Create an interruption for a task.
     * 
     * @param planId - The plan ID
     * @param request - The interruption request
     * @returns The created interruption
     */
    public createInterruption(planId: string, request: CreateInterruptionRequest): InterruptionResponse {
        // Validate reason
        const validReasons: TaskInterruptionReason[] = ['material', 'equipment', 'other'];
        if (!validReasons.includes(request.reason)) {
            throw { statusCode: 400, message: `Invalid reason. Must be one of: ${validReasons.join(', ')}` };
        }

        // Get or create plan's interruption map
        if (!this.interruptions.has(planId)) {
            this.interruptions.set(planId, new Map());
        }
        const planInterruptions = this.interruptions.get(planId)!;

        // Check if task already has active interruption
        if (planInterruptions.has(request.taskId)) {
            throw { statusCode: 400, message: `Task ${request.taskId} already has an active interruption` };
        }

        // Create interruption
        const now = this.getCurrentTime();
        const interruption: TaskInterruption = {
            id: `int-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            taskId: request.taskId,
            reason: request.reason,
            startDate: request.startDate || now,
            endDate: request.endDate,
            maxWorkersDuringInterruption: request.maxWorkersDuringInterruption ?? 0,
            notes: request.notes,
            createdAt: now
        };

        // Store it
        planInterruptions.set(request.taskId, interruption);

        console.log(`[TaskInterruption] Created: ${interruption.id} for task ${request.taskId} (reason: ${request.reason})`);

        return {
            interruption,
            message: `Task ${request.taskId} interrupted due to ${request.reason}`,
            affectedTaskIds: [request.taskId]
        };
    }

    /**
     * Resolve an interruption for a task (set endDate to now).
     * 
     * @param planId - The plan ID
     * @param taskId - The task ID
     * @returns The resolved interruption
     */
    public resolveInterruption(planId: string, taskId: string): InterruptionResponse {
        const planInterruptions = this.interruptions.get(planId);

        if (!planInterruptions || !planInterruptions.has(taskId)) {
            throw { statusCode: 404, message: `No active interruption found for task ${taskId}` };
        }

        const interruption = planInterruptions.get(taskId)!;

        // Set end date to now
        interruption.endDate = this.getCurrentTime();

        // Remove from active interruptions
        planInterruptions.delete(taskId);

        console.log(`[TaskInterruption] Resolved: ${interruption.id} for task ${taskId}`);

        return {
            interruption,
            message: `Interruption resolved for task ${taskId}`,
            affectedTaskIds: [taskId]
        };
    }

    /**
     * Get all active interruptions for a plan.
     * 
     * @param planId - The plan ID
     * @returns List of active interruptions
     */
    public getInterruptions(planId: string): TaskInterruption[] {
        const planInterruptions = this.interruptions.get(planId);

        if (!planInterruptions) {
            return [];
        }

        return Array.from(planInterruptions.values());
    }

    /**
     * Check if a task is currently interrupted.
     * 
     * @param planId - The plan ID
     * @param taskId - The task ID
     * @returns The interruption if active, undefined otherwise
     */
    public isTaskInterrupted(planId: string, taskId: string): TaskInterruption | undefined {
        const planInterruptions = this.interruptions.get(planId);
        return planInterruptions?.get(taskId);
    }

    /**
     * Get the maximum workers allowed for a task (considering interruption).
     * Returns undefined if no interruption, or the maxWorkersDuringInterruption value.
     * 
     * @param planId - The plan ID
     * @param taskId - The task ID
     * @returns Max workers during interruption, or undefined if not interrupted
     */
    public getMaxWorkersDuringInterruption(planId: string, taskId: string): number | undefined {
        const interruption = this.isTaskInterrupted(planId, taskId);
        return interruption?.maxWorkersDuringInterruption;
    }
}

// Singleton instance for ephemeral mode
export const taskInterruptionService = new TaskInterruptionService();
