// src/app/api/langsmith-sync/route.ts - Sync pending RAG traces to LangSmith
import { NextRequest, NextResponse } from "next/server";
import { traceable } from "langsmith/traceable";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

// Create Convex client for server-side use
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_HTTP_BASE!);

// Traceable wrapper for RAG pipeline
const traceRAGPipeline = traceable(
  async (data: any) => {
    return {
      question: data.question,
      documentsRetrieved: data.retrievedDocs.length,
      searchResults: data.searchResultsCount,
      responseCharCount: data.responseLength,
      executionTime: data.durationMs,
      retrievedDocuments: data.retrievedDocs.map((doc: any) => ({
        filename: doc.filename,
        page: doc.pageNumber,
        preview: doc.textPreview.substring(0, 100) + "..."
      })),
      // OpenAI context data
      openaiModel: data.openaiModel,
      openaiTemperature: data.openaiTemperature,
      contextMessagesCount: data.contextMessagesCount,
      openaiMessages: data.openaiMessages ? data.openaiMessages.map((msg: any) => ({
        role: msg.role,
        contentLength: msg.content.length,
        contentPreview: msg.content.substring(0, 200) + (msg.content.length > 200 ? "..." : "")
      })) : undefined
    };
  },
  { 
    name: "RAG Pipeline Execution", 
    run_type: "chain",
    metadata: { component: "rag" }
  }
);

// Additional traceable for OpenAI context details
const traceOpenAIContext = traceable(
  async (data: any) => {
    if (!data.openaiMessages) return { noMessages: true };
    
    return {
      model: data.openaiModel,
      temperature: data.openaiTemperature,
      totalMessages: data.openaiMessages.length,
      systemPrompt: data.openaiMessages.find((msg: any) => msg.role === "system")?.content || "No system prompt",
      contextDocuments: data.openaiMessages
        .filter((msg: any) => msg.role === "system" && msg.content.includes("Relevant document"))
        .map((msg: any) => ({
          content: msg.content.substring(0, 300) + "..."
        })),
      conversationHistory: data.openaiMessages
        .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content.substring(0, 200) + (msg.content.length > 200 ? "..." : "")
        }))
    };
  },
  { 
    name: "OpenAI Context Details", 
    run_type: "llm",
    metadata: { component: "openai_context" }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    const langsmithApiKey = process.env.LANGSMITH_API_KEY;
    const langsmithTracing = process.env.LANGSMITH_TRACING;
    
    if (!langsmithApiKey || langsmithTracing !== "true") {
      return NextResponse.json({ 
        success: false, 
        error: "LangSmith not configured" 
      });
    }

    console.log("Syncing pending RAG traces to LangSmith...");

    // Get pending traces from Convex
    const pendingTraces = await convex.query(api.serve.serve.getPendingRAGTraces);
    
    console.log(`Found ${pendingTraces.length} pending traces`);

    let successCount = 0;
    let errorCount = 0;

    // Process each trace
    for (const trace of pendingTraces) {
      try {
        // Send main RAG pipeline trace to LangSmith
        await traceRAGPipeline(trace);
        
        // Send detailed OpenAI context trace if available
        if (trace.openaiMessages) {
          await traceOpenAIContext(trace);
        }
        
        // Mark as sent in Convex
        await convex.mutation(api.serve.serve.markRAGTraceSent, {
          traceId: trace._id
        });
        
        successCount++;
        console.log(`Successfully sent trace ${trace._id} to LangSmith`);
      } catch (error) {
        errorCount++;
        console.error(`Failed to send trace ${trace._id}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Processed ${pendingTraces.length} traces`,
      successCount,
      errorCount
    });
  } catch (error) {
    console.error("LangSmith sync error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

// GET endpoint to manually trigger sync
export async function GET(request: NextRequest) {
  return POST(request);
}