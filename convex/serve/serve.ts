// convex/chat.ts
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { streamText } from 'ai';
import { openai } from "@ai-sdk/openai";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";


interface Message {
  isUser: boolean;
  text: string;
  timestamp: number;
}

interface Chunk {
  text: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// List messages for a chat session
export const getMessages = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, { sessionId }) => {
    console.log("Getting messages for session:", sessionId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("bySessionId", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .collect();
    return messages;
  }
});

// Get chunks for a PDF
export const getChunks = internalQuery({
  args: { pdfId: v.id("pdfs") },
  handler: async (ctx, { pdfId }) => {
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("byPdfId", (q) => q.eq("pdfId", pdfId))
      .collect();
    return chunks;
  }
});

// Update bot message
export const updateBotMessage = internalMutation({
  args: { messageId: v.id("messages"), text: v.string() },
  handler: async (ctx, { messageId, text } ) => {
    await ctx.db.patch(messageId, { text });
  }
});

// Get session
export const getSession = internalQuery({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  }
});

// Create message
export const createMessage = internalMutation({
  args: { sessionId: v.id("chatSessions"), isUser: v.boolean(), text: v.string() },
  handler: async (ctx, { sessionId, isUser, text }) => {
    return await ctx.db.insert("messages", { 
      sessionId, 
      isUser, 
      text,
      timestamp: Date.now()
    });
  }
});

// Answer question
export const generateAnswer = action({
  args: { sessionId: v.id("chatSessions"), question: v.string() },
  handler: async (
    ctx,
    { sessionId, question }
  ): Promise<{ messageId: Id<"messages"> }> => {
    try {
      console.log("Generating answer for session:", sessionId);
      
      // Get session
      const session = await ctx.runQuery(internal.serve.serve.getSession, { sessionId });
      if (!session) {
        console.error("Session not found:", sessionId);
        throw new Error("Session not found");
      }

      // Get conversation history
      const messages = await ctx.runQuery(api.serve.serve.getMessages, { sessionId });
      const conversationHistory: ChatMessage[] = messages.map((m: Message) => ({
        role: m.isUser ? "user" : "assistant",
        content: m.text,
      }));

      // Create new message
      const messageId = await ctx.runMutation(internal.serve.serve.createMessage, {
        sessionId,
        isUser: false,
        text: "",
      });

      // Add user's question to conversation history
      conversationHistory.push({
        role: "user",
        content: question,
      });

      // Search for relevant chunks
      const searchResults = await ctx.runQuery(internal.serve.serve.getChunks, {
        pdfId: session.pdfId,
      });

      const relevantChunks = searchResults.filter((chunk: Chunk) => chunk.text.length > 0);
      console.log(`Found ${relevantChunks.length} relevant chunks`);

      // Generate response using Vercel AI SDK
      const { textStream } = streamText({
        model: openai('gpt-4-turbo'),
        messages: [
          {
            role: "system" as const,
            content: "You are a helpful assistant that answers questions about the PDF document. " +
                    "Use only the information from the provided document excerpts. " +
                    "If the question cannot be answered from the provided context, say so."
          },
          ...relevantChunks.map((chunk: Chunk) => ({
            role: "system" as const,
            content: "Document excerpt: " + chunk.text
          })),
          ...conversationHistory
        ],
      });

      let fullText = "";
      for await (const textPart of textStream) {
        fullText += textPart;
        // Update the message as we receive more content
        await ctx.runMutation(internal.serve.serve.updateBotMessage, {
          messageId,
          text: fullText,
        });
      }

      return { messageId };
    } catch (error) {
      console.error("Error in answer:", error);
      throw error;
    }
  }
});

// Send a message and get an AI response
export const send = mutation({
  args: {
    message: v.string(),
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, { message, sessionId }) => {
    console.log("Sending message for session:", sessionId);
    
    // Save user message
    await ctx.db.insert("messages", {
      sessionId,
      isUser: true,
      text: message,
      timestamp: Date.now(),
    });
    
    // Trigger AI response generation
    await ctx.scheduler.runAfter(0, api.serve.serve.generateAnswer, {
      sessionId,
      question: message,
    });
  },
});

// Create a new chat session
export const createSession = mutation({
  args: {
    pdfId: v.id("pdfs"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Creating session for PDF:", args.pdfId);
    
    // Verify the PDF exists
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {
      console.error("PDF not found:", args.pdfId);
      throw new Error(`PDF with ID ${args.pdfId} not found`);
    }
    
    const sessionId = await ctx.db.insert("chatSessions", {
      pdfId: args.pdfId,
      userId: args.userId,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    });
    
    console.log("Created session:", sessionId);
    return sessionId;
  },
});

// Helper mutations
export const addBotMessage = internalMutation({
  args: { 
    sessionId: v.id("chatSessions"),
    message: v.string(),
  },
  handler: async (ctx, { sessionId, message }) => {
    return await ctx.db.insert("messages", {
      sessionId,
      isUser: false,
      text: message,
      timestamp: Date.now(),
    });
  },
});

export const addUserMessage = mutation({
  args: { 
    sessionId: v.id("chatSessions"),
    message: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, { sessionId, message, timestamp }) => {
    return await ctx.db.insert("messages", {
      sessionId,
      isUser: true,
      text: message,
      timestamp,
    });
  },
});