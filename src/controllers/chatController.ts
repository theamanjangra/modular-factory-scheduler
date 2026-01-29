import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types/@server";
import { CustomError } from "../types/customErrorInterface";
import { validateChatRequest, ChatRequest } from "../utils/validators/chatValidator";
import { retrieveContext } from "../services/rag/retriever";
import {
  getOrCreateSession,
  addMessageToSession,
  getConversationHistory,
} from "../services/rag/session-manager-dataconnect";
import { getLLMConfig, createLLM } from "../config/llmConfig";
import { parsePDFFile, validatePDFFile } from "../services/rag/pdf-parser";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

const RETRIEVAL_TOP_K = parseInt(process.env.RETRIEVAL_TOP_K || "10", 10);

/**
 * Handle incoming chat message requests (with optional PDF upload)
 * POST /api/chat
 * Content-Type: multipart/form-data or application/json
 */
export const handleChatMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Extract file if present (multer attaches to req.file)
    const uploadedFile = req.file as Express.Multer.File | undefined;

    // 2. Parse metadata if it's a string (happens with multipart/form-data)
    const requestBody = { ...req.body };
    if (typeof requestBody.metadata === 'string') {
      try {
        requestBody.metadata = JSON.parse(requestBody.metadata);
      } catch (error) {
        console.error('Failed to parse metadata JSON:', error);
        // Leave as string, validator will catch the error
      }
    }

    // 3. Validate request body
    const validatedData = await validateChatRequest(requestBody as ChatRequest);
    const { message, sessionId, metadata } = validatedData;

    console.log(`💬 Received chat message (${message.length} chars, has file: ${!!uploadedFile})`);
    console.log(`🔑 Session ID received: ${sessionId || 'NOT PROVIDED'}`);

    // 4. Handle PDF parsing if file was uploaded
    let pdfText = "";
    let pdfFilename = "";
    let pdfTruncated = false;
    let pdfProcessingError: string | undefined;

    if (uploadedFile) {
      try {
        // Validate PDF
        validatePDFFile(uploadedFile);

        // Parse PDF
        const parsedPDF = await parsePDFFile(
          uploadedFile.buffer,
          uploadedFile.originalname
        );

        pdfText = parsedPDF.text;
        pdfFilename = uploadedFile.originalname;
        pdfTruncated = parsedPDF.truncated;

        console.log(
          `📄 PDF processed: ${pdfFilename} (${parsedPDF.originalLength} chars, truncated: ${pdfTruncated})`
        );
      } catch (pdfError: any) {
        console.error("❌ PDF processing failed:", pdfError);
        pdfProcessingError = pdfError.message;
        // Don't throw - continue with text message only (graceful degradation)
      }
    }

    // 5. Determine final message content
    // If PDF uploaded and parsed successfully: combine message + PDF text
    // If PDF failed or not present: use message only
    let userMessageContent: string;
    let attachmentType: string | undefined;
    let attachmentFilename: string | undefined;

    if (pdfText) {
      // PDF was successfully parsed - content includes extracted text with proper delimitation
      userMessageContent = `${message}

<uploaded_pdf filename="${pdfFilename}">
${pdfText}
</uploaded_pdf>`;
      attachmentType = "pdf";
      attachmentFilename = pdfFilename;
    } else {
      // No PDF or parsing failed - just use the text message
      userMessageContent = message;
    }

    console.log(`💬 Processing message (${userMessageContent.length} chars total)`);

    // 6. Get or create session
    const session = await getOrCreateSession(
      sessionId,
      metadata?.userId,
      metadata || undefined
    );

    // 7. Add user message to session (includes PDF text if present)
    await addMessageToSession(
      session.id,
      "user",
      userMessageContent,
      attachmentType,
      attachmentFilename
    );

    // 8. Retrieve relevant context from RAG
    let ragContext = "";
    let sourceDocuments: string[] = [];

    try {
      // Use the full content (including PDF text if present) for retrieval
      const retrievalResult = await retrieveContext(userMessageContent, RETRIEVAL_TOP_K);
      ragContext = retrievalResult.context;
      sourceDocuments = retrievalResult.sourceDocuments;
      console.log(`📚 Retrieved context from ${sourceDocuments.length} sources`);
    } catch (ragError) {
      console.error("⚠️ RAG retrieval failed, continuing without context:", ragError);
      // Continue without RAG context - LLM can still respond
    }

    // 9. Get conversation history and build message array
    const conversationHistory = await getConversationHistory(session.id);
    const historyMessages = conversationHistory.slice(0, -1).map(msg => {
      if (msg.role === "user") {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });

    // 10. Build system message with RAG context
    const systemMessage = new SystemMessage(`You are a helpful HR assistant. You may use the attached context from HR policy documents to answer the user's question accurately. 

The context is provided in XML-delimited chunks below. Each chunk comes from a specific source document and contains relevant information extracted from the HR knowledge base.

${ragContext || "No relevant context available."}

If the user's message includes an <uploaded_pdf> tag, they have uploaded a PDF document for you to analyze along with their question.

Please provide a clear, helpful, brief answer based on the context above.

IMPORTANT: Do NOT offer to provide information you're not sure you can provide. Please remember you cannot directly access the web.`);

    // 11. Build message array for LLM
    const messages = [
      systemMessage,
      ...historyMessages,
      new HumanMessage(userMessageContent)
    ];

    console.log(`📝 Built message array: 1 system + ${historyMessages.length} history + 1 user = ${messages.length} total messages`);

    // 12. Invoke LLM
    let aiResponse = "";
    let llmModel = "";
    let llmProvider = "";

    try {
      const llmConfig = getLLMConfig();
      const llm = createLLM(llmConfig);

      llmModel = llmConfig.model;
      llmProvider = llmConfig.provider;

      console.log(`🤖 Invoking LLM (${llmProvider}/${llmModel}) with ${messages.length} messages...`);

      const response = await llm.invoke(messages);
      aiResponse = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      console.log(`✅ LLM response generated (${aiResponse.length} chars)`);
    } catch (llmError) {
      console.error("❌ LLM invocation failed:", llmError);
      const error: CustomError = new Error(
        "Failed to generate AI response. Please try again."
      );
      error.status = 500;
      throw error;
    }

    // 13. Add AI response to session
    await addMessageToSession(session.id, "assistant", aiResponse);

    // 14. Return response with PDF metadata
    const apiResponse: ApiResponse = {
      success: true,
      message: "Chat response generated successfully",
      data: {
        response: aiResponse,
        sessionId: session.id,
        metadata: {
          sourceDocuments,
          model: llmModel,
          provider: llmProvider,
          pdfProcessed: !!pdfText,
          pdfFilename: pdfFilename || undefined,
          pdfTruncated: pdfTruncated || undefined,
          pdfProcessingError: pdfProcessingError || undefined,
        },
      },
    };

    res.status(200).json(apiResponse);
  } catch (error) {
    // Check if it's a validation error
    if (error instanceof Error && error.message.includes("Message")) {
      const validationError: CustomError = new Error(error.message);
      validationError.status = 400;
      next(validationError);
    } else {
      next(error);
    }
  }
};

/**
 * Get chat history for a session
 * GET /api/chat/history/:sessionId
 */
export const getChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      const error: CustomError = new Error("Session ID is required");
      error.status = 400;
      throw error;
    }

    console.log(`📜 Fetching chat history for session: ${sessionId}`);

    // Get conversation history from session manager
    const messages = await getConversationHistory(sessionId as string);

    const apiResponse: ApiResponse = {
      success: true,
      message: "Chat history retrieved successfully",
      data: {
        sessionId,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          attachmentType: msg.attachmentType,
          attachmentFilename: msg.attachmentFilename,
        })),
      },
    };

    res.status(200).json(apiResponse);
  } catch (error) {
    console.error("❌ Error fetching chat history:", error);
    next(error);
  }
};
