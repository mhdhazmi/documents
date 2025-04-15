// convex/files/mutations.ts
import { mutation } from "../_generated/server";

// Public mutation: Called by the client to get a URL to upload a file *to*.
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    // TODO: Add authorization check if only logged-in users should upload.
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) { throw new Error("Authentication required to upload files."); }

    // TODO: Add checks based on args if implementing restrictions.
    // if (args.expectedContentType && ...)

  
    const uploadUrl = await ctx.storage.generateUploadUrl();

    console.log("Generated upload URL.");
    return uploadUrl; 
  },
});