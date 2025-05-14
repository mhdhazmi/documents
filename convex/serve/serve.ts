// convex/serve/serve.ts - Enhanced vector search with page-aware filtering
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { embedTexts } from "../ingest/ingest";
import { asyncMap } from "modern-async";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { openai as openaiConfig } from "../config";

// Updated chunk type to include pageId and page metadata
interface EnhancedChunk {
  _id: Id<"chunks">;
  pdfId: Id<"pdfs">;
  text: string;
  embeddingId: Id<"embeddings"> | null;
  pageId: Id<"pages"> | null;
  pageNumber?: number;
  pdfFilename?: string;
}

// Enhanced citation metadata type
interface CitationMetadata {
  pdfId: Id<"pdfs">;
  pageId: Id<"pages"> | null;
  pageNumber: number | null;
  filename: string;
}

// Interface for message structure
interface Message {
  id?: Id<"messages">;
  isUser: boolean;
  text: string;
  sessionId?: string;
  timestamp: number;
}

// Type for search results
interface SearchResult {
  _id: Id<"embeddings">;
  _score: number;
}

// Interface for search results with data
interface SearchResultWithData {
  chunks: EnhancedChunk[];
  citations: CitationMetadata[];
}

// Main answer function implementing streaming with OpenAI and page citations
export const answer = internalAction({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }): Promise<void> => {
    // Get messages for this session
    const messages = (await ctx.runQuery(api.serve.serve.retrieveMessages, {
      sessionId,
    })) as Message[];

    // If no messages, return early
    if (!messages.length) {
      console.error("No messages found for session:", sessionId);
      return;
    }

    // Get the last user message - we assume the last message is from the user
    // since this action is only triggered after a user sends a message
    const lastUserMessage = messages.at(-1)!.text;
    
    // First create an empty AI message - we'll stream updates to this
    const messageId = await ctx.runMutation(internal.serve.serve.addBotMessage, {
      sessionId,
    });

    try {
      // Check for API key availability
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        await ctx.runMutation(internal.serve.serve.updateBotMessage, {
          messageId,
          text: "OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable in your .env.local file and restart the server.",
        });
        return;
      }
      
      // Embed the user's message for semantic search
      try {
        const [embedding] = await embedTexts([lastUserMessage]);

        // Search for relevant documents
        const searchResults = (await ctx.vectorSearch(
          "embeddings",
          "byEmbedding",
          {
            vector: embedding,
            limit: 8,
          }
        )) as SearchResult[];

        // No relevant documents found
        if (searchResults.length === 0) {
          await ctx.runMutation(internal.serve.serve.updateBotMessage, {
            messageId,
            text: "I couldn't find any relevant information in the documents to answer your question. Could you please rephrase or ask about something covered in the uploaded documents?",
          });
          return;
        }

        // Get the full chunks with metadata
        const relevantChunks = (await ctx.runQuery(
          internal.serve.serve.getEnhancedChunks,
          {
            embeddingIds: searchResults.map((result) => result._id),
          }
        )) as EnhancedChunk[];

        // Get citation information
        const citations = (await ctx.runQuery(
          internal.serve.serve.getCitationMetadata,
          {
            chunks: relevantChunks,
          }
        )) as CitationMetadata[];

        // Update sources for UI
        const relevantPdfs = relevantChunks.map(chunk => chunk.pdfId);
        const uniqueRelevantPdfs = [...new Set(relevantPdfs)];
        await ctx.runMutation(internal.serve.serve.updateRagSources, {
          sessionId,
          pdfIds: uniqueRelevantPdfs,
        });

        // Prepare context messages with citations
        const contextMessages = relevantChunks.map((chunk, index) => {
          const citation = citations[index];
          const citationText = citation.pageNumber
            ? `(${citation.filename}, p. ${citation.pageNumber})`
            : `(${citation.filename})`;

          return {
            role: "system" as const,
            content: `Relevant document ${citationText}:\n\n${chunk.text}`,
          };
        });

        // Create the conversation history
        const conversationMessages = messages.map((msg: Message) => ({
          role: (msg.isUser ? "user" : "assistant") as "user" | "assistant",
          content: msg.text,
        }));

        // Check the streaming model is properly set in config
        if (!openaiConfig.streamingModel) {
          await ctx.runMutation(internal.serve.serve.updateBotMessage, {
            messageId,
            text: "Error: OpenAI streaming model is not configured. Please check your config.ts file.",
          });
          return;
        }
        
        console.log("Using OpenAI streaming model:", openaiConfig.streamingModel);
        
        // Start streaming the response
        const result = streamText({
          model: openai(openaiConfig.streamingModel),
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant that answers questions based on provided documents. 
              When you reference specific information, please include the citation in the format "(Filename.pdf, p. 5)" 
              or "(Filename.pdf)" if no specific page is referenced. 
              Keep your answers informative but concise. If you don't know the answer, say so.`,
            },
            ...contextMessages,
            ...conversationMessages,
          ],
          temperature: openaiConfig.temperature,
        });

        // Stream the response and update the message incrementally
        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
          
          // Update the bot message with each new chunk
          await ctx.runMutation(internal.serve.serve.updateBotMessage, {
            messageId,
            text: fullText,
          });
        }
      } catch (embeddingError) {
        console.error("Error in embedding or retrieval process:", embeddingError);
        
        // Set a more specific error message for embedding/retrieval errors
        const errorMessage = "There was an error retrieving relevant documents. This might be due to an issue with the OpenAI API. Please check your API key and try again.";
        
        await ctx.runMutation(internal.serve.serve.updateBotMessage, {
          messageId,
          text: errorMessage,
        });
      }

    } catch (error) {
      console.error("Error in streaming response:", error);
      
      // Check for specific error types
      let errorMessage = "Sorry, I'm having trouble processing your request right now. Please try again later.";
      
      // Check for common API errors
      if (error instanceof Error) {
        const errorString = error.toString().toLowerCase();
        
        if (errorString.includes("api key")) {
          errorMessage = "There seems to be an issue with the OpenAI API key. Please check your API configuration.";
        } else if (errorString.includes("rate limit") || errorString.includes("429")) {
          errorMessage = "The OpenAI API rate limit has been exceeded. Please try again in a few minutes.";
        } else if (errorString.includes("timeout") || errorString.includes("timed out")) {
          errorMessage = "The request to OpenAI API timed out. This might be due to high traffic or a complex query.";
        }
      }
      
      // Update the bot message with the error
      await ctx.runMutation(internal.serve.serve.updateBotMessage, {
        messageId,
        text: errorMessage,
      });
    }
  },
});

// **NEW: Enhanced getChunks query with page metadata**
export const getEnhancedChunks = internalQuery({
  args: {
    embeddingIds: v.array(v.id("embeddings")),
  },
  handler: async (ctx, { embeddingIds }): Promise<EnhancedChunk[]> => {
    return (await asyncMap(
      embeddingIds,
      async (embeddingId: Id<"embeddings">) => {
        // Get the chunk with its embedding
        const chunk = await ctx.db
          .query("chunks")
          .withIndex("byEmbeddingId", (q) => q.eq("embeddingId", embeddingId))
          .unique();

        if (!chunk) return null;

        // **NEW: Get page metadata if chunk has pageId**
        if (chunk.pageId) {
          const page = await ctx.db.get(chunk.pageId);
          const pdf = await ctx.db.get(chunk.pdfId);

          return {
            ...chunk,
            pageNumber: page?.pageNumber ?? null,
            pdfFilename: pdf?.filename ?? "Unknown Document",
          };
        }

        // For document-level chunks (pageId is null)
        const pdf = await ctx.db.get(chunk.pdfId);
        return {
          ...chunk,
          pageNumber: null,
          pdfFilename: pdf?.filename ?? "Unknown Document",
        };
      }
    ).then((results) =>
      results.filter((chunk) => chunk !== null)
    )) as EnhancedChunk[];
  },
});

// **NEW: Get citation metadata for chunks**
export const getCitationMetadata = internalQuery({
  args: {
    // Using any validator to allow system fields like _creationTime
    chunks: v.array(v.any()),
  },
  handler: async (ctx, { chunks }): Promise<CitationMetadata[]> => {
    return await asyncMap(
      chunks as EnhancedChunk[],
      async (chunk: EnhancedChunk): Promise<CitationMetadata> => {
        if (chunk.pageId) {
          // Page-level chunk
          const page = await ctx.db.get(chunk.pageId);
          const pdf = await ctx.db.get(chunk.pdfId);

          return {
            pdfId: chunk.pdfId,
            pageId: chunk.pageId,
            pageNumber: page?.pageNumber ?? null,
            filename: pdf?.filename ?? "Unknown Document",
          };
        } else {
          // Document-level chunk
          const pdf = await ctx.db.get(chunk.pdfId);

          return {
            pdfId: chunk.pdfId,
            pageId: null,
            pageNumber: null,
            filename: pdf?.filename ?? "Unknown Document",
          };
        }
      }
    );
  },
});

// **NEW: Page-aware vector search**
export const pageAwareVectorSearch = internalAction({
  args: {
    query: v.string(),
    pdfId: v.optional(v.id("pdfs")),
    pageId: v.optional(v.id("pages")),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { query, pdfId, pageId, limit = 16 }
  ): Promise<SearchResult[]> => {
    const [embedding] = await embedTexts([query]);

    // Different filter options based on provided parameters
    let searchOptions;

    if (pdfId && pageId) {
      // Both pdfId and pageId specified
      searchOptions = {
        vector: embedding,
        limit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: (q: any) => q.eq("pdfId", pdfId).eq("pageId", pageId),
      };
    } else if (pdfId) {
      // Only pdfId specified
      searchOptions = {
        vector: embedding,
        limit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: (q: any) => q.eq("pdfId", pdfId),
      };
    } else if (pageId) {
      // Only pageId specified
      searchOptions = {
        vector: embedding,
        limit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: (q: any) => q.eq("pageId", pageId),
      };
    } else {
      // No filters
      searchOptions = {
        vector: embedding,
        limit,
      };
    }

    // Perform vector search with appropriate options
    const searchResults = await ctx.vectorSearch(
      "embeddings",
      "byEmbedding",
      searchOptions
    );

    return searchResults as SearchResult[];
  },
});

// **NEW: Search in a specific document with page preference**
export const searchInDocument = internalAction({
  args: {
    query: v.string(),
    pdfId: v.id("pdfs"),
    preferPageLevel: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { query, pdfId, preferPageLevel = true }
  ): Promise<SearchResultWithData> => {
    const [embedding] = await embedTexts([query]);

    const searchResults: SearchResult[] = [];

    if (preferPageLevel) {
      // Find page-specific results with non-null pageId
      const pageResults = await ctx.vectorSearch("embeddings", "byEmbedding", {
        vector: embedding,
        limit: 12,
        // Temporarily ignore type checking for Convex's vector filter API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: (q: any) => {
          // Use direct eq + not equal pattern that's compatible with Convex's API
          // This finds all entries where pdfId matches and pageId is not null
          return q.eq("pdfId", pdfId).not(q.eq("pageId", null));
        },
      });

      searchResults.push(...(pageResults as SearchResult[]));
    }

    // If not enough page results, add document-level results
    if (searchResults.length < 8) {
      // Find chunks where pageId is null
      const docResults = await ctx.vectorSearch("embeddings", "byEmbedding", {
        vector: embedding,
        limit: 8 - searchResults.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: (q: any) => q.eq("pdfId", pdfId).eq("pageId", null),
      });

      searchResults.push(...(docResults as SearchResult[]));
    }

    // Get enhanced chunks with page metadata
    const enhancedChunks = (await ctx.runQuery(
      internal.serve.serve.getEnhancedChunks,
      {
        embeddingIds: searchResults.map((r) => r._id),
      }
    )) as EnhancedChunk[];

    // Get citation metadata
    const citations = (await ctx.runQuery(
      internal.serve.serve.getCitationMetadata,
      {
        chunks: enhancedChunks,
      }
    )) as CitationMetadata[];

    return {
      chunks: enhancedChunks,
      citations,
    };
  },
});

// Helper to format citations consistently
export const formatCitation = (citation: CitationMetadata): string => {
  if (citation.pageNumber !== null) {
    return `(${citation.filename}, p. ${citation.pageNumber})`;
  }
  return `(${citation.filename})`;
};

// Supporting mutation and query functions
export const updateRagSources = internalMutation({
  args: {
    sessionId: v.string(),
    pdfIds: v.array(v.id("pdfs")),
  },
  handler: async (ctx, { sessionId, pdfIds }) => {
    return await ctx.db.insert("ragSources", { sessionId, pdfIds });
  },
});

export const getRagSources = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("ragSources")
      .withIndex("bySessionId", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});

export const addBotMessage = internalMutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.insert("messages", {
      isUser: false,
      text: "",
      sessionId,
      timestamp: Date.now(),
    });
  },
});

export const updateBotMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
  },
  handler: async (ctx, { messageId, text }) => {
    return await ctx.db.patch(messageId, { text });
  },
});

export const saveMessage = mutation({
  args: {
    message: v.string(),
    sessionId: v.string(),
    isUser: v.boolean(),
  },
  handler: async (ctx, { message, sessionId, isUser }) => {
    // Save the message to the database
    const messageId = await ctx.db.insert("messages", {
      text: message,
      sessionId,
      isUser,
      timestamp: Date.now(),
    });
    
    // If this is a user message, trigger the AI to respond
    if (isUser) {
      await ctx.scheduler.runAfter(0, internal.serve.serve.answer, {
        sessionId,
      });
    }
    
    return messageId;
  },
});

export const saveSessionId = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.insert("chatSessions", { sessionId });
  },
});

export const retrieveMessages = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("bySessionId", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});
