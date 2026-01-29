import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import {
  createTimeStudyController,
  createTimeStudyModuleAttributeController,
  getAllTaskTemplateNamesController,
  getAllTimeStudiesController,
  getTaskTemplateModuleAttributesByTaskTemplateIdController,
  getTimeStudyByIDController,
  updateTimeStudyController,
  deleteTimeStudyController,
} from "../controllers/timeStudy.controller";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createTimeStudySchema,
  deleteTimeStudySchema,
  updateTimeStudySchema,
  getTimeStudyByIdSchema,
} from "../utils/validators/timeStudyValidator";

const router = Router();

router.use(apiLimiter);
//router.use(authenticateToken);

router.post(
  "/",
  validateRequest(createTimeStudySchema),
  createTimeStudyController
); //done
router.post("/tsma", createTimeStudyModuleAttributeController); //done

router.get("/", getAllTimeStudiesController); //done

router.get("/names", getAllTaskTemplateNamesController); //done
router.get(
  "/:id",
  validateRequest(getTimeStudyByIdSchema),
  getTimeStudyByIDController
); //done
router.get(
  "/tsma/:id",
  getTaskTemplateModuleAttributesByTaskTemplateIdController
);
router.put(
  "/:id",
  validateRequest(updateTimeStudySchema),
  updateTimeStudyController
); //done
router.delete(
  "/:id",
  validateRequest(deleteTimeStudySchema),
  deleteTimeStudyController
); //done

export { router as timeStudyRoutes };
