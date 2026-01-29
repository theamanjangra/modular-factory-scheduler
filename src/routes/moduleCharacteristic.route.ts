import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import {
  createManyModuleCharacteristics,
  createModuleCharacteristic,
  deleteModuleCharacteristic,
  deleteModuleCharacteristicsByIdController,
  getAllModuleCharacteristics,
  getModuleCharacteristicsByIdController,
  updateModuleCharacteristic,
} from "../controllers/moduleCharacteristic.controller";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createModuleCharacteristicSchema,
  deleteModuleCharacteristicSchema,
  updateModuleCharacteristicSchema,
} from "../utils/validators/moduleCharacteristicsValidation";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

router.post(
  "/",
  validateRequest(createModuleCharacteristicSchema),
  createModuleCharacteristic
);
router.post(
  "/many",
  validateRequest(createModuleCharacteristicSchema),
  createManyModuleCharacteristics
);
router.get("/", getAllModuleCharacteristics);
router.get("/:id", getModuleCharacteristicsByIdController);
router.put(
  "/:id",
  validateRequest(updateModuleCharacteristicSchema),
  updateModuleCharacteristic
);
router.delete(
  "/:id",
  validateRequest(deleteModuleCharacteristicSchema),
  deleteModuleCharacteristic
);
router.delete("/many/:id", deleteModuleCharacteristicsByIdController);

export { router as moduleCharacteristicsRoutes };
