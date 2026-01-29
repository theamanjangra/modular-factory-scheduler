import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import {
  createTravelerTemplateTaskTemplateController,
  deleteTravelerTemplateTaskTemplateController,
  getAllTravelerTemplateTaskTemplateController,
  getByTravelerTemplateIdController,
  getTravelerTemplateTaskTemplateByIdController,
  updateTravelerTemplateTaskTemplateController,
} from "../controllers/travelTemplateTaskTemplate.controller";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createTravelerTemplateTaskTemplateSchema,
  deleteTravelerTemplateTaskTemplateSchema,
  getTravelerTemplateTaskTemplateByIdSchema,
  getTravelerTemplateTaskTemplatesByTravelerIdSchema,
  updateTravelerTemplateTaskTemplateSchema,
} from "../utils/validators/travelerTemplateTaskTemplate.validation";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);

// Create
router.post(
  "/",
  validateRequest(createTravelerTemplateTaskTemplateSchema),
  createTravelerTemplateTaskTemplateController
);

// Read all
router.get("/", getAllTravelerTemplateTaskTemplateController);

// Read one
router.get(
  "/:id",
  validateRequest(getTravelerTemplateTaskTemplateByIdSchema),
  getTravelerTemplateTaskTemplateByIdController
);

// Read by traveler id
router.get(
  "/by-traveler-template/:travelerTemplateId",
  validateRequest(getTravelerTemplateTaskTemplatesByTravelerIdSchema),
  getByTravelerTemplateIdController
);

// Update
router.put(
  "/:id",
  validateRequest(updateTravelerTemplateTaskTemplateSchema),
  updateTravelerTemplateTaskTemplateController
);

// Delete
router.delete(
  "/:id",
  validateRequest(deleteTravelerTemplateTaskTemplateSchema),
  deleteTravelerTemplateTaskTemplateController
);

export { router as travelerTemplateTaskTemplateRoutes };
