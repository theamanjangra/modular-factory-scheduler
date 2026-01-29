import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import {
  createStationController,
  deleteStationController,
  getAllStationsController,
  getStationByIDController,
  updateStationController,
  updateStationOrderController,
} from "../controllers/station.controller";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createStationSchema,
  deleteStationSchema,
  updateStationSchema,
  updateOrderStationSchema,
} from "../utils/validators/stationValidation";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

router.post("/", validateRequest(createStationSchema), createStationController);
router.get("/", getAllStationsController);
router.get("/:id", getStationByIDController);
router.put(
  "/:id",
  validateRequest(updateStationSchema),
  updateStationController
);
router.put(
  "/updateorder/:id",
  validateRequest(updateOrderStationSchema),
  updateStationOrderController
);
router.delete(
  "/:id",
  validateRequest(deleteStationSchema),
  deleteStationController
);

export { router as stationRoutes };
