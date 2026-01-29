import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import {
  createModuleProfileController,
  deleteModuleProfileController,
  getAllModuleProfilesController,
  getModuleProfileByIdController,
  updateModuleProfileController,
} from "../controllers/moduleProfile.controller";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { createModuleProfileSchema, deleteModuleProfileSchema, getModuleProfileByIdSchema, updateModuleProfileSchema } from "../utils/validators/moduleProfileValidation";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken)

router.post("/", validateRequest(createModuleProfileSchema) ,createModuleProfileController);
router.get("/", getAllModuleProfilesController);
router.get("/:id", validateRequest(getModuleProfileByIdSchema) ,getModuleProfileByIdController);
router.put("/:id", validateRequest(updateModuleProfileSchema) ,updateModuleProfileController);
router.delete("/:id", validateRequest(deleteModuleProfileSchema) ,deleteModuleProfileController);

export { router as moduleProfileRoutes };
