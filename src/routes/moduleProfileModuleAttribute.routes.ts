import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import { validateRequest } from "../middlewares/validateRequest";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  createModuleProfileModuleAttributeController,
  deleteModuleProfileModuleAttributeController,
  getAllModuleProfileModuleAttributesController,
  getModuleProfileModuleAttributeByIdController,
  updateModuleProfileModuleAttributeController,
  deleteDataWithModuleProfileByIdController,
  getDataWithModuleProfileByIdController,
} from "../controllers/moduleProfileModuleAttribute.controller";
import {
  createmoduleProfileModuleAttributeSchema,
  deletemoduleProfileModuleAttributeSchema,
  getmoduleProfileModuleAttributeIdSchema,
  updatemoduleProfileModuleAttributeSchema,
} from "../utils/validators/moduleProfileModuleAttributeValidator";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

// Create
router.post(
  "/",
  validateRequest(createmoduleProfileModuleAttributeSchema),
  createModuleProfileModuleAttributeController
);

// Read all
router.get("/", getAllModuleProfileModuleAttributesController);

// Read by id
router.get(
  "/:id",
  validateRequest(getmoduleProfileModuleAttributeIdSchema),
  getModuleProfileModuleAttributeByIdController
);

router.get("/moduleProfile/:id", getDataWithModuleProfileByIdController);

// Update
router.put(
  "/:id",
  validateRequest(updatemoduleProfileModuleAttributeSchema),
  updateModuleProfileModuleAttributeController
);

// Delete
router.delete(
  "/:id",
  validateRequest(deletemoduleProfileModuleAttributeSchema),
  deleteModuleProfileModuleAttributeController
);

router.delete("/moduleProfile/:id", deleteDataWithModuleProfileByIdController);

export { router as moduleProfileModuleAttributeRoutes };
