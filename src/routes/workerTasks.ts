import { Router } from 'express';
import { WorkerTaskController } from '../controllers/workerTaskController';

const router = Router();
const controller = new WorkerTaskController();
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

router.post('/plan', controller.plan);
router.post('/plan-file', upload.single('file'), controller.planFromFile);
router.post('/plan-export', controller.exportPlan);
router.post('/plan-file-export', upload.single('file'), controller.exportPlanFromFile);
router.post('/plan-file-multishift', upload.single('file'), controller.planMultiShiftFromFile);
router.post('/plan-file-multishift-shiftids', upload.single('file'), controller.planMultiShiftFromFileWithShiftIds);
router.post('/plan-file-multishift-export', upload.single('file'), controller.exportMultiShiftFromFile);
router.post('/calculate-schedule', controller.multiShiftPlan);
router.post('/production-plan/preview', controller.getProductionPlanPreview); // NEW: Preview Endpoint (POST for mixed mode)
router.get('/debug/shift', controller.debugShiftWindow);

// KAN-383: Skill-based matching endpoint (for iOS app)
router.post('/match', controller.matchBySkills);

// Cross-Department Planning (Upload -> Plan -> Balance)
router.post('/cross-dept-plan', upload.single('file'), controller.crossDeptPlan);

// KAN-468: Task Interruption endpoints (replaces Hold/Resume)
router.post('/:planId/interruptions', controller.createInterruption);
router.post('/:planId/interruptions/:taskId/resolve', controller.resolveInterruption);
router.get('/:planId/interruptions', controller.getInterruptions);

// ========================================
// TEMPORARY: Time override for testing
// TODO: Remove before production
// ========================================
router.post('/debug/time-override', controller.setTimeOverride);
router.get('/debug/time-override', controller.getTimeOverride);


// Temporary Data Viz
router.get('/data-viz', controller.getDataViz);

export default router;

