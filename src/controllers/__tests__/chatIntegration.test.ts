import request from 'supertest';
import express from 'express';
import { chatRoutes } from '../../routes/chatRoutes';
import * as retriever from '../../services/rag/retriever';
import * as llmConfig from '../../config/llmConfig';

// Mock Middleware
jest.mock('../../middlewares/authMiddleware', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { uid: 'test-user' };
        next();
    }
}));
jest.mock('../../middlewares/rateLimiter', () => ({
    apiLimiter: (req: any, res: any, next: any) => next()
}));

// Mock External Services (RAG/LLM)
jest.mock('../../services/rag/retriever');
jest.mock('../../config/llmConfig');
jest.mock('../../services/rag/session-manager-dataconnect', () => ({
    getOrCreateSession: jest.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        messages: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000)
    }),
    addMessageToSession: jest.fn().mockResolvedValue(undefined),
    getConversationHistory: jest.fn().mockResolvedValue([
        { role: 'user', content: 'Hello', timestamp: new Date().toISOString() }
    ])
}));

const app = express();
app.use(express.json());
app.use('/api/chat', chatRoutes);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.status || 500).json({ error: err.message });
});

describe('Chat Integration (In-Memory)', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup RAG/LLM mocks
        (retriever.retrieveContext as jest.Mock).mockResolvedValue({
            context: 'Mock context',
            sourceDocuments: ['doc1.pdf']
        });

        const mockLLM = {
            invoke: jest.fn().mockResolvedValue({ content: 'AI Response' })
        };
        (llmConfig.getLLMConfig as jest.Mock).mockReturnValue({ model: 'gpt-4', provider: 'openai' });
        (llmConfig.createLLM as jest.Mock).mockReturnValue(mockLLM);
    });

    it('should create a session and return response', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: 'Hello' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.sessionId).toBeDefined();
        expect(res.body.data.response).toBe('AI Response');

        // Store sessionId for next test
        const sessionId = res.body.data.sessionId;

        // Follow-up request with same session
        const res2 = await request(app)
            .post('/api/chat')
            .send({ message: 'Follow up', sessionId });

        if (res2.status !== 200) {
            console.error('Test failed with status:', res2.status, 'Body:', JSON.stringify(res2.body, null, 2));
        }
        expect(res2.status).toBe(200);
        expect(res2.body.data.sessionId).toBe(sessionId);
    });
});
