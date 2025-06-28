// src/app/api/test-langsmith/route.ts - Test LangSmith connection
import { NextRequest, NextResponse } from "next/server";
import { traceable } from "langsmith/traceable";

// Simple test trace
const testTrace = traceable(
  async (testData: { message: string; timestamp: string }) => {
    return {
      testMessage: testData.message,
      timestamp: testData.timestamp,
      success: true
    };
  },
  { 
    name: "LangSmith Test", 
    run_type: "chain",
    metadata: { component: "test" }
  }
);

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const langsmithApiKey = process.env.LANGSMITH_API_KEY;
    const langsmithTracing = process.env.LANGSMITH_TRACING;
    const langsmithProject = process.env.LANGSMITH_PROJECT;
    
    console.log("LangSmith test - Environment check:", {
      hasApiKey: !!langsmithApiKey,
      tracingEnabled: langsmithTracing,
      project: langsmithProject,
      apiKeyPrefix: langsmithApiKey ? langsmithApiKey.substring(0, 8) + "..." : "none"
    });
    
    if (!langsmithApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: "LANGSMITH_API_KEY not configured",
        environment: {
          hasApiKey: false,
          tracingEnabled: langsmithTracing,
          project: langsmithProject
        }
      });
    }
    
    if (langsmithTracing !== "true") {
      return NextResponse.json({ 
        success: false, 
        error: "LangSmith tracing is disabled",
        environment: {
          hasApiKey: !!langsmithApiKey,
          tracingEnabled: langsmithTracing,
          project: langsmithProject
        }
      });
    }
    
    // Send test trace
    const result = await testTrace({
      message: "LangSmith connection test",
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "LangSmith test trace sent successfully",
      result,
      environment: {
        hasApiKey: !!langsmithApiKey,
        tracingEnabled: langsmithTracing,
        project: langsmithProject
      }
    });
  } catch (error) {
    console.error("LangSmith test error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}