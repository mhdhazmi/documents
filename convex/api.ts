import { httpAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { openai as openaiConfig } from "./config";
import { streamText } from 'ai';
import { openai } from "@ai-sdk/openai"



export const cleanHnadler = httpAction(async (ctx, req) => {
    const origin = req.headers.get("Origin") || process.env.CLIENT_ORIGIN!;
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };

    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }


    
    const { pdfId, source } = await req.json() as { pdfId: Id<"pdfs">; source: "gemini" | "replicate"; };
    console.log("pdfId", pdfId);
    console.log("source", source);


    const pdf = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId: pdfId });
    if (!pdf) {
        return new Response("The file does not exist in the database", { status: 404, headers: corsHeaders });
    }

    const [geminiId] = await ctx.runQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId: pdfId });
    const [replicateId] = await ctx.runQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId: pdfId });
    const embeddingRecord = await ctx.runQuery(internal.ingest.ingest.getEmbedding, { pdfId: pdfId });

    const geminiOcrStatus = geminiId?.ocrStatus;
    const replicateOcrStatus = replicateId?.ocrStatus;


    // insert a new record to openaiOcrResults with the new status
    await ctx.runMutation(internal.ocr.openai.mutations.updateCleanedStatus,
        { pdfId: pdfId, source: source, cleaningStatus: "started", cleanedText: "" });


    let text;
    if (source === "gemini") {
        // query the gemini ocr results
        if (geminiOcrStatus !== "completed") {
            return new Response("Gemini OCR not completed", { status: 400, headers: corsHeaders });
        }
        const geminiOcrResults = await ctx.runQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId: pdfId });
        text = geminiOcrResults?.[0]?.extractedText || "";
    }

    if (source === "replicate") {
        if (replicateOcrStatus !== "completed") {
            return new Response("Replicate OCR not completed", { status: 400, headers: corsHeaders });
        }
        // query the replicate ocr results
        const replicateOcrResults = await ctx.runQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId: pdfId });
        text = replicateOcrResults?.[0]?.extractedText || "";
    }

    if (!text) {
        return new Response("No text found to clean", { status: 400, headers: corsHeaders });
    }




    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const enc = new TextEncoder();

    void (async () => {
        let full = "";

        const {textStream}  = await streamText({
            model: openai("gpt-4o-mini"),
            system: openaiConfig.systemPrompt,
            prompt: text,
        });

        for await (const chunk of textStream) {
            await writer.write(enc.encode(chunk));
            full += chunk;
        }

        console.log("Full text:", full);

        // Save the completed text
        console.log("Saving cleaned results from the API");
        await ctx.runMutation(internal.ocr.openai.mutations.saveCleanedResults, {
            pdfId: pdfId,
            source: source,
            cleanedText: full,
            cleaningStatus: "completed"
        });
        // Only create an embedding for cleaned gemini output if none exists
        if (source === "gemini" && !embeddingRecord) {
            console.log("Creating an embedding for the pdf");
            await ctx.runAction(api.ingest.ingest.chunkAndEmbed, { pdfId: pdfId });
        }
        //TODO: Create an embedding only for Gemini, not for replicate
        console.log("Closing the writer");
        await writer.close();
    })();

    

    return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          ...corsHeaders,
        },
    });
})