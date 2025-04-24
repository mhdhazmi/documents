import { httpRouter } from "convex/server";
import { cleanHnadler } from "./api";
import { httpAction } from "./_generated/server";

const http = httpRouter();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

const corsHeaders = {
  "Access-Control-Allow-Origin": CLIENT_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // optional: tell browsers to cache this preflight for a day
  "Access-Control-Max-Age": "86400",
};

http.route({
    path: "/clean",
    method: "OPTIONS",
    handler: httpAction(async () => {
      return new Response(null, { headers: new Headers(corsHeaders) });
    }),
  });

http.route({
    path: "/clean",
    method: "POST",
    handler: cleanHnadler
});

export default http;