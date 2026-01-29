import { Router } from "express";
import {
  createEmployeeController,
  getAllEmployeesController,
  getEmployeeByIdController,
  getEmployeeByEmailController,
  updateEmployeeController,
  deleteEmployeeController,
  getEmployeesByCrewController,
} from "../controllers/employeeController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { apiLimiter } from "../middlewares/rateLimiter";

const router = Router();

// Apply rate limiting to all employee routes
router.use(apiLimiter);

// Apply authentication to all employee routes
router.use(authenticateToken);

// GET /api/employees - Get all employees
router.get("/", getAllEmployeesController);

// GET /api/employees/crew/:crewId - Get employees by crew
router.get("/crew/:crewId", getEmployeesByCrewController);

// GET /api/employees/email/:email - Get employee by email
router.get("/email/:email", getEmployeeByEmailController);

// GET /api/employees/:id - Get employee by ID
router.get("/:id", getEmployeeByIdController);

// POST /api/employees - Create new employee
router.post("/", createEmployeeController);

// PUT /api/employees/:id - Update employee
router.put("/:id", updateEmployeeController);

// DELETE /api/employees/:id - Delete employee
router.delete("/:id", deleteEmployeeController);

export { router as employeeRoutes };
