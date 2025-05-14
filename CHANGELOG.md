# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Breaking Changes

- Removed legacy PDF-level OCR pipeline in favor of page-wise processing
  - Dropped database tables: `geminiOcrResults`, `replicateOcrResults`, `openaiOcrResults`
  - Removed `/clean` HTTP endpoint and its handler
  - Deleted `workflowOrch.ts` which orchestrated the legacy workflow
  - Removed `processPdfWithOcr` functions from OCR provider actions
  - Legacy API calls will now return appropriate error messages
  - Client code should use page-level APIs exclusively
  - Removed unused UI components: `OcrProgressStepper`, `MinimalistProgressBar`
  - Updated `useProgressiveOcr` hook to work exclusively with page-level APIs

### Improvements

- Refactored PDF processing workflow for better efficiency
  - Removed duplicate embedding triggers from `providerWorkflow.ts`
  - Modified `concatenateWorkflow.ts` to exclusively handle chunking and embedding
  - Added improved idempotency checks to avoid redundant processing
  - Maintained backward compatibility by keeping `triggerChunkAndEmbedFromPageCleaning` as a no-op
  - Added documentation in `docs/EMBEDDING_WORKFLOW.md`

- Optimized database queries to reduce N+1 pattern
  - Refactored `getPagesByPdf` query to batch fetch OCR results
  - Refactored `getProcessedPagesForPdf` to use parallel queries
  - Reduced query count from 3N+1 to 3+1 for PDFs with N pages
  - Added benchmarking tools and documentation in `docs/QUERY_OPTIMIZATION.md`