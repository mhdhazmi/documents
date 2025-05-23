import { httpAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { cleanTextWithOpenAI } from "./utils/cleaner";
// Legacy import removed: readableStreamFromIterable

// Centralized CORS headers function to ensure consistency
const getCorsHeaders = (request: Request): Record<string, string> => {
  // Get the origin from the request or fall back to configured origin
  const requestOrigin = request.headers.get("Origin");
  
  // Determine which origin to allow
  // If the origin is from our allowed domains, return that specific origin
  // This is more secure than using a wildcard
  const allowedOrigins = [
    "http://localhost:3000",
    
    "http://localhost:3001",           // Local development
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

// Legacy cleanHandler has been removed

// New endpoint to get first page OCR results with priority
export const firstPageHandler = httpAction(async (ctx, req) => {
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
    
    const { pdfId, source } = body as { 
      pdfId: Id<"pdfs">; 
      source: "gemini" | "replicate";
    };
    
    if (!pdfId || !source) {
      return new Response("Missing required fields: pdfId and source", {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log("Processing first page request for pdfId:", pdfId, "source:", source);
    
    // Check if PDF exists
    const pdf = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId });
    if (!pdf) {
      return new Response("PDF not found in database", { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    
    // Get pages and check if they exist
    const pages = await ctx.runQuery(api.pdf.queries.getPdfPages, { pdfId });
    if (!pages || pages.length === 0) {
      return new Response("No pages found for this PDF", { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    
    // Get first page ID
    const firstPageId = pages[0]._id;
    
    // Check if first page OCR is already completed
    let ocrResults;
    if (source === "gemini") {
      ocrResults = await ctx.runQuery(api.ocr.gemini.queries.getPageOcrResults, { pageId: firstPageId });
    } else if (source === "replicate") {
      ocrResults = await ctx.runQuery(api.ocr.replicate.queries.getPageOcrResults, { pageId: firstPageId });
    } else {
      return new Response(`Invalid source: ${source}`, { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // Check if first page OCR is completed
    if (!ocrResults?.ocrResults || ocrResults.ocrResults.ocrStatus !== "completed") {
      // If not completed, prioritize first page OCR
      if (source === "gemini") {
        await ctx.runAction(internal.ocr.gemini.actions.processPageWithOcr, { pageId: firstPageId });
      } else {
        await ctx.runAction(internal.ocr.replicate.actions.processPageWithOcr, { pageId: firstPageId });
      }
      
      // Return a waiting status
      return new Response(
        JSON.stringify({ 
          status: "processing", 
          message: "First page OCR has been prioritized and started. Try again in a few seconds."
        }), 
        { 
          status: 202, 
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "5",
            ...corsHeaders
          } 
        }
      );
    }
    
    // If OCR is completed, get the text and clean it
    const text = ocrResults.ocrResults.extractedText || "";
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
        
        // Use the cleanTextWithOpenAI utility
        const generator = cleanTextWithOpenAI(text);
        for await (const chunk of generator) {
          await writer.write(encoder.encode(chunk));
          fullText += chunk;
        }
        
        // Save the first page cleaned results
        await ctx.runMutation(internal.ocr.openai.mutations.savePageCleanedResults, {
          pageId: firstPageId,
          source,
          cleanedText: fullText,
          cleaningStatus: "completed"
        });
      } catch (error) {
        console.error("Error in first page streaming process:", error);
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
    console.error("Error in first page handler:", error);
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

// convex/http.ts (update the cleanPageHandler)
export const cleanPageHandler = httpAction(async (ctx, req) => {
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
    
    const { pageId, source } = body as { pageId: Id<"pages">; source: "gemini" | "replicate" };
    
    if (!pageId || !source) {
      return new Response("Missing required fields: pageId and source", {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Check idempotency first
    const status = await ctx.runMutation(internal.ocr.openai.mutations.startPageCleaning, { 
      pageId, 
      source 
    });
    
    if (status === "completed") {
      const cleaned = await ctx.runQuery(
        api.ocr.openai.queries.getPageCleanedResults,
        { pageId, source }
      );

      const text = cleaned?.cleanedText ?? "";

      if (text.trim() === "") {
        // Nothing to stream – tell the client gracefully.
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          ...corsHeaders,
        },
      });
    }
    
    console.log("Processing request for pageId:", pageId, "source:", source);
    
    // Check if page exists
    const page = await ctx.runQuery(api.pdf.queries.getPdfPage, { pageId });
    if (!page) {
      return new Response("Page not found in database", { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    
    // Get OCR results based on source
    let ocrResults;
    if (source === "gemini") {
      ocrResults = await ctx.runQuery(api.ocr.gemini.queries.getPageOcrResults, { pageId });
    } else if (source === "replicate") {
      ocrResults = await ctx.runQuery(api.ocr.replicate.queries.getPageOcrResults, { pageId });
    } else {
      return new Response(`Invalid source: ${source}`, { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    if (!ocrResults?.ocrResults || ocrResults.ocrResults.ocrStatus !== "completed") {
      return new Response(`${source} OCR not completed for this page`, { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    const text = ocrResults.ocrResults.extractedText || "";
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
        
        // Use the new cleanTextWithOpenAI utility
        const generator = cleanTextWithOpenAI(text);
        for await (const chunk of generator) {
          await writer.write(encoder.encode(chunk));
          fullText += chunk;
        }
        
        // Get the final result from the generator
        const result = await generator.next();
        if (result.done && result.value) {
          fullText = result.value;
        }
        
        // Save completed result
        await ctx.runMutation(internal.ocr.openai.mutations.savePageCleanedResults, {
          pageId,
          source,
          cleanedText: fullText,
          cleaningStatus: "completed"
        });
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
    console.error("Error in cleanPage handler:", error);
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