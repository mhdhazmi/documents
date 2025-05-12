// convex/files/queries.ts
import { query } from "../_generated/server";
import { v } from "convex/values";

// Query to get a short-lived downloadable URL for a file stored in Convex storage.
export const getFileDownloadUrl = query({
  args: {
    fileId: v.id("_storage"), // Changed to use v.id for proper storage ID validation
  },
  handler: async (ctx, args) => {
    try {
      const url = await ctx.storage.getUrl(args.fileId);
      if (!url) {
        console.warn(
          `Could not generate download URL for fileId: ${args.fileId}. File might not exist.`
        );
        throw new Error("Unable to generate download URL right now.");
      }
      return url;
    } catch (error) {
      console.error(
        `Error generating download URL for fileId ${args.fileId}:`,
        error
      );
      throw new Error("Failed to generate download URL.");
    }
  },
});
