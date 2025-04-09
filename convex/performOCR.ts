import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import {
    GoogleGenAI,
    createPartFromUri,
    Part
} from "@google/genai";



export const performOCR = internalAction({

    args: {
        url: v.string(),
    },
    handler: async (ctx, args) => {

        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
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
                setTimeout(resolve, 5000);
            });
        }

        if (getFile.state === 'FAILED') {
            throw new Error('File processing failed.');
        }

        // Add the file to the contents.
        const content: (string | Part)[] = [
            'Perform OCR on the following document and translate it to Arabic',
        ];

        if (file.uri && file.mimeType) {
            const fileContent = createPartFromUri(file.uri, file.mimeType);
            content.push(fileContent);
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: content,
        });

        console.log(response.text);

        return {
            text: response.text,
            url: args.url,
        };
    },
})
