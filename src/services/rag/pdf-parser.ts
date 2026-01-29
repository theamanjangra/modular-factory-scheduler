/**
 * PDF PARSING SERVICE
 * Uses LLAMA Parse to extract text from uploaded PDF files
 */

import { LlamaParse } from "llama-parse";

const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY;
const MAX_PDF_TEXT_LENGTH = 100000; // 100k chars (~25k tokens) - supports larger context models

export interface ParsedPDF {
  text: string;
  truncated: boolean;
  originalLength: number;
}

/**
 * Parse PDF file using LLAMA Parse and extract text
 * Returns extracted text with truncation info
 */
export const parsePDFFile = async (
  fileBuffer: Buffer,
  filename: string
): Promise<ParsedPDF> => {
  if (!LLAMA_CLOUD_API_KEY) {
    throw new Error("LLAMA_CLOUD_API_KEY is not configured");
  }

  console.log(`📄 Parsing PDF: ${filename} (${fileBuffer.length} bytes)`);

  try {
    // Initialize LlamaParse with markdown output for table preservation
    const parser = new LlamaParse({
      apiKey: LLAMA_CLOUD_API_KEY,
      resultType: "markdown",
    } as any);

    // Convert buffer to Blob (same pattern as ingest-documents.ts)
    const uint8Array = new Uint8Array(fileBuffer);
    const fileBlob = new Blob([uint8Array], { type: "application/pdf" });

    // Parse PDF
    const result = await parser.parseFile(fileBlob);
    const fullText = result.markdown;

    console.log(`✅ PDF parsed: ${fullText.length} characters extracted`);

    // Truncate if too long (to prevent LLM token overflow)
    let text = fullText;
    let truncated = false;

    if (fullText.length > MAX_PDF_TEXT_LENGTH) {
      text = fullText.substring(0, MAX_PDF_TEXT_LENGTH);
      truncated = true;
      console.log(
        `⚠️ PDF text truncated from ${fullText.length} to ${MAX_PDF_TEXT_LENGTH} chars`
      );
    }

    return {
      text,
      truncated,
      originalLength: fullText.length,
    };
  } catch (error: any) {
    console.error(`❌ PDF parsing failed for ${filename}:`, error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

/**
 * Validate PDF file before parsing
 */
export const validatePDFFile = (file: Express.Multer.File): void => {
  // Check MIME type
  if (file.mimetype !== "application/pdf") {
    throw new Error(
      `Invalid file type: ${file.mimetype}. Only PDF files are supported.`
    );
  }

  // Check file size (10MB already enforced by multer, but double-check)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error(
      `File too large: ${file.size} bytes. Maximum size is 10MB.`
    );
  }

  // Check for empty files
  if (file.size === 0) {
    throw new Error("File is empty");
  }

  console.log(
    `✅ PDF validation passed: ${file.originalname} (${file.size} bytes)`
  );
};
