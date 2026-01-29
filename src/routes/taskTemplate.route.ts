import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import {
  createTaskTemplateController,
  deleteTaskTemplateController,
  getAllTaskTemplatesController,
  getAllTaskTemplatesGroupedController,
  getTaskTemplateByIdController,
  updateTaskTemplateController,
  updateTaskTemplateOrderController,
} from "../controllers/taskTemplate.controller";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createTaskTemplateSchema,
  deleteTaskTemplateSchema,
  updateTaskTemplateSchema,
  updateOrderTaskTemplateSchema,
} from "../utils/validators/taskTemplateValidation";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken)

router.post(
  "/",
  validateRequest(createTaskTemplateSchema),
  createTaskTemplateController
);

router.get("/", getAllTaskTemplatesController);
router.get("/grouped", getAllTaskTemplatesGroupedController);
router.get("/:id", getTaskTemplateByIdController);
router.put(
  "/:id",
  validateRequest(updateTaskTemplateSchema),
  updateTaskTemplateController
);
router.put(
  "/updateorder/:id",
  validateRequest(updateOrderTaskTemplateSchema),
  updateTaskTemplateOrderController
);
router.delete(
  "/:id",
  validateRequest(deleteTaskTemplateSchema),
  deleteTaskTemplateController
);

export { router as taskTemplateRoutes };
