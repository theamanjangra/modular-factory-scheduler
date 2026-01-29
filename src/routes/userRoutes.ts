import { Router } from 'express';
import { 
  createUserController, 
  getAllUsersController, 
  getUserByIdController,
  getUsersByRoleController,
  updateUserController,
  deleteUserController
} from '../controllers/userController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Apply rate limiting to all user routes
router.use(apiLimiter);

// Apply authentication to all user routes
router.use(authenticateToken);

// GET /api/users - Get all users
router.get('/allUsers', getAllUsersController);

// GET /api/users/role/:role - Get users by role
router.get('/role/:role', getUsersByRoleController);

// GET /api/users/:id - Get user by ID
router.get('/:id', getUserByIdController);

// POST /api/users - Create new user
router.post('/create', createUserController);

// PUT /api/users/:id - Update user
router.put('/:id', updateUserController);

// DELETE /api/users/:id - Delete user
router.delete('/:id', deleteUserController);

export { router as userRoutes };
