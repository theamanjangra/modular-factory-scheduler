import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import { validateRequest } from "../middlewares/validateRequest";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  createTaskTemplateModuleAttributeController,
  deleteTaskTemplateModuleAttributeController,
  getAllTaskTemplateModuleAttributesController,
  getTaskTemplateModuleAttributeByIdController,
  updateTaskTemplateModuleAttributeController,
  getTaskTemplateModuleAttributeByTaskTemplateIdController,
} from "../controllers/taskTemplateModuleAttribute.controller";
import {
  createtaskTemplateModuleAttributeSchema,
  deletetaskTemplateModuleAttributeSchema,
  gettaskTemplateModuleAttributeIdSchema,
  updatetaskTemplateModuleAttributeSchema,
  gettaskTemplateModuleAttributeByTaskTemplateIdSchema,
} from "../utils/validators/taskTemplateModuleAttributeValidator";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

// Create
router.post(
  "/",
  validateRequest(createtaskTemplateModuleAttributeSchema),
  createTaskTemplateModuleAttributeController
);

// Read all
router.get("/", getAllTaskTemplateModuleAttributesController);

// Read by id
router.get(
  "/:id",
  validateRequest(gettaskTemplateModuleAttributeIdSchema),
  getTaskTemplateModuleAttributeByIdController
);

// Read by TaskTemplateId
router.get(
  "/taskTemplate/:id",
  validateRequest(gettaskTemplateModuleAttributeByTaskTemplateIdSchema),
  getTaskTemplateModuleAttributeByTaskTemplateIdController
);

// Update
router.put(
  "/:id",
  validateRequest(updatetaskTemplateModuleAttributeSchema),
  updateTaskTemplateModuleAttributeController
);

// Delete
router.delete(
  "/:id",
  validateRequest(deletetaskTemplateModuleAttributeSchema),
  deleteTaskTemplateModuleAttributeController
);

export { router as taskTemplateModuleAttributeRoutes };
