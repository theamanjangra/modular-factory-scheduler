import { Router } from "express";
import { apiLimiter } from "../middlewares/rateLimiter";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getAllPTO,
  createPtoController,
  updatePtoRequestController,
} from "../controllers/ptoManagement.controller";
const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);
router.post("/", createPtoController);
router.get("/", getAllPTO);
router.patch("/:id", updatePtoRequestController);

export { router as PtoManagementRoutes };
