// convex/files/mutations.ts
import { mutation } from "../_generated/server";

// Public mutation: Called by the client to get a URL to upload a file *to*.
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    try {
      const uploadUrl = await ctx.storage.generateUploadUrl();
      console.log("Generated upload URL.");
      return uploadUrl;
    } catch {
      throw new Error("Could not create upload URL, please try again later.");
    }
  

  },
});