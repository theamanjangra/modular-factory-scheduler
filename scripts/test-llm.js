"use strict";
/**
 * LLM Provider Test Script
 *
 * This script tests the LLM configuration and provider factory.
 * Run with: npx ts-node scripts/test-llm.ts
 *
 * Make sure to set the required environment variables before running:
 * - LLM_PROVIDER (openai | anthropic | gemini)
 * - Corresponding API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY)
 * - Optional: LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS
 */
Object.defineProperty(exports, "__esModule", { value: true });
const llmConfig_1 = require("../src/config/llmConfig");
const openai_1 = require("@langchain/openai");
const anthropic_1 = require("@langchain/anthropic");
const google_genai_1 = require("@langchain/google-genai");
console.log("🧪 LLM Provider Configuration Test\n");
console.log("=" + "=".repeat(60) + "\n");
// Test 1: Get LLM Configuration
console.log("Test 1: getLLMConfig()");
console.log("-".repeat(60));
try {
    const config = (0, llmConfig_1.getLLMConfig)();
    console.log("✅ Configuration loaded successfully:");
    console.log(`   Provider: ${config.provider}`);
    console.log(`   Model: ${config.model}`);
    console.log(`   Temperature: ${config.temperature}`);
    console.log(`   Max Tokens: ${config.maxTokens}`);
    console.log("");
}
catch (error) {
    console.error("❌ Failed to get configuration:", error.message);
    process.exit(1);
}
// Test 2: Create LLM instance
console.log("Test 2: createLLM()");
console.log("-".repeat(60));
try {
    const config = (0, llmConfig_1.getLLMConfig)();
    const llm = (0, llmConfig_1.createLLM)(config);
    // Verify instance type based on provider
    let expectedType;
    let isCorrectType;
    switch (config.provider) {
        case "openai":
            expectedType = "ChatOpenAI";
            isCorrectType = llm instanceof openai_1.ChatOpenAI;
            break;
        case "anthropic":
            expectedType = "ChatAnthropic";
            isCorrectType = llm instanceof anthropic_1.ChatAnthropic;
            break;
        case "gemini":
            expectedType = "ChatGoogleGenerativeAI";
            isCorrectType = llm instanceof google_genai_1.ChatGoogleGenerativeAI;
            break;
        default:
            throw new Error(`Unknown provider: ${config.provider}`);
    }
    if (isCorrectType) {
        console.log(`✅ LLM instance created successfully: ${expectedType}`);
    }
    else {
        console.error(`❌ Instance type mismatch. Expected ${expectedType}`);
        process.exit(1);
    }
    console.log("");
}
catch (error) {
    console.error("❌ Failed to create LLM instance:", error.message);
    console.log("");
    console.log("Common issues:");
    console.log("  - Missing API key for the selected provider");
    console.log("  - Invalid provider value (must be: openai, anthropic, or gemini)");
    console.log("");
    process.exit(1);
}
// Test 3: Error Handling - Missing API Key
console.log("Test 3: Error Handling - Missing API Key");
console.log("-".repeat(60));
const testProviders = ["openai", "anthropic", "gemini"];
const apiKeyVars = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GOOGLE_API_KEY,
};
testProviders.forEach((provider) => {
    const hasKey = !!apiKeyVars[provider];
    if (!hasKey) {
        try {
            (0, llmConfig_1.createLLM)({
                provider,
                model: "test-model",
                temperature: 0.7,
                maxTokens: 1500,
            });
            console.log(`❌ ${provider}: Should have thrown error for missing API key`);
        }
        catch (error) {
            console.log(`✅ ${provider}: Correctly throws error when API key missing`);
        }
    }
    else {
        console.log(`ℹ️  ${provider}: Skipping (API key is set)`);
    }
});
console.log("");
// Test 4: Error Handling - Unsupported Provider
console.log("Test 4: Error Handling - Unsupported Provider");
console.log("-".repeat(60));
try {
    (0, llmConfig_1.createLLM)({
        provider: "invalid-provider",
        model: "test-model",
        temperature: 0.7,
        maxTokens: 1500,
    });
    console.log("❌ Should have thrown error for unsupported provider");
    process.exit(1);
}
catch (error) {
    if (error.message.includes("Unsupported LLM provider")) {
        console.log("✅ Correctly throws error for unsupported provider");
    }
    else {
        console.error("❌ Unexpected error:", error.message);
        process.exit(1);
    }
}
console.log("");
// Test 5: Simple invocation test (optional - requires API key)
console.log("Test 5: Simple Invocation Test (Optional)");
console.log("-".repeat(60));
const shouldRunInvocationTest = process.argv.includes("--invoke");
if (shouldRunInvocationTest) {
    (async () => {
        try {
            const config = (0, llmConfig_1.getLLMConfig)();
            const llm = (0, llmConfig_1.createLLM)(config);
            console.log("Sending test message to LLM...");
            const response = await llm.invoke("Say 'Hello, World!' in one word.");
            const responseText = typeof response.content === "string"
                ? response.content
                : Array.isArray(response.content)
                    ? response.content[0]?.text || "No response"
                    : "No response";
            console.log(`✅ LLM Response: ${responseText}`);
            console.log("");
            console.log("=" + "=".repeat(60));
            console.log("✅ All tests passed!");
            console.log("=" + "=".repeat(60));
        }
        catch (error) {
            console.error("❌ Invocation test failed:", error.message);
            process.exit(1);
        }
    })();
}
else {
    console.log("ℹ️  Skipped (use --invoke flag to test actual LLM calls)");
    console.log("");
    console.log("=" + "=".repeat(60));
    console.log("✅ All configuration tests passed!");
    console.log("=" + "=".repeat(60));
    console.log("");
    console.log("To test actual LLM invocation, run:");
    console.log("  npx ts-node scripts/test-llm.ts --invoke");
}
