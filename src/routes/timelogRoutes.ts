import { Router } from "express";
import {
  createTimelogController,
  getTimelogsController,
  getTimelogByIdController,
  updateTimelogController,
  deleteTimelogController,
  getTimelogsByEmployeeController,
  getTimelogsFilterController,
  filteredEmployeeTimelogController,
  getTimelogsAbsencesTardiesController,
} from "../controllers/timelogController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { apiLimiter } from "../middlewares/rateLimiter";

const router = Router();

// Apply rate limiting to all timelog routes
router.use(apiLimiter);

// Apply authentication to all timelog routes
router.use(authenticateToken);

// GET /api/timelogs - Get timelogs with optional filters
router.get("/", getTimelogsController);

// GET /api/timelogs - Get timelogs absences and tardies
router.get(
  "/getTimelogsAbsencesTardiesController",
  getTimelogsAbsencesTardiesController
);

// GET /api/timelogs/employee/:employeeId - Get timelogs by employee
router.get("/employee/:employeeId", getTimelogsByEmployeeController);

// GET /api/timelogs/:id - Get timelog by ID
router.get("/:id", getTimelogByIdController);

// POST /api/timelogs - Create new timelog
router.post("/", createTimelogController);

router.post("/employee/filtered-timelogs", filteredEmployeeTimelogController);

// PUT /api/timelogs/:id - Update timelog
router.put("/:id", updateTimelogController);

// DELETE /api/timelogs/:id - Delete timelog
router.delete("/:id", deleteTimelogController);

router.get("/timelogs-filter/:start/:end", getTimelogsFilterController);

export { router as timelogRoutes };
