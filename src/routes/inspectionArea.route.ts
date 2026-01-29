import {
  createInspectionAreaController,
  deleteInspectionAreasController,
  updateInspectionAreasController,
  getInspectionAreaByIDController,
  getAllInspectionAreasStationsController,
  updateInspectionAreaOrderController,
} from "../controllers/inspectionArea.controller";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createInspectionAreaSchema,
  deleteInspectionAreaSchema,
  updateInspectionAreaSchema,
  updateOrderInspectionAreaSchema,
} from "../utils/validators/inspectionAreaValidation";
import { apiLimiter } from "./../middlewares/rateLimiter";
import { Router } from "express";
const router = Router();
router.use(apiLimiter);
router.use(authenticateToken);

router.post(
  "/",
  validateRequest(createInspectionAreaSchema),
  createInspectionAreaController
);
router.get("/", getAllInspectionAreasStationsController);
router.get("/:id", getInspectionAreaByIDController);

router.put(
  "/:id",
  validateRequest(updateInspectionAreaSchema),
  updateInspectionAreasController
);
router.put(
  "/updateorder/:id",
  validateRequest(updateOrderInspectionAreaSchema),
  updateInspectionAreaOrderController
);
router.delete(
  "/:id",
  validateRequest(deleteInspectionAreaSchema),
  deleteInspectionAreasController
);

export { router as inspectionAreaRoutes };
