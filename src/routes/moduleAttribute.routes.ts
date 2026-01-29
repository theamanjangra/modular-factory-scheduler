import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import {
  createModuleAttributeController,
  deleteModuleAttributeController,
  getAllModuleAttributeController,
  getModuleAttributeByIDController,
  updateModuleAttributeController,
} from "../controllers/moduleAttribute.controller";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createMduleAttributeSchema,
  deleteModuleAttributeSchema,
  updateModuleAttributeSchema,
} from "../utils/validators/moduleAttribute.validator";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

router.post(
  "/",
  validateRequest(createMduleAttributeSchema),
  createModuleAttributeController
);
router.get("/", getAllModuleAttributeController);
router.get("/:id", getModuleAttributeByIDController);
router.put(
  "/:id",
  validateRequest(updateModuleAttributeSchema),
  updateModuleAttributeController
);
router.delete(
  "/:id",
  validateRequest(deleteModuleAttributeSchema),
  deleteModuleAttributeController
);

export { router as ModuleAttributeRoutes };
