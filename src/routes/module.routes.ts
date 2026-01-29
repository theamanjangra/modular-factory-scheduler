import {
  createModuleController,
  deleteModuleeaController,
  updateModuleController,
  getAllModuleController,
  getByIdModuleController,
  updateModuleOrderController,
} from "../controllers/module.controller";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createModuleSchema,
  updateModuleSchema,
  updateOrderModuleSchema,
  paramModuleSchema,
} from "../utils/validators/moduleValidator";
import { apiLimiter } from "./../middlewares/rateLimiter";
import { Router } from "express";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

router.post("/", validateRequest(createModuleSchema), createModuleController);
router.get("/", getAllModuleController);
router.get("/:id", validateRequest(paramModuleSchema), getByIdModuleController);
router.put("/:id", validateRequest(updateModuleSchema), updateModuleController);
router.put(
  "/updateorder/:id",
  validateRequest(updateOrderModuleSchema),
  updateModuleOrderController
);
router.delete(
  "/:id",
  validateRequest(paramModuleSchema),
  deleteModuleeaController
);

export { router as moduleRouter };
