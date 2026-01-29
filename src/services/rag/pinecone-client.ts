import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

let pineconeClient: Pinecone | null = null;
let vectorStore: PineconeStore | null = null;

export const initializePinecone = async (): Promise<Pinecone> => {
  if (pineconeClient) return pineconeClient;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is not defined in environment variables");
  }

  pineconeClient = new Pinecone({
    apiKey,
  });

  console.log("✅ Pinecone client initialized");
  return pineconeClient;
};

export const getVectorStore = async (): Promise<PineconeStore> => {
  if (vectorStore) return vectorStore;

  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) {
    throw new Error("PINECONE_INDEX_NAME is not defined in environment variables");
  }

  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) {
    throw new Error("OPENAI_API_KEY is not defined in environment variables");
  }

  const pinecone = await initializePinecone();
  const index = pinecone.Index(indexName);

  const embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-large";
  const embeddings = new OpenAIEmbeddings({
    modelName: embeddingModel,
    openAIApiKey: openAIKey,
  });

  vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: "hr-docs",
  });

  console.log(`✅ Vector store initialized (index: ${indexName}, namespace: hr-docs)`);
  return vectorStore;
};
