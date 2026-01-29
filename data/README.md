# HR Documents Directory

This directory contains HR policy PDF documents that are ingested into the Pinecone vector database for the AI chat assistant's RAG (Retrieval-Augmented Generation) pipeline.

## Adding Documents

1. **Place PDF files in this directory:**
   ```bash
   cp /path/to/employee-handbook.pdf data/hr-docs/
   cp /path/to/benefits-guide.pdf data/hr-docs/
   cp /path/to/pto-policy.pdf data/hr-docs/
   ```

2. **Run the ingestion script:**
   ```bash
   npm run ingest-docs
   ```

3. **Verify ingestion:**
   - Check the console output for ingestion summary
   - Log into Pinecone console to verify chunks are stored

## Updating Documents

When you update an existing PDF file:

1. **Replace the PDF file** (keep the same filename):
   ```bash
   cp /path/to/updated-employee-handbook.pdf data/hr-docs/employee-handbook.pdf
   ```

2. **Run ingestion** (the script will detect the change automatically):
   ```bash
   npm run ingest-docs
   ```

The ingestion script uses file hash comparison to detect changes. If the content has changed, it will:
- Delete all old chunks for that document
- Re-process the updated PDF
- Upload new chunks to Pinecone

## Script Commands

| Command | Description |
|---------|-------------|
| `npm run ingest-docs` | Smart ingestion - only processes new or changed files |
| `npm run ingest-docs:force` | Force re-ingest all files, ignoring change detection |
| `npm run ingest-docs:reset` | Clear the entire Pinecone index before ingesting |

## Document Processing

Each PDF is processed as follows:

1. **Hash Calculation** - SHA-256 hash computed for change detection
2. **PDF Loading** - Parsed using **LlamaParse** with Markdown output
   - Preserves table structure and spatial layout
   - Critical for benefit tables, rate cards, and formatted content
   - Converts tables to Markdown format for LLM comprehension
3. **Chunking** - Text split into 1000-character chunks with 200-character overlap
4. **Metadata** - Each chunk includes:
   - `filename` - Original PDF filename
   - `content_hash` - SHA-256 hash of the file
   - `chunk_index` - Position in the document (0, 1, 2, ...)
   - `total_chunks` - Total number of chunks for this document
   - `ingested_at` - Timestamp (ISO 8601)
5. **Embedding** - OpenAI text-embedding-3-large generates 3072-dimension vectors
6. **Upload** - Stored in Pinecone namespace: `hr-docs`

## Supported File Types

- **PDF** (.pdf) - Only file type currently supported
- Future: Word documents, plain text, markdown (not implemented)

## Troubleshooting

### Issue: "Cannot find PDF files"
- Ensure PDF files have `.pdf` extension (case-sensitive)
- Check that files are directly in `data/hr-docs/` (not in subdirectories)

### Issue: "PINECONE_API_KEY is not defined"
- Verify `.env` file has `PINECONE_API_KEY` set
- Check Pinecone console for valid API key

### Issue: "Index not found"
- Create Pinecone index manually:
  - Name: `hr-assistant` (or value of `PINECONE_INDEX_NAME`)
  - Dimensions: 3072
  - Metric: cosine
  - Pod type: p1 (free tier) or s1 (production)

### Issue: "Embedding API error"
- Verify `OPENAI_API_KEY` is set in `.env`
- Check OpenAI account has sufficient credits
- Ensure embedding model `text-embedding-3-large` is available

### Issue: "LLAMA_CLOUD_API_KEY is not defined"
- Verify `LLAMA_CLOUD_API_KEY` is set in `.env`
- Get your free API key at https://cloud.llamaindex.ai/
- LlamaParse is required for PDF parsing with table preservation

## Example Workflow

```bash
# 1. Add your HR policy PDFs
cp ~/Downloads/employee-handbook.pdf data/hr-docs/
cp ~/Downloads/benefits-2025.pdf data/hr-docs/
cp ~/Downloads/pto-policy.pdf data/hr-docs/

# 2. Run ingestion
npm run ingest-docs

# Expected output:
# 🚀 Starting document ingestion...
#
# Processing: employee-handbook.pdf
#   Loading PDF...
#   Splitting into chunks...
#   Uploading 45 chunks to Pinecone...
#   ✓ Ingested 45 chunks
#
# Processing: benefits-2025.pdf
#   Loading PDF...
#   Splitting into chunks...
#   Uploading 23 chunks to Pinecone...
#   ✓ Ingested 23 chunks
#
# ============================================================
# 📊 Ingestion Summary:
# ============================================================
# Total files: 3
# Ingested: 3
# Skipped: 0
# Errors: 0
# ============================================================

# 3. Update a file later
cp ~/Downloads/employee-handbook-v2.pdf data/hr-docs/employee-handbook.pdf
npm run ingest-docs

# Expected output:
# Processing: employee-handbook.pdf
#   ⚠ Content changed, replacing...
#   Deleting old chunks for: employee-handbook.pdf
#   ...
#   ✓ Ingested 48 chunks
#
# Processing: benefits-2025.pdf
#   ✓ Already up-to-date (skipping)
```

## Notes

- **Idempotency:** Running the script multiple times with unchanged files will skip re-ingestion
- **Change Detection:** File hash comparison ensures only modified files are re-processed
- **Namespace:** All chunks are stored in the `hr-docs` namespace for organization
- **Cleanup:** Old chunks are automatically deleted when a file is updated
- **Performance:** Embedding generation may take 1-2 minutes for large documents

## Security Considerations

- Do not commit PDF files to git (already in .gitignore)
- Ensure PDFs do not contain sensitive employee data beyond policies
- Rotate API keys periodically
- Use separate Pinecone indexes for dev/staging/production

---

**Need Help?** See the main project README or architecture documentation for more details.
