import { GoogleGenAI } from "@google/genai";
import { gemini } from "../config";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Utility: convert ArrayBuffer → base64 without Buffer
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // `btoa` is available in the Convex V8 runtime
  return btoa(binary);
}

export default async function geminiPageOcr(pdfPageUrl: string) {
  console.log("Contacting Gemini …");

  const arrayBuffer = await fetch(pdfPageUrl).then((r) => r.arrayBuffer());
  const base64 = arrayBufferToBase64(arrayBuffer);

  const contents = [
    { text: gemini.prompt },
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    },
  ];

  const response = await ai.models.generateContent({
    model: gemini.model,
    contents,
  });

  console.log(response.text);
  return response;
}
