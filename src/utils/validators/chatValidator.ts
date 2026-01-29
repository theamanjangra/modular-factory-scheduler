import * as yup from 'yup';

export interface ChatRequest {
  message: string;
  sessionId?: string;
  fileRefs?: string[];
  metadata?: {
    userId?: string;
    source?: "web" | "mobile";
    [key: string]: any;
  };
}

export const chatRequestSchema = yup.object().shape({
  message: yup
    .string()
    .min(1, 'Message must not be empty')
    .max(5000, 'Message must be less than 5000 characters')
    .required('Message is required'),
  sessionId: yup
    .string()
    .uuid('Session ID must be a valid UUID')
    .optional(),
  fileRefs: yup
    .array()
    .of(yup.string())
    .optional(),
  metadata: yup
    .object()
    .optional(),
});

export const validateChatRequest = async (data: ChatRequest): Promise<ChatRequest> => {
  try {
    const validated = await chatRequestSchema.validate(data, { abortEarly: false });
    return validated as ChatRequest;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      throw new Error(error.errors.join(', '));
    }
    throw error;
  }
};
