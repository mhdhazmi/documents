import { internalAction, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { embedTexts } from "../ingest/ingest";
import { asyncMap } from "modern-async";
import { streamText } from 'ai';
import { openai } from "@ai-sdk/openai";

// Type definitions
interface Message {
  id?: Id<"messages">;
  isUser: boolean;
  text: string;
  sessionId?: string;
  timestamp: number;
}

interface Chunk {
  _id: Id<"chunks">;
  pdfId: Id<"pdfs">;
  text: string;
  embeddingId: Id<"embeddings"> | null;
}

export const updateRagSources = internalMutation(
  async (ctx, { sessionId, pdfIds }: { sessionId: string, pdfIds: Id<"pdfs">[] }) => {
    return await ctx.db.insert("ragSources", { sessionId, pdfIds });
  }
);

export const getRagSources = query(
  async (ctx, { sessionId }: { sessionId: string }) => {
    return await ctx.db.query("ragSources").withIndex("bySessionId", (q) => q.eq("sessionId", sessionId)).collect();
  }
);

export const getChunks = internalQuery(
  async (ctx, { embeddingIds }: { embeddingIds: Id<"embeddings">[] }) => {
    return await asyncMap(
      embeddingIds,
      async (embeddingId: Id<"embeddings">) =>
        (await ctx.db
          .query("chunks")
          .withIndex("byEmbeddingId", (q) => q.eq("embeddingId", embeddingId))
          .unique())!
    );
  }
);

export const addBotMessage = internalMutation(
  async (ctx, { sessionId }: { sessionId: string }) => {
    return await ctx.db.insert("messages", {
      isUser: false,
      text: "",
      sessionId,
      timestamp: Date.now(),
    });
  }
);

export const updateBotMessage = internalMutation(
  async (ctx, { messageId, text }: { messageId: Id<"messages">, text: string }) => {
    return await ctx.db.patch(messageId, { text });
  }
);

export const answer = internalAction({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    // Get messages and process the last user message
    const messages = await ctx.runQuery(api.serve.serve.retrieveMessages, {
      sessionId,
    }) as Message[];
    
    // If no messages, return early
    if (!messages.length) {
      console.error("No messages found for session:", sessionId);
      return;
    }
    
    const lastUserMessage = messages.at(-1)!.text;
    console.log("Processing user message:", lastUserMessage);
    
    // Generate embedding for the query
    const [embedding] = await embedTexts([lastUserMessage]);
    
    // Search for relevant documents
    const searchResults = await ctx.vectorSearch("embeddings", "byEmbedding", {
      vector: embedding,
      limit: 8,
    });

    if (searchResults.length === 0) {
      const messageId = await ctx.runMutation(internal.serve.serve.addBotMessage, {
        sessionId,
      });
      
      await ctx.runMutation(internal.serve.serve.updateBotMessage, {
        messageId,
        text: "I couldn't find any relevant information in the documents to answer your question. Could you please rephrase or ask about something covered in the uploaded documents?",
      });
      
      return;
    }

    // Get the relevant documents
    const relevantDocuments = await ctx.runQuery(internal.serve.serve.getChunks, {
      embeddingIds: searchResults.map((result) => result._id),
    }) as Chunk[];

    console.log(`Found ${relevantDocuments.length} relevant chunks`);
    
    // Extract and update PDF IDs
    const relevantPdfs = relevantDocuments.map((doc) => doc.pdfId);
    const uniqueRelevantPdfs = [...new Set(relevantPdfs)];
    
    await ctx.runMutation(internal.serve.serve.updateRagSources, {
      sessionId,
      pdfIds: uniqueRelevantPdfs,
    });
    
    // Create a message placeholder for the bot response
    const messageId = await ctx.runMutation(internal.serve.serve.addBotMessage, {
      sessionId,
    });
    
    console.log("Created message ID:", messageId);

    try {
      // Initialize the streaming text generation
      const result = streamText({
        model: openai('gpt-4o'),
        messages: [
          {
            role: "system",
            content:
              "Answer the user question based on the provided documents " +
              "or report that the question cannot be answered based on " +
              "these documents. Keep the answer informative but brief, " +
              "do not enumerate all possibilities.",
          },
          ...relevantDocuments.map((doc) => ({
            role: "system" as const,
            content: "Relevant document:\n\n" + doc.text,
          })),
          ...messages.map((msg) => ({
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
      
      console.log("Completed streaming response");

    } catch (error) {
      console.error("Error in streaming response:", error);
      
      // Update with error message
      await ctx.runMutation(internal.serve.serve.updateBotMessage, {
        messageId,
        text: "Sorry, I encountered an error while generating a response. Please try again.",
      });
      
      throw error;
    }
  }
});

export const saveMessage = mutation({
  args: {
    message: v.string(),
    sessionId: v.string(),
    isUser: v.boolean(),
  },
  handler: async (ctx, { message, sessionId, isUser }) => {
     await ctx.db.insert("messages", { text: message, sessionId, isUser, timestamp: Date.now() });
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
    return await ctx.db.query("messages").withIndex("bySessionId", (q) => q.eq("sessionId", sessionId)).collect();
  },
});