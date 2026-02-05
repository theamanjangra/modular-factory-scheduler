import { Router } from 'express';
import { SchedulingController } from '../controllers/schedulingController';

const router = Router();
const controller = new SchedulingController();

// POST /api/v1/schedule/run
router.post('/run', controller.runSchedule);

// POST /api/v1/schedule/simulate
router.post('/simulate', controller.runSimulation);

export default router;
