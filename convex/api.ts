import { httpAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { openai as openaiConfig } from "./config";
import { streamText } from 'ai';
import { openai } from "@ai-sdk/openai";
// Centralized CORS headers function to ensure consistency
const getCorsHeaders = (request: Request): Record<string, string> => {
  // Get the origin from the request or fall back to configured origin
  const requestOrigin = request.headers.get("Origin");
  
  // Determine which origin to allow
  // If the origin is from our allowed domains, return that specific origin
  // This is more secure than using a wildcard
  const allowedOrigins = [
    "http://localhost:3000",           // Local development
    "https://your-production-domain.com", // Production
    process.env.CLIENT_ORIGIN || ""    // Environment variable if set
  ].filter(Boolean);
  
  // Determine which origin to use in the response
  let originToAllow = "*"; // Default fallback (less secure)
  
  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin)) {
      // If it's in our allowed list, echo it back
      originToAllow = requestOrigin;
    } else if (requestOrigin.endsWith(".vercel.app")) {
      // Preview deployments (optional)
      originToAllow = requestOrigin;
    }
  }
  
  return {
    "Access-Control-Allow-Origin": originToAllow,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400", // 24 hours
    "Vary": "Origin" // Important when using dynamic origins
  };
};

export const cleanHandler = httpAction(async (ctx, req) => {
  // Get CORS headers for this request
  const corsHeaders = getCorsHeaders(req);
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  // Handle actual request
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405, 
        headers: corsHeaders 
      });
    }
    
    // Parse request body
    const body = await req.json().catch(err => {
      console.error("Failed to parse request body", err);
      throw new Error("Invalid JSON in request body");
    });
    
    const { pdfId, source } = body as { pdfId: Id<"pdfs">; source: "gemini" | "replicate" };
    
    if (!pdfId || !source) {
      return new Response("Missing required fields: pdfId and source", {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log("Processing request for pdfId:", pdfId, "source:", source);
    
    // Check if PDF exists
    const pdf = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId });
    if (!pdf) {
      return new Response("PDF not found in database", { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    
    // Get OCR status
    const [geminiId] = await ctx.runQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId });
    const [replicateId] = await ctx.runQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId });
    const embeddingRecord = await ctx.runQuery(internal.ingest.ingest.getEmbedding, { pdfId });
    
    // Update status to "started"
    await ctx.runMutation(internal.ocr.openai.mutations.updateCleanedStatus, { 
      pdfId, 
      source, 
      cleaningStatus: "started", 
      cleanedText: "" 
    });
    
    // Get text to clean based on source
    let text;
    if (source === "gemini") {
      if (geminiId?.ocrStatus !== "completed") {
        return new Response("Gemini OCR not completed", { 
          status: 400, 
          headers: corsHeaders 
        });
      }
      const geminiResults = await ctx.runQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId });
      text = geminiResults?.[0]?.extractedText || "";
    } else if (source === "replicate") {
      if (replicateId?.ocrStatus !== "completed") {
        return new Response("Replicate OCR not completed", { 
          status: 400, 
          headers: corsHeaders 
        });
      }
      const replicateResults = await ctx.runQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId });
      text = replicateResults?.[0]?.extractedText || "";
    } else {
      return new Response(`Invalid source: ${source}`, { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    if (!text || text.trim() === "") {
      return new Response("No text found to clean", { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // Set up streaming response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    
    // Process in background
    void (async () => {
      try {
        let fullText = "";
        
        const { textStream } = await streamText({
          model: openai(openaiConfig.streamingModel),
          system: openaiConfig.systemPrompt,
          prompt: text,
        });
        
        for await (const chunk of textStream) {
          await writer.write(encoder.encode(chunk));
          fullText += chunk;
        }
        
        // Save completed result
        await ctx.runMutation(internal.ocr.openai.mutations.saveCleanedResults, {
          pdfId,
          source,
          cleanedText: fullText,
          cleaningStatus: "completed"
        });
        
        // Create embedding if needed
        if (source === "gemini" && !embeddingRecord) {
          await ctx.runAction(api.ingest.ingest.chunkAndEmbed, { pdfId });
        }
      } catch (error) {
        console.error("Error in streaming process:", error);
        // Can't update response headers at this point
      } finally {
        await writer.close();
      }
    })();
    
    // Return streaming response with CORS headers
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error("Error in clean handler:", error);
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error instanceof Error ? error.message : String(error) 
      }), 
      { 
        status: 500, 
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
  }
});