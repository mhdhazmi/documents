// src/app/api/debug-traces/route.ts - Debug endpoint to check stored traces
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

// Create Convex client for server-side use
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_HTTP_BASE!);

export async function GET(request: NextRequest) {
  try {
    // Get pending traces from Convex
    const pendingTraces = await convex.query(api.serve.serve.getPendingRAGTraces);
    
    return NextResponse.json({ 
      success: true,
      pendingTraces: pendingTraces.length,
      traces: pendingTraces.map(trace => ({
        id: trace._id,
        sessionId: trace.sessionId,
        question: trace.question.substring(0, 50) + "...",
        timestamp: new Date(trace.timestamp).toISOString(),
        sentToLangSmith: trace.sentToLangSmith
      }))
    });
  } catch (error) {
    console.error("Debug traces error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}