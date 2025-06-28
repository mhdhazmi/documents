// src/app/api/langsmith/route.ts - LangSmith tracing endpoint for RAG observability
import { NextRequest, NextResponse } from "next/server";
import { traceable } from "langsmith/traceable";

interface RAGTraceData {
  sessionId: string;
  question: string;
  retrievedDocs: Array<{
    filename: string;
    pageNumber: number | null;
    textPreview: string;
    chunkId: string;
  }>;
  searchResultsCount: number;
  responseLength: number;
  durationMs: number;
}

// Traceable wrapper for logging RAG pipeline results
const traceRAGPipeline = traceable(
  async (data: RAGTraceData) => {
    // Log the complete RAG pipeline execution
    return {
      question: data.question,
      documentsRetrieved: data.retrievedDocs.length,
      searchResults: data.searchResultsCount,
      responseCharCount: data.responseLength,
      executionTime: data.durationMs,
      retrievedDocuments: data.retrievedDocs.map(doc => ({
        filename: doc.filename,
        page: doc.pageNumber,
        preview: doc.textPreview.substring(0, 100) + "..."
      }))
    };
  },
  { 
    name: "RAG Pipeline Execution", 
    run_type: "chain",
    metadata: { component: "rag" }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    const langsmithApiKey = process.env.LANGSMITH_API_KEY;
    const langsmithTracing = process.env.LANGSMITH_TRACING;
    
    if (!langsmithApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: "LANGSMITH_API_KEY not configured" 
      }, { status: 500 });
    }
    
    if (langsmithTracing !== "true") {
      return NextResponse.json({ 
        success: false, 
        error: "LangSmith tracing is disabled" 
      });
    }
    
    const traceData: RAGTraceData = await request.json();
    
    // Send trace to LangSmith
    const result = await traceRAGPipeline(traceData);
    
    return NextResponse.json({ 
      success: true, 
      traced: true,
      result 
    });
  } catch (error) {
    console.error("LangSmith tracing error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}