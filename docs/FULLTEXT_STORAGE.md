# Full Text Storage for OCR Results

## Overview

This document explains the implementation of persistent storage for cleaned page text. Previously, the UI relied on streaming OCR cleaned text from the server each time a page was viewed, which added unnecessary latency to the experience, especially for returning users.

With these changes, the full cleaned text is now stored in the database and retrieved efficiently when a page is loaded, eliminating the need for re-streaming.

## Implementation Details

### Schema Updates

The `openaiCleanedPage` table schema has been extended to include a `fullText` field:

```typescript
openaiCleanedPage: defineTable({
  pageId: v.id("pages"),
  cleanedText: v.string(),        // Maintains backward compatibility (stores snippet)
  fullText: v.optional(v.string()), // Stores the complete text content
  processedAt: v.number(),
  cleaningStatus: v.union(v.literal("started"), v.literal("completed")),
  source: v.union(v.literal("gemini"), v.literal("replicate")),
})
```

The `PdfPageInfo` type has also been updated to include the `fullText` field:

```typescript
export type PdfPageInfo = {
  pageId: Id<"pages">;
  pageNumber: number;
  geminiStatus: OcrStatus;
  replicateStatus: OcrStatus;
  cleanedSnippet: string | null;
  fullText?: string | null;      // New field for complete cleaned text
};
```

### Data Flow

1. **Page Cleaning Process**
   
   The `savePageCleanedResults` mutation stores both a snippet and the full text:
   
   ```typescript
   // Create a snippet for backwards compatibility
   const cleanedSnippet = args.cleanedText.substring(0, 160) + (args.cleanedText.length > 160 ? '…' : '');
   
   // Store both snippet and full text
   await ctx.db.patch(existingJob._id, {
     cleanedText: cleanedSnippet,    // Store only the snippet in cleanedText
     fullText: args.cleanedText,     // Store full text in the new field
     cleaningStatus: args.cleaningStatus,
     processedAt: Date.now(),
   });
   ```

2. **Page Query Updates**
   
   The query functions have been updated to include the `fullText` field when returning page information:
   
   ```typescript
   return {
     page,
     cleanedText: cleanedResult.cleanedText,
     fullText: cleanedResult.fullText || cleanedResult.cleanedText,
     cleaningStatus: cleanedResult.cleaningStatus,
   };
   ```

3. **Client Side Integration**
   
   The `useKickClean` hook has been enhanced to check for the existence of `fullText` before initiating streaming:
   
   ```typescript
   // If we have fullText stored in the database and cleaning is completed,
   // use it directly without streaming
   if (
     fullText && 
     cleaningStatus === "completed" && 
     !hasChunk && 
     !isInFlight
   ) {
     console.log(`Using stored fullText for ${src} clean of page ${pageId}`);
     setChunk(key, fullText);
   }
   ```

4. **UI Component Updates**
   
   The `StreamedTextBox` component now gives priority to stored full text when rendering:
   
   ```typescript
   // Determine if we have text to display - either from streaming or from stored fullText
   const displayText = chunks || (instantLoad ? fullText : "");
   const hasDisplayableText = !!displayText && displayText.length > 0;
   ```

## Benefits

1. **Improved Performance**: Pages with completed OCR load instantly without the need for streaming requests.
2. **Reduced Server Load**: Streaming requests are only made for newly processed pages, not for pages that have been viewed before.
3. **Better User Experience**: Users see page content immediately upon navigation instead of waiting for streaming to complete.
4. **Preserved Functionality**: The snippet is still stored for backward compatibility and for services that only need a preview.

## Migration and Backward Compatibility

- The implementation maintains backward compatibility with existing code.
- Older records without `fullText` will continue to work, falling back to the `cleanedText` field when needed.
- New records will store both a snippet in `cleanedText` and the complete content in `fullText`.

## Testing

To test the implementation:

1. Complete OCR processing on a PDF
2. Reload the page and observe that cleaned text appears instantly
3. Check browser network tab to confirm that no streaming requests are made for pages with stored `fullText`
4. Verify that the snippet feature still works for search indexing and previews