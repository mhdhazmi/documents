# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a document OCR (Optical Character Recognition) processing application built with Next.js and Convex. The application allows users to upload PDF documents, process them through multiple OCR providers (Gemini, Replicate, OpenAI), and then view and interact with the extracted text.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Convex (serverless database and functions)
- **OCR Providers**:
  - Google Gemini (primary OCR)
  - Replicate (alternative OCR using olmocr-7b model)
  - OpenAI (for text cleaning/post-processing)
- **PDF Processing**: PDF.js, pdf-lib
- **State Management**: Zustand

## Common Development Commands

```bash
# Start the development server
npm run dev

# Build for production
npm run build

# Start the production server
npm run start

# Run linting
npm run lint
```

## Architecture Overview

### Key Components

1. **PDF Processing Workflow**:
   - PDFs are uploaded and stored in Convex storage
   - PDFs are split into individual pages
   - Each page is processed by multiple OCR providers in parallel
   - Results are cleaned and stored in the database

2. **OCR Workflow**:
   - `ocrWorkflow.ts` - Coordinates the overall OCR process
   - `providerWorkflow.ts` - Handles provider-specific OCR processing
   - `concatenateWorkflow.ts` - Combines results after processing

3. **Data Model**:
   - PDF files are stored with metadata in the `pdfs` table
   - Individual pages are stored in the `pages` table
   - OCR results for each provider are stored in provider-specific tables
   - Cleaned text is stored in `openaiCleanedPage` table

4. **Frontend Components**:
   - PDF viewer for displaying documents
   - OCR progress indicators
   - Text display and editing components

## Project Structure

- `/convex` - Convex backend code
  - `/concatenate` - Code for merging OCR results
  - `/files` - File handling mutations and queries
  - `/ocr` - Provider-specific OCR implementations
  - `/pdf` - PDF processing logic
  - `/workflow` - Orchestration of OCR processes
  - `schema.ts` - Database schema definition

- `/src/app` - Next.js frontend code
  - `/pdf` - PDF viewing and interaction components
  - `/components` - Reusable UI components
  - `/chat` - Chat interface for document Q&A

## Configuration

The application is configured via the `convex/config.ts` file, which contains settings for:

- OCR provider models and parameters
- Embedding configuration
- Prompts used for OCR and text cleaning

## Important Files

- `/convex/schema.ts` - Database schema definition
- `/convex/workflow/ocrWorkflow.ts` - Main OCR workflow
- `/convex/config.ts` - Configuration for OCR providers
- `/src/app/pdf/[storageId]/page.tsx` - Main PDF view page

## Development Notes

- The application uses Convex workflows for orchestrating the OCR process across multiple providers
- PDF processing is done page-by-page for better performance and reliability
- Results from different OCR providers can be compared and selected for best quality
- The system supports Arabic language OCR with specialized prompts and settings

## Working with OCR Providers

- **Gemini**: Used for primary OCR with high accuracy for Arabic text
- **Replicate**: Uses the olmocr-7b model as an alternative OCR engine
- **OpenAI**: Used for text cleaning and post-processing of OCR results

Each provider has its own configuration settings in `convex/config.ts`.