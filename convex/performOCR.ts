// Mutation that runs the internal action and returns the OCR content
import { internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
    GoogleGenAI,
    createPartFromUri,
    Part
} from "@google/genai";
import { gemini as geminiConfig, ocr as ocrConfig } from "./config";


export const exposeOCR = mutation({
    args: {
        url: v.string(),
    },
    handler: async (ctx, {url}) => {
        if (!url) {
            throw new Error('URL is required');
        }
        await ctx.scheduler.runAfter(0, internal.performOCR.performOCR, {url}) 
        return 
    },
});

export const performOCR = internalAction({
    args: {
        url: v.string(),
    },
    handler: async (ctx, args) => {

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const pdfBuffer = await fetch(args.url)
            .then((response) => response.arrayBuffer());

        // Use the ArrayBuffer directly, no need to convert to Buffer
        const fileBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

        const file = await ai.files.upload({
            file: fileBlob,
            config: {
                displayName: args.url,
            },
        });

        // Wait for the file to be processed.
        if (!file.name) {
            throw new Error('File name is undefined');
        }

        let getFile = await ai.files.get({ name: file.name });
        while (getFile.state === 'PROCESSING') {
            getFile = await ai.files.get({ name: file.name });
            console.log(`current file status: ${getFile.state}`);
            console.log('File is still processing, retrying in 5 seconds');
            await new Promise((resolve) => {
                setTimeout(resolve, geminiConfig.fileProcessingPollingIntervalMs);
            });
        }

        if (getFile.state === 'FAILED') {
            throw new Error('File processing failed.');
        }

        // Add the file to the contents.
        const content: (string | Part)[] = [
            ocrConfig.performOcrPrompt,
        ];

        if (file.uri && file.mimeType) {
            const fileContent = createPartFromUri(file.uri, file.mimeType);
            content.push(fileContent);
        }

        const response = await ai.models.generateContent({
            model: geminiConfig.model,
            contents: content,
        });

        return {
            text: response.text,
            url: args.url,
        };
    },
})
