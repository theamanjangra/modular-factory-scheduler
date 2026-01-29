/**
 * IN-MEMORY SESSION MANAGER
 * ⚠️ FOR TESTING ONLY - Sessions lost on server restart
 *
 * Use this temporarily if Prisma database is not available.
 * Replace with session-manager.ts (Prisma) or Firestore version for production.
 */

import { v4 as uuidv4 } from "uuid";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

interface ChatSession {
    id: string;
    userId?: string;
    messages: ChatMessage[];
    metadata: any;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
}

const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || "24", 10);
const MAX_TURNS = parseInt(process.env.MAX_CONVERSATION_HISTORY || "20", 10) / 2; // Convert to turns

// In-memory storage
const sessions = new Map<string, ChatSession>();

/**
 * Get existing session or create new one
 */
export const getOrCreateSession = async (
    sessionId?: string,
    userId?: string,
    metadata?: any
): Promise<ChatSession> => {
    try {
        // Try to load existing session
        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId)!;

            // Check if expired
            if (new Date() > session.expiresAt) {
                console.log(`⏰ Session ${sessionId} expired, creating new session`);
                sessions.delete(sessionId);
            } else {
                console.log(`✅ Loaded existing session ${sessionId}`);
                return session;
            }
        }

        // Create new session
        const newSessionId = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + SESSION_TTL_HOURS);

        const newSession: ChatSession = {
            id: newSessionId,
            userId: userId,
            messages: [],
            metadata: metadata || {},
            createdAt: new Date(),
            updatedAt: new Date(),
            expiresAt,
        };

        sessions.set(newSessionId, newSession);
        console.log(`🆕 Created new session ${newSessionId} (expires in ${SESSION_TTL_HOURS}h)`);
        return newSession;
    } catch (error) {
        console.error("❌ Error in getOrCreateSession:", error);
        throw new Error("Failed to get or create session");
    }
};

/**
 * Trim messages to keep N complete turns (user + assistant pairs)
 * Ensures history always starts with a user message
 */
const trimToCompleteTurns = (messages: ChatMessage[], maxTurns: number): ChatMessage[] => {
    if (messages.length === 0) return [];

    // Count complete turns from the end
    let turnCount = 0;
    let lastRoleWasUser = false;

    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && lastRoleWasUser) {
            turnCount++;
            if (turnCount >= maxTurns) {
                // Keep everything from index i onwards
                return messages.slice(i);
            }
        }
        lastRoleWasUser = messages[i].role === 'user';
    }

    // If we have fewer than maxTurns, return all
    return messages;
};

/**
 * Add a message to session's conversation history
 */
export const addMessageToSession = async (
    sessionId: string,
    role: "user" | "assistant",
    content: string
): Promise<void> => {
    try {
        const session = sessions.get(sessionId);

        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Add new message
        const newMessage: ChatMessage = {
            role,
            content,
            timestamp: new Date().toISOString(),
        };
        session.messages.push(newMessage);

        // Trim to max turns (keeps complete user+assistant pairs)
        session.messages = trimToCompleteTurns(session.messages, MAX_TURNS);

        session.updatedAt = new Date();

        console.log(
            `💬 Added ${role} message to session ${sessionId} (${session.messages.length} messages, ~${Math.floor(session.messages.length / 2)} turns)`
        );
    } catch (error) {
        console.error("❌ Error in addMessageToSession:", error);
        throw new Error("Failed to add message to session");
    }
};

/**
 * Get conversation history from session
 */
export const getConversationHistory = async (
    sessionId: string
): Promise<ChatMessage[]> => {
    try {
        const session = sessions.get(sessionId);

        if (!session) {
            console.log(`⚠️ Session ${sessionId} not found, returning empty history`);
            return [];
        }

        return session.messages;
    } catch (error) {
        console.error("❌ Error in getConversationHistory:", error);
        throw new Error("Failed to get conversation history");
    }
};

/**
 * Format conversation history for LLM context
 */
export const formatConversationHistory = (messages: ChatMessage[]): string => {
    if (!messages || messages.length === 0) {
        return "";
    }

    return messages
        .map((msg) => `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`)
        .join("\n\n");
};

// Cleanup expired sessions every hour
setInterval(() => {
    const now = new Date();
    let deletedCount = 0;

    for (const [id, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(id);
            deletedCount++;
        }
    }

    if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} expired sessions`);
    }
}, 60 * 60 * 1000); // Every hour
