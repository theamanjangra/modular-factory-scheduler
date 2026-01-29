import { getVectorStore } from "./pinecone-client";

export interface RetrievalResult {
  context: string;
  sourceDocuments: string[];
}

/**
 * Retrieve relevant context from Pinecone vector store based on user query
 * @param query - User's question or message
 * @param topK - Number of relevant chunks to retrieve (default: 5)
 * @returns Context string and source document metadata
 */
export const retrieveContext = async (
  query: string,
  topK: number = 10
): Promise<RetrievalResult> => {
  try {
    const vectorStore = await getVectorStore();

    // Perform similarity search in Pinecone
    const relevantDocs = await vectorStore.similaritySearch(query, topK);

    // Build context string from retrieved chunks with proper XML delimitation
    const chunks = relevantDocs
      .map((doc: any, index: number) => {
        const chunkNumber = index + 1;
        const source = doc.metadata?.filename || 'Unknown';
        return `<chunk_${chunkNumber} source="${source}">
${doc.pageContent}
</chunk_${chunkNumber}>`;
      })
      .join('\n\n');

    const context = `<context_from_documents>

${chunks}

</context_from_documents>`;

    // Extract unique source filenames from metadata
    const sourceDocuments = Array.from(
      new Set(
        relevantDocs
          .map((doc: any) => doc.metadata?.filename as string)
          .filter(Boolean)
      )
    ) as string[];

    console.log(`📄 Retrieved ${relevantDocs.length} chunks from ${sourceDocuments.length} sources`);

    return {
      context,
      sourceDocuments,
    };
  } catch (error) {
    console.error('❌ Error retrieving context from Pinecone:', error);
    throw new Error('Failed to retrieve context from knowledge base');
  }
};
