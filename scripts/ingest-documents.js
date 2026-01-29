"use strict";
/**
 * HR Policy Document Ingestion Script
 *
 * This script ingests PDF documents from data/hr-docs/ into Pinecone vector database
 * for use in the RAG (Retrieval-Augmented Generation) pipeline.
 *
 * Features:
 * - Idempotent: Only processes new or changed files
 * - Hash-based change detection
 * - Automatic chunk deletion for updated files
 * - CLI flags: --force (re-ingest all), --reset (clear index)
 *
 * Usage:
 *   npm run ingest-docs           # Smart ingestion
 *   npm run ingest-docs:force     # Force re-ingest all
 *   npm run ingest-docs:reset     # Clear index first
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const pinecone_1 = require("@pinecone-database/pinecone");
const pinecone_2 = require("@langchain/pinecone");
const openai_1 = require("@langchain/openai");
const llama_parse_1 = require("llama-parse");
const textsplitters_1 = require("@langchain/textsplitters");
const documents_1 = require("@langchain/core/documents");
// Load environment variables
dotenv_1.default.config();
// Configuration from environment
const DOCS_DIR = path_1.default.join(__dirname, "../data/hr-docs");
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-large";
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "6000", 10);
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "750", 10);
/**
 * Calculate SHA-256 hash of file content for change detection
 */
const calculateFileHash = async (filepath) => {
    const content = await promises_1.default.readFile(filepath);
    return crypto_1.default.createHash("sha256").update(content).digest("hex");
};
/**
 * Check if document already exists in Pinecone by filename
 * Returns existence status and stored hash if found
 */
const checkIfDocumentExists = async (pinecone, indexName, filename) => {
    try {
        const index = pinecone.Index(indexName);
        // Query with metadata filter to find any chunk with this filename
        // Using a dummy vector since we only care about metadata
        const result = await index.query({
            vector: new Array(3072).fill(0),
            topK: 1,
            filter: { filename: { $eq: filename } },
            includeMetadata: true,
        });
        if (result.matches && result.matches.length > 0) {
            const hash = result.matches[0].metadata?.content_hash;
            return { exists: true, hash };
        }
        return { exists: false };
    }
    catch (error) {
        console.error(`  ⚠️  Error checking document existence: ${error}`);
        return { exists: false };
    }
};
/**
 * Delete all chunks for a specific document from Pinecone
 */
const deleteDocumentChunks = async (pinecone, indexName, filename) => {
    const index = pinecone.Index(indexName);
    console.log(`  🗑️  Deleting old chunks for: ${filename}`);
    await index.deleteMany({
        filter: { filename: { $eq: filename } },
    });
};
/**
 * Ingest a single PDF document into Pinecone
 */
const ingestDocument = async (filepath, pinecone, embeddings, options = {}) => {
    const filename = path_1.default.basename(filepath);
    const fileHash = await calculateFileHash(filepath);
    console.log(`\n📄 Processing: ${filename}`);
    // Check if already ingested (unless --force)
    if (!options.force) {
        const { exists, hash } = await checkIfDocumentExists(pinecone, PINECONE_INDEX_NAME, filename);
        if (exists && hash === fileHash) {
            console.log(`  ✓ Already up-to-date (skipping)`);
            return { status: "skipped", filename };
        }
        if (exists && hash !== fileHash) {
            console.log(`  ⚠️  Content changed, replacing...`);
            await deleteDocumentChunks(pinecone, PINECONE_INDEX_NAME, filename);
        }
    }
    try {
        // Load PDF with LlamaParse
        console.log(`  📖 Loading PDF with LlamaParse...`);
        const parser = new llama_parse_1.LlamaParse({
            apiKey: LLAMA_CLOUD_API_KEY,
            resultType: "markdown", // CRITICAL: Preserves table structure
        }); // Type assertion needed - llama-parse types may be incomplete
        // Read file and create Blob for llama-parse
        const fileBuffer = await promises_1.default.readFile(filepath);
        const uint8Array = new Uint8Array(fileBuffer);
        const fileBlob = new Blob([uint8Array], { type: "application/pdf" });
        // Parse the PDF file (returns markdown with preserved table structure)
        const result = await parser.parseFile(fileBlob);
        const fullText = result.markdown;
        // Convert to LangChain Document format for splitting
        const doc = new documents_1.Document({
            pageContent: fullText,
            metadata: { source: filepath },
        });
        // Split into chunks (using Markdown-aware splitter for better table preservation)
        console.log(`  ✂️  Splitting into chunks (Markdown-aware)...`);
        const textSplitter = new textsplitters_1.MarkdownTextSplitter({
            chunkSize: CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP,
        });
        const splitDocs = await textSplitter.splitDocuments([doc]);
        // Add metadata to each chunk
        const docsWithMetadata = splitDocs.map((doc, index) => ({
            ...doc,
            metadata: {
                ...doc.metadata,
                filename,
                content_hash: fileHash,
                chunk_index: index,
                total_chunks: splitDocs.length,
                ingested_at: new Date().toISOString(),
            },
        }));
        // Upload to Pinecone
        console.log(`  ⬆️  Uploading ${splitDocs.length} chunks to Pinecone...`);
        const index = pinecone.Index(PINECONE_INDEX_NAME);
        await pinecone_2.PineconeStore.fromDocuments(docsWithMetadata, embeddings, {
            pineconeIndex: index,
            namespace: "hr-docs",
        });
        console.log(`  ✅ Ingested ${splitDocs.length} chunks`);
        return { status: "ingested", filename, chunks: splitDocs.length };
    }
    catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        return { status: "error", filename, error };
    }
};
/**
 * Main ingestion function
 */
const main = async () => {
    console.log("🚀 Starting document ingestion...\n");
    // Validate environment variables
    if (!PINECONE_API_KEY) {
        console.error("❌ Error: PINECONE_API_KEY is not defined in .env");
        process.exit(1);
    }
    if (!PINECONE_INDEX_NAME) {
        console.error("❌ Error: PINECONE_INDEX_NAME is not defined in .env");
        process.exit(1);
    }
    if (!OPENAI_API_KEY) {
        console.error("❌ Error: OPENAI_API_KEY is not defined in .env");
        process.exit(1);
    }
    if (!LLAMA_CLOUD_API_KEY) {
        console.error("❌ Error: LLAMA_CLOUD_API_KEY is not defined in .env");
        console.error("   Get your API key at https://cloud.llamaindex.ai/");
        process.exit(1);
    }
    // Parse CLI arguments
    const args = process.argv.slice(2);
    const options = {
        force: args.includes("--force"),
        reset: args.includes("--reset"),
    };
    console.log(`Configuration:`);
    console.log(`  • Docs directory: ${DOCS_DIR}`);
    console.log(`  • Pinecone index: ${PINECONE_INDEX_NAME}`);
    console.log(`  • Embedding model: ${EMBEDDING_MODEL}`);
    console.log(`  • Chunk size: ${CHUNK_SIZE} chars`);
    console.log(`  • Chunk overlap: ${CHUNK_OVERLAP} chars`);
    console.log(`  • Options: ${JSON.stringify(options)}`);
    console.log();
    // Initialize Pinecone
    const pinecone = new pinecone_1.Pinecone({ apiKey: PINECONE_API_KEY });
    const embeddings = new openai_1.OpenAIEmbeddings({
        modelName: EMBEDDING_MODEL,
        openAIApiKey: OPENAI_API_KEY,
    });
    // Check if index exists, create if it doesn't
    console.log(`Checking if index "${PINECONE_INDEX_NAME}" exists...`);
    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some((idx) => idx.name === PINECONE_INDEX_NAME);
    if (!indexExists) {
        console.log(`⚠️  Index "${PINECONE_INDEX_NAME}" not found. Creating...`);
        // Determine dimensions based on embedding model
        const dimensions = EMBEDDING_MODEL.includes("3-large") ? 3072 : 1536;
        await pinecone.createIndex({
            name: PINECONE_INDEX_NAME,
            dimension: dimensions,
            metric: "cosine",
            spec: {
                serverless: {
                    cloud: "aws",
                    region: "us-east-1",
                },
            },
        });
        console.log(`✅ Index "${PINECONE_INDEX_NAME}" created successfully!`);
        console.log(`   Dimensions: ${dimensions}, Metric: cosine`);
        console.log(`   Waiting for index to be ready...`);
        // Wait for index to be ready
        let ready = false;
        while (!ready) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const indexDescription = await pinecone.describeIndex(PINECONE_INDEX_NAME);
            ready = indexDescription.status?.ready || false;
        }
        console.log(`✅ Index is ready!\n`);
    }
    else {
        console.log(`✅ Index "${PINECONE_INDEX_NAME}" already exists.\n`);
    }
    // Reset index if requested
    if (options.reset) {
        console.log("⚠️  Resetting Pinecone index...");
        const index = pinecone.Index(PINECONE_INDEX_NAME);
        await index.deleteAll();
        console.log("✅ Index cleared\n");
    }
    // Get all PDF files
    let files;
    try {
        const allFiles = await promises_1.default.readdir(DOCS_DIR);
        files = allFiles.filter((f) => f.endsWith(".pdf"));
    }
    catch (error) {
        console.error(`❌ Error reading docs directory: ${error.message}`);
        console.log(`\nMake sure the directory exists: ${DOCS_DIR}`);
        process.exit(1);
    }
    if (files.length === 0) {
        console.log(`⚠️  No PDF files found in ${DOCS_DIR}`);
        console.log(`\nAdd PDF files to the directory and run again.`);
        process.exit(0);
    }
    console.log(`Found ${files.length} PDF file(s)\n`);
    // Process each file
    const results = [];
    for (const file of files) {
        const filepath = path_1.default.join(DOCS_DIR, file);
        try {
            const result = await ingestDocument(filepath, pinecone, embeddings, options);
            results.push(result);
        }
        catch (error) {
            console.error(`  ❌ Error ingesting ${file}: ${error.message}`);
            results.push({ status: "error", filename: file, error });
        }
    }
    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Ingestion Summary:");
    console.log("=".repeat(60));
    console.log(`Total files: ${files.length}`);
    console.log(`Ingested: ${results.filter((r) => r.status === "ingested").length}`);
    console.log(`Skipped: ${results.filter((r) => r.status === "skipped").length}`);
    console.log(`Errors: ${results.filter((r) => r.status === "error").length}`);
    const totalChunks = results
        .filter((r) => r.status === "ingested")
        .reduce((sum, r) => sum + (r.chunks || 0), 0);
    if (totalChunks > 0) {
        console.log(`Total chunks uploaded: ${totalChunks}`);
    }
    console.log("=".repeat(60));
    // Exit with error code if there were errors
    const hasErrors = results.some((r) => r.status === "error");
    if (hasErrors) {
        console.log("\n⚠️  Some files failed to ingest. See errors above.");
        process.exit(1);
    }
    console.log("\n✅ Document ingestion completed successfully!");
};
// Run main function
main().catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
});
