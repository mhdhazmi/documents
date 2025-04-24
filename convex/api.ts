import { httpAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";


export const cleanHnadler = httpAction(async (ctx, req) => {
    const { pdfId, source } = await req.json() as { pdfId: Id<"pdfs">; source: "gemini" | "replicate"; };
    console.log("pdfId", pdfId);
    console.log("source", source);


    const pdf = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId: pdfId });
    if (!pdf) {
        return new Response("The file does not exist in the database", { status: 404 });
    }

    const [geminiId] = await ctx.runQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId: pdfId });
    const [replicateId] = await ctx.runQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId: pdfId });

    const geminiOcrStatus = geminiId?.ocrStatus;
    const replicateOcrStatus = replicateId?.ocrStatus;



    if (!geminiOcrStatus || !replicateOcrStatus || geminiOcrStatus !== "completed" || replicateOcrStatus !== "completed") {
        return new Response("OCR is not completed or does not exist", { status: 400 });
    }

    // insert a new record to openaiOcrResults with the new status
    await ctx.runMutation(internal.ocr.openai.mutations.updateCleanedStatus,
        { pdfId: pdfId, source: source, cleaningStatus: "started", cleanedText: "" });


    let text;
    if (source === "gemini") {
        // query the gemini ocr results
        const geminiOcrResults = await ctx.runQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId: pdfId });
        text = geminiOcrResults?.[0]?.extractedText || "";
    }

    if (source === "replicate") {
        // query the replicate ocr results
        const replicateOcrResults = await ctx.runQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId: pdfId });
        text = replicateOcrResults?.[0]?.extractedText || "";
    }

    if (!text) {
        return new Response("No text found to clean", { status: 400 });
    }




    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const enc = new TextEncoder();

    void (async () => {
        let full = "";
        const openai = new OpenAI();
        const stream = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            stream: true,
            messages: [
                { role: "system", content: "Clean and format OCR text." },
                { role: "user", content: text },
            ],
        });

        for await (const chunk of stream) {
            const t = chunk.choices[0]?.delta?.content ?? "";
            if (!t) continue;
            full += t;
            await writer.write(enc.encode(t));
        }

        // Save the completed text
        // await ctx.runMutation(internal.ocr.openai.mutations.saveCleanedResults, {
        //     pdfId: pdfId,
        //     source: source,
        //     cleanedText: full,
        //     cleaningStatus: "completed"
        // });
        await writer.close();
    })();

    

    return new Response(readable, {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    });
})