import { Router } from 'express';
import { PlanController } from '../controllers/planController';

const router = Router();
const controller = new PlanController();

// POST /api/v1/plans/adjust — adjust a plan (ephemeral/stateless mode)
router.post('/adjust', controller.adjustPlan);

// Legacy route with planId param (also works)
router.post('/:planId/adjust', controller.adjustPlan);

// GET /api/v1/plans/:planId — retrieve a persisted plan (future)
router.get('/:planId', controller.getPlan);

// POST /api/v1/plans/:planId/worker-tasks/adjust — zero-input replan via Data Connect
router.post('/:planId/worker-tasks/adjust', controller.adjustWorkerTasks);

export default router;
