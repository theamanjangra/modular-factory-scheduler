import { Request, Response } from 'express';
import { AdjustPlanSimpleRequest } from '../types';
import { PlanAdjustmentService } from '../services/planAdjustmentService';

export class PlanController {
    private adjustmentService: PlanAdjustmentService;

    constructor() {
        this.adjustmentService = new PlanAdjustmentService();
    }

    public adjustPlan = async (req: Request, res: Response) => {
        try {
            const rawPlanId = req.params.planId;
            let planId: string | undefined;
            if (Array.isArray(rawPlanId)) {
                planId = rawPlanId[0];
            } else {
                planId = rawPlanId;
            }
            const body = req.body as AdjustPlanSimpleRequest;

            if (typeof planId !== 'string' || planId.trim() === '') {
                res.status(400).json({ error: 'planId is required.' });
                return;
            }

            if (!body || typeof body !== 'object') {
                res.status(400).json({ error: 'Request body is required.' });
                return;
            }

            if (!body.currentTime || typeof body.currentTime !== 'string') {
                res.status(400).json({ error: 'currentTime is required.' });
                return;
            }

            const parsedTime = new Date(body.currentTime);
            if (isNaN(parsedTime.getTime())) {
                res.status(400).json({ error: 'currentTime must be a valid ISO date.' });
                return;
            }

            if (!Array.isArray(body.updates)) {
                res.status(400).json({ error: 'updates must be an array.' });
                return;
            }

            for (const update of body.updates) {
                if (!update || typeof update !== 'object') {
                    res.status(400).json({ error: 'Each update must be an object.' });
                    return;
                }
                if (typeof update.taskId !== 'string' || update.taskId.trim() === '') {
                    res.status(400).json({ error: 'Each update requires a taskId.' });
                    return;
                }
                if (typeof update.laborHoursRemaining !== 'number' || update.laborHoursRemaining < 0) {
                    res.status(400).json({ error: 'laborHoursRemaining must be a non-negative number.' });
                    return;
                }
            }

            if (body.workerUpdates) {
                if (!Array.isArray(body.workerUpdates)) {
                    res.status(400).json({ error: 'workerUpdates must be an array.' });
                    return;
                }
                for (const update of body.workerUpdates) {
                    if (!update.workerId || typeof update.workerId !== 'string') {
                        res.status(400).json({ error: 'Worker update requires workerId.' });
                        return;
                    }
                    if (!update.availability || typeof update.availability !== 'object') {
                        res.status(400).json({ error: 'Worker update requires availability object.' });
                        return;
                    }
                    const { startTime, endTime } = update.availability;
                    if (!startTime || isNaN(new Date(startTime).getTime())) {
                        res.status(400).json({ error: 'Worker availability requires valid startTime.' });
                        return;
                    }
                    if (!endTime || isNaN(new Date(endTime).getTime())) {
                        res.status(400).json({ error: 'Worker availability requires valid endTime.' });
                        return;
                    }
                }
            }

            if (body.addedTasks) {
                if (!Array.isArray(body.addedTasks)) {
                    res.status(400).json({ error: 'addedTasks must be an array.' });
                    return;
                }
                // Basic check for required fields in added tasks
                for (const t of body.addedTasks) {
                    if (!t.taskId || !t.estimatedTotalLaborHours) {
                        res.status(400).json({ error: 'Added tasks must have taskId and estimatedTotalLaborHours.' });
                        return;
                    }
                }
            }

            if (body.removedTaskIds) {
                if (!Array.isArray(body.removedTaskIds)) {
                    res.status(400).json({ error: 'removedTaskIds must be an array.' });
                    return;
                }
            }

            let originalAssignments: any[] = []; // Using any[] to match mapped structure momentarily

            // Check for Ephemeral / Stateless Mode
            if (planId === 'ephemeral' || body.originalAssignments) {
                if (!body.tasks || !body.workers) {
                    res.status(400).json({ error: 'tasks and workers definitions are required for ephemeral plans.' });
                    return;
                }
                if (!body.originalAssignments) {
                    res.status(400).json({ error: 'originalAssignments are required for ephemeral plans.' });
                    return;
                }
                originalAssignments = body.originalAssignments;

                const result = await this.adjustmentService.adjustPlanReplan(
                    originalAssignments,
                    body.tasks,
                    body.workers,
                    body
                );
                res.json(result);
            } else {
                // Persistent Mode (Snapshot Based)
                // Delegates finding the plan and snapshot to the service
                const result = await this.adjustmentService.adjustPlanReplanFromPlanId(planId, body);
                res.json(result);
            }
        } catch (error: any) {
            console.error('Adjust plan error:', error);
            const status = typeof error?.statusCode === 'number'
                ? error.statusCode
                : (typeof error?.status === 'number' ? error.status : 500);
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    public getPlan = async (req: Request, res: Response) => {
        try {
            const rawPlanId = req.params.planId;
            const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId;

            if (!planId) {
                res.status(400).json({ error: 'planId is required.' });
                return;
            }

            const { getPlanWithSnapshot } = await import('../models/planModel');
            const plan = await getPlanWithSnapshot(planId);

            if (!plan) {
                res.status(404).json({ error: 'Plan not found' });
                return;
            }

            res.json(plan);
        } catch (error: any) {
            console.error('Get plan error:', error);
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    };
}
