import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { apiLimiter } from "../middlewares/rateLimiter";
import { createProjectController, deleteProjectController, getAllProjectsController, updateProjectController } from "../controllers/project.controller";
import { validateRequest } from "../middlewares/validateRequest";
import { createProjectSchema, deleteProjectSchema, updateProjectSchema} from "../utils/validators/projectValidation";

const router = Router();

router.use(apiLimiter)
router.use(authenticateToken)

router.post("/",validateRequest(createProjectSchema),createProjectController);
router.get("/", getAllProjectsController)
router.put("/:id", validateRequest(updateProjectSchema) ,updateProjectController)
router.delete("/:id", validateRequest(deleteProjectSchema) ,deleteProjectController)

export {router as projectRoutes};