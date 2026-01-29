/**
 * FIREBASE DATA CONNECT SESSION MANAGER
 * Persists chat sessions to PostgreSQL via Firebase Data Connect
 */

import { v4 as uuidv4 } from "uuid";
import { chatDataConnect } from "../../config/chatConnector";
import {
    createChatSession,
    getChatSession,
    addChatMessage,
    listChatMessages,
    deleteChatSession,
} from "../../dataconnect-generated/chat";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    attachmentType?: string;
    attachmentFilename?: string;
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
const MAX_TURNS = parseInt(process.env.MAX_CONVERSATION_HISTORY || "10", 10) / 2; // Convert to turns

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
        if (sessionId) {
            try {
                const result = await getChatSession(chatDataConnect, { id: sessionId });

                if (result.data.chatSession) {
                    const session = result.data.chatSession;

                    // Check if expired
                    const expiresAt = new Date(session.expiresAt);
                    if (new Date() > expiresAt) {
                        console.log(`⏰ Session ${sessionId} expired, creating new session`);
                        // Delete expired session
                        await deleteChatSession(chatDataConnect, { id: sessionId });
                    } else {
                        console.log(`✅ Loaded existing session ${sessionId}`);

                        // Get messages for this session
                        const messagesResult = await listChatMessages(chatDataConnect, { sessionId });

                        const messages: ChatMessage[] = (messagesResult.data.chatMessages || []).map((msg: any) => ({
                            role: msg.role as "user" | "assistant",
                            content: msg.content,
                            timestamp: msg.timestamp,
                            attachmentType: msg.attachmentType,
                            attachmentFilename: msg.attachmentFilename,
                        }));

                        return {
                            id: session.id,
                            userId: session.userId || undefined,
                            messages,
                            metadata: session.metadata ? JSON.parse(session.metadata) : {},
                            createdAt: new Date(session.createdAt),
                            updatedAt: new Date(session.updatedAt),
                            expiresAt,
                        };
                    }
                }
            } catch (error) {
                console.log(`⚠️ Session ${sessionId} not found, creating new session`);
            }
        }

        // Create new session (use provided sessionId if available, otherwise generate new one)
        const newSessionId = sessionId || uuidv4();
        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + SESSION_TTL_HOURS);

        await createChatSession(chatDataConnect, {
            id: newSessionId,
            userId: userId || null,
            metadata: metadata ? JSON.stringify(metadata) : null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
        });

        console.log(`🆕 Created new session ${newSessionId} (expires in ${SESSION_TTL_HOURS}h)`);

        return {
            id: newSessionId,
            userId: userId,
            messages: [],
            metadata: metadata || {},
            createdAt: now,
            updatedAt: now,
            expiresAt,
        };
    } catch (error) {
        console.error("❌ Error in getOrCreateSession:", error);
        // Re-throw the actual error for debugging
        throw error;
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
 * Note: Trimming old messages requires manual deletion (not implemented for simplicity)
 */
export const addMessageToSession = async (
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    attachmentType?: string,
    attachmentFilename?: string
): Promise<void> => {
    try {
        // Add new message
        const messageId = uuidv4();
        const timestamp = new Date().toISOString();

        await addChatMessage(chatDataConnect, {
            id: messageId,
            sessionId,
            role,
            content,
            timestamp,
            attachmentType: attachmentType || null,
            attachmentFilename: attachmentFilename || null,
        });

        const attachmentInfo = attachmentType
            ? ` (${attachmentType}: ${attachmentFilename})`
            : '';
        console.log(`💬 Added ${role} message to session ${sessionId}${attachmentInfo}`);

        // Note: For production, you'd want to implement message trimming here
        // by querying all messages, identifying old ones, and deleting them
        // For now, we'll rely on session expiration for cleanup
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
        const result = await listChatMessages(chatDataConnect, { sessionId });

        const messages: ChatMessage[] = (result.data.chatMessages || []).map((msg: any) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: msg.timestamp,
            attachmentType: msg.attachmentType,
            attachmentFilename: msg.attachmentFilename,
        }));

        // Apply trimming to keep only recent turns
        const trimmedMessages = trimToCompleteTurns(messages, MAX_TURNS);

        return trimmedMessages;
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
