import { Router } from 'express';
import { PlanController } from '../controllers/planController';

const router = Router();
const controller = new PlanController();

router.post('/:planId/adjust', controller.adjustPlan);
router.get('/:planId', controller.getPlan);

export default router;
