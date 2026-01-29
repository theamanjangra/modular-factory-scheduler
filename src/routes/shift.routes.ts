import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import {
  createShiftController,
  deleteShiftController,
  getAllShiftsController,
  getShiftByIDController,
  updateShiftController,
  getAllShiftsNameController,
  updateShiftWeekController,
  getAllShiftsWithWorkersCountController,
  getAllAssignedShiftsTotheWeekDaysController,
  getAllAvailableShiftsController,
  getAllUnAvailableShiftsController,
  bulkUpdateWorkerShiftIdController,
  deleteShiftWeekController,
  getWorkersNameWithShiftIdController,
} from "../controllers/shift.controller";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createShiftSchema,
  deleteShiftSchema,
  updateShiftSchema,
  getShiftByIdSchema,
} from "../utils/validators/shiftValidator";

const router = Router();

router.use(apiLimiter);
//router.use(authenticateToken);

router.post("/", validateRequest(createShiftSchema), createShiftController); //done
router.get("/worker-count", getAllShiftsWithWorkersCountController); //done
router.get(
  "/byId/:id",
  validateRequest(getShiftByIdSchema),
  getShiftByIDController
);
router.get("/", getAllShiftsController); //done
router.get("/assigned", getAllAssignedShiftsTotheWeekDaysController); //done
router.get("/shiftName", getAllShiftsNameController);
router.get("/workerName/:id", getWorkersNameWithShiftIdController);

router.get("/available", getAllAvailableShiftsController); //done
router.get("/unavailable", getAllUnAvailableShiftsController); //done
router.put("/updateWeek/:id", updateShiftWeekController); //done
router.put("/updateBulkShiftId", bulkUpdateWorkerShiftIdController); //done
router.put("/:id", validateRequest(updateShiftSchema), updateShiftController); //done
router.put("/deleteWeek/:id", deleteShiftWeekController); //done
router.delete(
  "/:id",
  validateRequest(deleteShiftSchema),
  deleteShiftController
); //done

export { router as shiftRoutes };
