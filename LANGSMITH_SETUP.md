# LangSmith Observability Setup (Convex-Compatible)

This document describes the LangSmith observability implementation for the RAG application, designed to work with Convex's runtime constraints.

## Prerequisites

1. **Install Dependencies** (run from project root):
   ```bash
   npm install langsmith @vercel/otel
   ```

2. **Set Environment Variables**:
   ```bash
   export LANGSMITH_TRACING=true
   export LANGSMITH_API_KEY=your_langsmith_api_key_here
   export LANGSMITH_PROJECT=documents-rag-app  # Optional, defaults to "default"
   export NEXT_PUBLIC_SITE_URL=http://localhost:3000  # For development
   ```

   Or add to your `.env.local` file:
   ```
   LANGSMITH_TRACING=true
   LANGSMITH_API_KEY=your_langsmith_api_key_here
   LANGSMITH_PROJECT=documents-rag-app
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

## Architecture

Due to Convex runtime limitations with Node.js APIs, the implementation uses a hybrid approach:

1. **Enhanced Logging in Convex**: Detailed console logging for all RAG steps
2. **LangSmith Tracing via API Route**: Comprehensive traces sent to LangSmith through a Next.js API endpoint

## Getting Your LangSmith API Key

1. Sign up at [LangSmith](https://smith.langchain.com/)
2. Navigate to Settings → API Keys
3. Create a new API key
4. Copy the key and set it as `LANGSMITH_API_KEY`

## What's Being Traced

### Console Logging (Always Active)
All RAG steps are logged to the console with detailed information:

1. **[RAG-QUESTION]**: User question, session ID, timestamp
2. **[RAG-EMBEDDING]**: Embedding vector length, question length
3. **[RAG-RETRIEVAL]**: Search results count, similarity scores
4. **[RAG-CONTEXT]**: Retrieved documents metadata (filename, page, text length)
5. **[RAG-LLM_REQUEST]**: Model, temperature, message counts
6. **[RAG-LLM_RESPONSE]**: Response length, chunk count, duration
7. **[RAG-ERROR]**: Any errors in the pipeline

### LangSmith Traces (When Enabled)
When `LANGSMITH_TRACING=true`, comprehensive traces are sent to LangSmith:

#### RAG Pipeline Execution
- **Name**: "RAG Pipeline Execution"
- **Type**: Chain
- **Data Logged**:
  - User question
  - Number of documents retrieved
  - Search results count
  - Response character count
  - Total execution time
  - Retrieved document details (filename, page, preview)

## Files Created/Modified

1. **`instrumentation.js`** - OpenTelemetry setup for Next.js
2. **`convex/serve/serve.ts`** - Added enhanced logging for RAG components
3. **`src/app/api/langsmith/route.ts`** - API endpoint for LangSmith tracing
4. **`convex/utils/langsmith.ts`** - Utility for sending traces from Convex
5. **`package.json`** - Added LangSmith and Vercel OTel dependencies
6. **`.env.example`** - Environment variable documentation

## Usage

Once configured, tracing happens automatically when users ask questions. You can view traces in your LangSmith dashboard at:
- https://smith.langchain.com/

## Trace Structure

### Console Logs Structure
```
[RAG-QUESTION] → [RAG-EMBEDDING] → [RAG-RETRIEVAL] → [RAG-CONTEXT] → [RAG-LLM_REQUEST] → [RAG-LLM_RESPONSE]
```

### LangSmith Trace Structure
Each user question creates a comprehensive trace with:
- Complete RAG pipeline execution details
- Retrieved document metadata
- Performance metrics
- Error tracking (if any)

## Benefits

- **Performance Monitoring**: Track latency of each RAG component
- **Quality Analysis**: See which documents are retrieved for questions
- **Debugging**: Identify failures in embedding, retrieval, or generation
- **Usage Insights**: Understand user question patterns
- **Cost Tracking**: Monitor LLM API usage

## Troubleshooting

1. **No traces appearing in LangSmith**: 
   - Check that `LANGSMITH_TRACING=true` and API key is valid
   - Verify `NEXT_PUBLIC_SITE_URL` is set correctly
   - Check API route is accessible at `/api/langsmith`

2. **Console logs not showing**: 
   - Console logs should always appear regardless of LangSmith configuration
   - Check Convex dashboard logs

3. **Permission errors during install**: 
   - Run `npm install` with appropriate permissions
   - Try deleting `node_modules` and `package-lock.json`, then reinstall

4. **Convex build errors**: 
   - The implementation avoids Node.js APIs in Convex functions
   - LangSmith tracing happens via API routes only

## Benefits of This Approach

- ✅ **Convex Compatible**: Works within Convex runtime constraints
- ✅ **Dual Observability**: Console logs + LangSmith traces
- ✅ **Non-blocking**: Tracing failures don't affect RAG functionality
- ✅ **Comprehensive**: Tracks questions, retrieval, and responses
- ✅ **Performance Focused**: Detailed timing and metrics

The implementation focuses only on RAG components and does not trace OCR processing as requested.