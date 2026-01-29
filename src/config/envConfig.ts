import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

// Required environment variables
// Required environment variables (Critical for Server)
if (!process.env.PORT) {
  console.warn("PORT is not defined, defaulting to 8080");
}

// Optional/Lazy Loaded variables (Warn but don't crash)
const checkEnv = (key: string) => {
  if (!process.env[key]) {
    console.warn(`[Config] Missing optional env: ${key}`);
    return "";
  }
  return process.env[key];
};

export const ENV = {
  // Server configuration
  PORT: process.env.PORT || "8080",
  HOST: process.env.HOST || "0.0.0.0",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  ORIGINS: process.env.ORIGINS?.split(',').map(origin => origin.trim()) || [],
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database configuration
  DATABASE_URL: checkEnv("DATABASE_URL"),

  // Firebase Admin SDK configuration
  FIREBASE: {
    type: "service_account",
    project_id: checkEnv("FIREBASE_PROJECT_ID"),
    private_key_id: checkEnv("FIREBASE_PRIVATE_KEY_ID"),
    private_key: checkEnv("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
    client_email: checkEnv("FIREBASE_CLIENT_EMAIL"),
    client_id: checkEnv("FIREBASE_CLIENT_ID"),
    auth_uri: checkEnv("FIREBASE_AUTH_URI"),
    token_uri: checkEnv("FIREBASE_TOKEN_URI"),
    auth_provider_x509_cert_url: checkEnv("FIREBASE_AUTH_PROVIDER_CERT_URL"),
    client_x509_cert_url: checkEnv("FIREBASE_CLIENT_CERT_URL"),
    universe_domain: checkEnv("FIREBASE_UNIVERSE_DOMAIN"),
  },

  // Firebase Data Connect configuration
  DATACONNECT: {
    region: checkEnv("FIREBASE_REGION") || checkEnv("DATA_CONNECT_LOCATION"),
    connectionId: checkEnv("FIREBASE_DATACONNECT_CONNECTION_ID") || checkEnv("DATA_CONNECT_CONNECTION_ID"),
  },

  // LLM Configuration
  LLM_PROVIDER: checkEnv("LLM_PROVIDER"),
  OPENAI_API_KEY: checkEnv("OPENAI_API_KEY"),
  ANTHROPIC_API_KEY: checkEnv("ANTHROPIC_API_KEY"),
  GOOGLE_API_KEY: checkEnv("GOOGLE_API_KEY"),
  LLM_MODEL: checkEnv("LLM_MODEL"),
  LLM_TEMPERATURE: checkEnv("LLM_TEMPERATURE"),
  LLM_MAX_TOKENS: checkEnv("LLM_MAX_TOKENS")
};
