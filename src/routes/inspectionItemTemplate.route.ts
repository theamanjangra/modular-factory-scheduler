import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import { authenticateToken } from "../middlewares/authMiddleware";
import { getAllInspectionItemTemplatesController, getInspectionItemTemplateByIdController } from "../controllers/inspectionItemTemplate.controller";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken)

router.get("/", getAllInspectionItemTemplatesController)
router.get("/:id", getInspectionItemTemplateByIdController)

export {router as inspectionItemTemplateRoutes}