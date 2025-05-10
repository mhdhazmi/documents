import { streamText } from 'ai';
import { openai } from "@ai-sdk/openai";
import { openai as openaiConfig } from "../config";

/**
 * Pure OpenAI text cleaning utility using async generator pattern.
 * Streams cleaned text chunks and returns the full text when complete.
 * 
 * @param input - Raw text to be cleaned
 * @param model - OpenAI model to use (defaults to config value)
 * @returns AsyncGenerator that yields chunks and returns full text
 */
export async function* cleanTextWithOpenAI(
  input: string,
  model: "gpt-4o-mini" | "gpt-4-turbo" = openaiConfig.streamingModel as "gpt-4o-mini"
): AsyncGenerator<string, string, void> {
  let fullText = "";
  
  try {
    const { textStream } = await streamText({
      model: openai(model),
      system: openaiConfig.systemPrompt,
      prompt: input,
      temperature: openaiConfig.temperature,
    });
    
    for await (const chunk of textStream) {
      fullText += chunk;
      yield chunk;
    }
    
    return fullText;
  } catch (error) {
    // Re-throw errors to be handled by the HTTP handlers
    throw error;
  }
}