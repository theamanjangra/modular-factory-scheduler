import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ENV } from "./envConfig";

export type LLMProvider = "openai" | "anthropic" | "gemini";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}

export const getLLMConfig = (): LLMConfig => {
  const provider = (ENV.LLM_PROVIDER as LLMProvider) || "openai";
  const model = ENV.LLM_MODEL || "gpt-5-mini";
  const temperature = parseFloat(ENV.LLM_TEMPERATURE || "1");
  const maxTokens = parseInt(ENV.LLM_MAX_TOKENS || "1500", 10);

  return {
    provider,
    model,
    temperature,
    maxTokens,
  };
};

export const createLLM = (config: LLMConfig) => {
  switch (config.provider) {
    case "openai":
      if (!ENV.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER is 'openai'");
      }
      return new ChatOpenAI({
        modelName: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        openAIApiKey: ENV.OPENAI_API_KEY,
      });

    case "anthropic":
      if (!ENV.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER is 'anthropic'");
      }
      return new ChatAnthropic({
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        anthropicApiKey: ENV.ANTHROPIC_API_KEY,
      });

    case "gemini":
      if (!ENV.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY is required when LLM_PROVIDER is 'gemini'");
      }
      return new ChatGoogleGenerativeAI({
        model: config.model,
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        apiKey: ENV.GOOGLE_API_KEY,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
};
