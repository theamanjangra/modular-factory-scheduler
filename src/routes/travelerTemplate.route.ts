import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { createTravelerTemplateSchema, deleteTravelerTemplateSchema, updateTravelerTemplateSchema } from "../utils/validators/travelerTemplate.validation";
import { createTravelerTemplateController, deleteTravelerTemplateController, getAllTravelerTemplatesController, getTravelerTemplateByIdController, updateTravelerTemplateController } from "../controllers/travelerTemplate.controller";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

router.post("/", validateRequest(createTravelerTemplateSchema), createTravelerTemplateController);
router.get("/", getAllTravelerTemplatesController);
router.get("/:id", getTravelerTemplateByIdController);
router.put("/:id", validateRequest(updateTravelerTemplateSchema), updateTravelerTemplateController)
router.delete("/:id", validateRequest(deleteTravelerTemplateSchema), deleteTravelerTemplateController)

export {router as travelerTemplateRoutes}