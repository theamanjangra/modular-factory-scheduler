import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import { validateRequest } from "../middlewares/validateRequest";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  createTravelerTemplateInspectionItemTemplateController,
  deleteTravelerTemplateInspectionItemTemplateController,
  getAllTravelerTemplateInspectionItemTemplateController,
  getTravelerTemplateInspectionItemTemplateByIdController,
  updateTravelerTemplateInspectionItemTemplateController,
  getByTravelerTemplateIdController
} from "../controllers/travelerTemplateInspectionItemTemplate.controller";
import {
  createTravelerTemplateInspectionItemTemplateSchema,
  deleteTravelerTemplateInspectionItemTemplateSchema,
  getTravelerTemplateInspectionItemTemplateByIdSchema,
  getTravelerTemplateInspectionTemplatesByTravelerIdSchema,
  updateTravelerTemplateInspectionItemTemplateSchema,
} from "../utils/validators/travelerTemplateInspectionItemTemplate.validation";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

// Create
router.post(
  "/",
  validateRequest(createTravelerTemplateInspectionItemTemplateSchema),
  createTravelerTemplateInspectionItemTemplateController
);

// Read all
router.get("/", getAllTravelerTemplateInspectionItemTemplateController);

// Read by id
router.get(
  "/:id",
  validateRequest(getTravelerTemplateInspectionItemTemplateByIdSchema),
  getTravelerTemplateInspectionItemTemplateByIdController
);

// Read by traveler template id
router.get(
  "/by-traveler-template/:travelerTemplateId",
  validateRequest(getTravelerTemplateInspectionTemplatesByTravelerIdSchema),
  getByTravelerTemplateIdController
);

// Update
router.put(
  "/:id",
  validateRequest(updateTravelerTemplateInspectionItemTemplateSchema),
  updateTravelerTemplateInspectionItemTemplateController
);

// Delete
router.delete(
  "/:id",
  validateRequest(deleteTravelerTemplateInspectionItemTemplateSchema),
  deleteTravelerTemplateInspectionItemTemplateController
);

export { router as travelerTemplateInspectionItemTemplateRoutes };
