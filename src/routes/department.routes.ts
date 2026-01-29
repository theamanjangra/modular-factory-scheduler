import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { apiLimiter } from "../middlewares/rateLimiter";
import {
  createDepartmentController,
  deleteDepartmentController,
  getAllDepartmentsController,
  updateDepartmentController,
  getDepartmentByIdController,
} from "../controllers/department.controller";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createDepartmentSchema,
  deleteDepartmentSchema,
  updateDepartmentSchema,
  getDepartmentByIdSchema,
} from "../utils/validators/departmentValidator";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

router.post(
  "/",
  validateRequest(createDepartmentSchema),
  createDepartmentController
);
router.get("/", getAllDepartmentsController);
router.get(
  "/:ids",
  validateRequest(getDepartmentByIdSchema),
  getDepartmentByIdController
);
router.put(
  "/:id",
  validateRequest(updateDepartmentSchema),
  updateDepartmentController
);
router.delete(
  "/:id",
  validateRequest(deleteDepartmentSchema),
  deleteDepartmentController
);

export { router as departmentRoutes };
