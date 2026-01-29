import { Router } from "express";
import { handleChatMessage, getChatHistory } from "../controllers/chatController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { apiLimiter } from "../middlewares/rateLimiter";
import { optionalPDFUpload } from "../middlewares/uploadMiddleware";

const router = Router();

/**
 * POST /api/chat
 * Handle incoming chat messages with optional PDF upload
 * Protected by Firebase auth and rate limiting
 *
 * Content-Type: multipart/form-data or application/json
 * Fields:
 *   - message (string, required): User's text message/question
 *   - sessionId (string, optional): Session UUID
 *   - metadata (JSON string, optional): Additional metadata
 *   - file (file, optional): PDF file to upload
 */
router.post(
  "/",
  authenticateToken,
  apiLimiter,
  optionalPDFUpload, // Multer middleware for optional PDF upload
  handleChatMessage
);

/**
 * GET /api/chat/history/:sessionId
 * Get chat history for a specific session
 * Protected by Firebase auth
 */
router.get(
  "/history/:sessionId",
  authenticateToken,
  getChatHistory
);

export { router as chatRoutes };
