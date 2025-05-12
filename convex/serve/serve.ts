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
    // Get messages and process the last user message
    const messages = (await ctx.runQuery(api.serve.serve.retrieveMessages, {
      sessionId,
    })) as Message[];

    // If no messages, return early
    if (!messages.length) {
      console.error("No messages found for session:", sessionId);
      return;
    }

    const lastUserMessage = messages.at(-1)!.text;
    console.log("Processing user message:", lastUserMessage);

    // Create a message placeholder for the bot response
    const messageId = await ctx.runMutation(
      internal.serve.serve.addBotMessage,
      {
        sessionId,
      }
    );

    try {
      // 1. Search for relevant documents using vector search
      const [embedding] = await embedTexts([lastUserMessage]);

      // **NEW: Page-aware vector search**
      const searchResults = (await ctx.vectorSearch(
        "embeddings",
        "byEmbedding",
        {
          vector: embedding,
          limit: 8, // Increased limit to get more results
        }
      )) as SearchResult[];

      if (searchResults.length === 0) {
        await ctx.runMutation(internal.serve.serve.updateBotMessage, {
          messageId,
          text: "I couldn't find any relevant information in the documents to answer your question. Could you please rephrase or ask about something covered in the uploaded documents?",
        });
        return;
      }

      // **NEW: Get enhanced chunks with page metadata**
      const relevantChunks = (await ctx.runQuery(
        internal.serve.serve.getEnhancedChunks,
        {
          embeddingIds: searchResults.map((result) => result._id),
        }
      )) as EnhancedChunk[];

      console.log(
        `Found ${relevantChunks.length} relevant chunks with page info`
      );

      // **NEW: Get citation metadata for all chunks**
      const citations = (await ctx.runQuery(
        internal.serve.serve.getCitationMetadata,
        {
          chunks: relevantChunks,
        }
      )) as CitationMetadata[];

      // Extract and update PDF IDs
      const relevantPdfs = relevantChunks.map(
        (chunk: EnhancedChunk) => chunk.pdfId
      );
      const uniqueRelevantPdfs = [...new Set(relevantPdfs)];

      await ctx.runMutation(internal.serve.serve.updateRagSources, {
        sessionId,
        pdfIds: uniqueRelevantPdfs,
      });

      // **NEW: Prepare context with citations**
      const contextWithCitations = relevantChunks.map((chunk, index) => {
        const citation = citations[index];
        const citationText = citation.pageNumber
          ? `(${citation.filename}, p. ${citation.pageNumber})`
          : `(${citation.filename})`; // Fallback for document-level chunks

        return {
          role: "system" as const,
          content: `Content from ${citationText}:\n\n${chunk.text}`,
        };
      });

      // Use OpenAI's streaming API via Vercel AI SDK
      const result = streamText({
        model: openai("gpt-4o"),
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that answers questions based on provided documents. 
            When you reference specific information, please include the citation in the format "(Filename.pdf, p. 5)" 
            or "(Filename.pdf)" if no specific page is referenced. 
            Keep your answers informative but concise. If the information comes from multiple pages or 
            documents, include multiple citations. The content you receive already includes citations, 
            so you can reference them in your response.`,
          },
          ...contextWithCitations,
          ...messages.map((msg: Message) => ({
            role: (msg.isUser ? "user" : "assistant") as "user" | "assistant",
            content: msg.text,
          })),
        ],
      });

      // Stream the response and update the message incrementally
      let fullText = "";
      for await (const textPart of result.textStream) {
        fullText += textPart;

        // Update the bot message as new text chunks arrive
        await ctx.runMutation(internal.serve.serve.updateBotMessage, {
          messageId,
          text: fullText,
        });
      }

      console.log("Completed streaming response with page citations");
    } catch (error) {
      console.error("Error in streaming response:", error);

      // Update with error message
      await ctx.runMutation(internal.serve.serve.updateBotMessage, {
        messageId,
        text: "Sorry, I encountered an error while generating a response. Please try again.",
      });

      throw error;
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
    await ctx.db.insert("messages", {
      text: message,
      sessionId,
      isUser,
      timestamp: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.serve.serve.answer, {
      sessionId,
    });
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
