// import { query } from "./_generated/server";
// import { v } from "convex/values";


// export const fileId = query({
//     args:{ id: v.string()},
//     handler: async(ctx, args) => {
//         const fileId = await ctx.db.query("messages")
//         .filter(q => q.eq(q.field("body"), args.id))
//         .first();
//         return fileId.body;
//     }
// })

// export const getFileUrl = query({
//   args: {
//     storageId: v.id("_storage"),
//   },
//   handler: async (ctx, args) => {
//     if (!args.storageId) {
//       return null;
//     }
//     const url = await ctx.storage.getUrl(args.storageId);
//     return url; // Returns string | null
//   },
// });