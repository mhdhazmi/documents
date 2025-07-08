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
import { streamText, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { openai as openaiConfig, reranker as rerankerConfig } from "../config";

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

// Enhanced logging for observability (Convex-compatible)
const logRagStep = (step: string, data: any) => {
  console.log(`[RAG-${step}]`, JSON.stringify(data, null, 2));
};

// LLM-based reranking function
const rerankDocuments = async (
  query: string, 
  chunks: EnhancedChunk[], 
  citations: CitationMetadata[]
): Promise<{ chunks: EnhancedChunk[], citations: CitationMetadata[], rerankScores?: number[] }> => {
  // Check if reranking is enabled
  if (!rerankerConfig.enabled) {
    logRagStep("RERANKER_DISABLED", { chunksCount: chunks.length });
    return { chunks, citations };
  }

  // Limit to top N documents for cost efficiency
  const documentsToRerank = Math.min(chunks.length, rerankerConfig.maxDocuments);
  if (chunks.length <= 1 || documentsToRerank <= 1) {
    logRagStep("RERANKER_SKIPPED", { reason: "too_few_documents", chunksCount: chunks.length });
    return { chunks, citations };
  }

  const startTime = Date.now();
  
  try {
    // Prepare documents for reranking (limit to first N)
    const chunksToRerank = chunks.slice(0, documentsToRerank);
    const citationsToRerank = citations.slice(0, documentsToRerank);
    
    // Format documents for the reranker prompt
    const documentsText = chunksToRerank.map((chunk, index) => 
      `Document ${index + 1}: ${chunk.text.substring(0, 500)}...`
    ).join('\n\n');

    const userPrompt = rerankerConfig.userPromptTemplate
      .replace('{query}', query)
      .replace('{documents}', documentsText);

    logRagStep("RERANKER_REQUEST", { 
      query, 
      documentsCount: documentsToRerank,
      model: rerankerConfig.model 
    });

    // Call GPT-4o-mini for reranking
    const result = await generateText({
      model: openai(rerankerConfig.model),
      messages: [
        { role: "system", content: rerankerConfig.systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: rerankerConfig.temperature,
      maxTokens: 100, // Short response expected
    });

    // Parse the response
    let scores: number[];
    try {
      // Extract JSON array from response
      const jsonMatch = result.text.match(/\[[\d,\s]+\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      scores = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(scores) || scores.length !== documentsToRerank) {
        throw new Error(`Expected ${documentsToRerank} scores, got ${scores?.length || 0}`);
      }
    } catch (parseError) {
      console.error("Failed to parse reranker response:", result.text, parseError);
      logRagStep("RERANKER_PARSE_ERROR", { 
        response: result.text, 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
      return { chunks, citations }; // Return original order on parse failure
    }

    // Create sorted indices based on scores (highest first)
    const sortedIndices = scores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.index);

    // Reorder chunks and citations based on scores
    const rerankedChunks = [
      ...sortedIndices.map(i => chunksToRerank[i]), // Reranked documents first
      ...chunks.slice(documentsToRerank) // Remaining documents in original order
    ];
    
    const rerankedCitations = [
      ...sortedIndices.map(i => citationsToRerank[i]), // Reranked citations first
      ...citations.slice(documentsToRerank) // Remaining citations in original order
    ];

    const duration = Date.now() - startTime;
    logRagStep("RERANKER_SUCCESS", { 
      originalScores: scores,
      reorderedIndices: sortedIndices,
      durationMs: duration,
      documentsReranked: documentsToRerank
    });

    return { chunks: rerankedChunks, citations: rerankedCitations, rerankScores: scores };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logRagStep("RERANKER_ERROR", { 
      error: errorMessage,
      durationMs: duration,
      fallbackToOriginal: true
    });
    
    console.error("Reranking failed, falling back to original order:", error);
    return { chunks, citations }; // Return original order on any error
  }
};

// RAG pipeline with enhanced logging
const enhancedRAGPipeline = async (ctx: any, sessionId: string, lastUserMessage: string, messageId: any) => {
  try {
    // Step 1: Embed the user's question
    logRagStep("QUESTION", { 
      sessionId, 
      question: lastUserMessage,
      timestamp: new Date().toISOString()
    });
    
    const [embedding] = await embedTexts([lastUserMessage]);
    logRagStep("EMBEDDING", { 
      embeddingLength: embedding.length,
      questionLength: lastUserMessage.length
    });

    // Step 2: Retrieve relevant documents
    const searchResults = await ctx.vectorSearch(
      "embeddings",
      "byEmbedding",
      {
        vector: embedding,
        limit: 25,
      }
    );

    logRagStep("RETRIEVAL", { 
      searchResultsCount: searchResults.length,
      scores: searchResults.map((r: any) => r._score)
    });

    if (searchResults.length === 0) {
      logRagStep("NO_RESULTS", { sessionId });
      await ctx.runMutation(internal.serve.serve.updateBotMessage, {
        messageId,
        text: "I couldn't find any relevant information in the documents to answer your question. Could you please rephrase or ask about something covered in the uploaded documents?",
      });
      return { success: false, reason: "No relevant documents found" };
    }

    // Step 3: Get enhanced chunks with metadata
    const relevantChunks = (await ctx.runQuery(
      internal.serve.serve.getEnhancedChunks,
      {
        embeddingIds: searchResults.map((result: any) => result._id),
      }
    ));

    // Step 4: Get citation information
    const citations = (await ctx.runQuery(
      internal.serve.serve.getCitationMetadata,
      {
        chunks: relevantChunks,
      }
    ));

    // Step 5: Rerank documents using LLM (if enabled)
    const { chunks: rerankedChunks, citations: rerankedCitations, rerankScores } = await rerankDocuments(
      lastUserMessage,
      relevantChunks,
      citations
    );

    // Step 6: Prepare context and log retrieved documents (using reranked results)
    const contextMessages = rerankedChunks.map((chunk: any, index: number) => {
      const citation = rerankedCitations[index];
      const citationText = citation.pageNumber
        ? `(${citation.filename}, p. ${citation.pageNumber})`
        : `(${citation.filename})`;

      return {
        role: "system" as const,
        content: `Relevant document ${citationText}:\n\n${chunk.text}`,
      };
    });
    
    // Log the retrieved documents for observability (using reranked results)
    const retrievedDocs = rerankedChunks.map((chunk: any, index: number) => ({
      filename: rerankedCitations[index].filename,
      pageNumber: rerankedCitations[index].pageNumber,
      textPreview: chunk.text.substring(0, 200) + "...",
      chunkId: chunk._id,
      rerankScore: rerankScores && index < rerankScores.length ? rerankScores[index] : undefined,
    }));

    logRagStep("CONTEXT", { 
      retrievedDocsCount: retrievedDocs.length,
      documents: retrievedDocs.map((doc: any) => ({
        filename: doc.filename,
        pageNumber: doc.pageNumber,
        textLength: doc.textPreview.length
      }))
    });

    // Update sources for UI (using reranked results)
    const relevantPdfs = rerankedChunks.map((chunk: any) => chunk.pdfId);
    const uniqueRelevantPdfs = [...new Set(relevantPdfs)];
    await ctx.runMutation(internal.serve.serve.updateRagSources, {
      sessionId,
      pdfIds: uniqueRelevantPdfs,
    });

    return {
      success: true,
      contextMessages,
      retrievedDocs,
      searchResults: searchResults.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logRagStep("ERROR", { 
      error: errorMessage,
      sessionId,
      step: "RAG_PIPELINE"
    });
    return { success: false, reason: "RAG pipeline error", error: errorMessage };
  }
};

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
      
      // Use the enhanced RAG pipeline with logging
      try {
        const ragResult = await enhancedRAGPipeline(ctx, sessionId, lastUserMessage, messageId);
        
        if (!ragResult.success) {
          // Error message already set in the pipeline
          return;
        }
        
        const { contextMessages, retrievedDocs } = ragResult;

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
        
        // Prepare the complete messages array for OpenAI
        const systemMessage = {
          role: "system" as const,
          content: `You are a helpful assistant that answers questions based on provided documents. 
          When you reference specific information, please include the citation in the format "(Filename.pdf, p. 5)" 
          or "(Filename.pdf)" if no specific page is referenced. 
          Keep your answers informative but concise. If you don't know the answer, say so.`,
        };

        const allOpenAIMessages = [
          systemMessage,
          ...(contextMessages || []),
          ...conversationMessages,
        ];
        
        // Start streaming the response
        logRagStep("LLM_REQUEST", {
          model: openaiConfig.streamingModel,
          temperature: openaiConfig.temperature,
          contextMessagesCount: contextMessages?.length || 0,
          conversationLength: conversationMessages.length
        });

        const result = streamText({
          model: openai(openaiConfig.streamingModel),
          messages: allOpenAIMessages,
          temperature: openaiConfig.temperature,
        });

        // Stream the response and update the message incrementally
        let fullText = "";
        let chunkCount = 0;
        const startTime = Date.now();
        
        for await (const chunk of result.textStream) {
          fullText += chunk;
          chunkCount++;
          
          // Update the bot message with each new chunk
          await ctx.runMutation(internal.serve.serve.updateBotMessage, {
            messageId,
            text: fullText,
          });
        }
        
        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        
        logRagStep("LLM_RESPONSE", {
          responseLength: fullText.length,
          chunkCount,
          durationMs: totalDuration,
          sessionId
        });

        // Store trace data for LangSmith
        if (retrievedDocs && retrievedDocs.length > 0) {
          console.log("Storing RAG trace data for LangSmith...");
          try {
            await ctx.runMutation(internal.serve.serve.storeRAGTrace, {
              sessionId,
              traceData: {
                sessionId,
                question: lastUserMessage,
                retrievedDocs,
                searchResultsCount: ragResult.searchResults || 0,
                responseLength: fullText.length,
                durationMs: totalDuration,
                timestamp: Date.now(),
                // OpenAI context data
                openaiMessages: allOpenAIMessages,
                openaiModel: openaiConfig.streamingModel,
                openaiTemperature: openaiConfig.temperature,
                contextMessagesCount: contextMessages?.length || 0,
              }
            });
            console.log("RAG trace data stored successfully");
          } catch (traceError) {
            console.error("Failed to store RAG trace data:", traceError);
            // Don't fail the main request if tracing fails
          }
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

export const getHighQualitySources = query({
  args: {
    sessionId: v.string(),
    minRerankScore: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, minRerankScore = 7 }) => {
    // Get the latest RAG trace for this session
    const ragTraces = await ctx.db
      .query("ragTraces")
      .withIndex("bySessionId", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .take(1);
    
    if (ragTraces.length === 0) {
      return [];
    }
    
    const latestTrace = ragTraces[0];
    
    // Filter retrieved docs by rerank score if available
    const highQualityDocs = latestTrace.retrievedDocs.filter((doc: any) => {
      // If rerank score is available, filter by minimum score
      if (doc.rerankScore !== undefined) {
        return doc.rerankScore >= minRerankScore;
      }
      // If no rerank score, include all docs (fallback for backward compatibility)
      return true;
    });
    
    // Extract unique filenames from high quality docs
    const uniqueFilenames = [...new Set(highQualityDocs.map((doc: any) => doc.filename))];
    
    // Get PDF metadata for these filenames
    const pdfs = await Promise.all(
      uniqueFilenames.map(async (filename) => {
        const pdf = await ctx.db
          .query("pdfs")
          .filter((q) => q.eq(q.field("filename"), filename))
          .first();
        return pdf;
      })
    );
    
    const validPdfs = pdfs.filter(Boolean);
    const pdfIds = validPdfs.map(pdf => pdf!._id);
    
    return {
      pdfIds: pdfIds,
      pdfs: validPdfs,
      docsCount: highQualityDocs.length,
      minScore: minRerankScore
    };
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
    title: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, title }) => {
    // Check if session already exists
    const existingSession = await ctx.db
      .query("chatSessions")
      .withIndex("bySessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
    
    if (existingSession) {
      // Update existing session
      return await ctx.db.patch(existingSession._id, {
        updatedAt: Date.now(),
        isActive: true,
        ...(title && { title }),
      });
    }
    
    // Create new session
    return await ctx.db.insert("chatSessions", {
      sessionId,
      title: title || "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
    });
  },
});

export const getChatSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("chatSessions")
      .withIndex("byIsActive", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();
  },
});

export const getChatSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("chatSessions")
      .withIndex("bySessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
  },
});

export const updateChatSession = mutation({
  args: {
    sessionId: v.string(),
    title: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionId, title, isActive }) => {
    const session = await ctx.db
      .query("chatSessions")
      .withIndex("bySessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
    
    if (!session) {
      throw new Error("Session not found");
    }
    
    return await ctx.db.patch(session._id, {
      ...(title && { title }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: Date.now(),
    });
  },
});

export const deleteChatSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    // Mark session as inactive instead of deleting
    const session = await ctx.db
      .query("chatSessions")
      .withIndex("bySessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
    
    if (session) {
      await ctx.db.patch(session._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }
    
    return session;
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

// Store RAG trace data for LangSmith
export const storeRAGTrace = internalMutation({
  args: {
    sessionId: v.string(),
    traceData: v.object({
      sessionId: v.string(),
      question: v.string(),
      retrievedDocs: v.array(v.object({
        filename: v.string(),
        pageNumber: v.union(v.number(), v.null()),
        textPreview: v.string(),
        chunkId: v.string(),
        rerankScore: v.optional(v.number()),
      })),
      searchResultsCount: v.number(),
      responseLength: v.number(),
      durationMs: v.number(),
      timestamp: v.number(),
      // OpenAI context data
      openaiMessages: v.optional(v.array(v.object({
        role: v.string(),
        content: v.string(),
      }))),
      openaiModel: v.optional(v.string()),
      openaiTemperature: v.optional(v.number()),
      contextMessagesCount: v.optional(v.number()),
    })
  },
  handler: async (ctx, { sessionId, traceData }) => {
    return await ctx.db.insert("ragTraces", {
      ...traceData,
      sentToLangSmith: false,
    });
  },
});

// Get pending RAG traces for LangSmith
export const getPendingRAGTraces = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ragTraces")
      .withIndex("bySentToLangSmith", (q) => q.eq("sentToLangSmith", false))
      .take(10); // Limit to 10 at a time
  },
});

// Mark RAG trace as sent to LangSmith
export const markRAGTraceSent = mutation({
  args: {
    traceId: v.id("ragTraces"),
  },
  handler: async (ctx, { traceId }) => {
    return await ctx.db.patch(traceId, { sentToLangSmith: true });
  },
});
