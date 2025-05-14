import { httpRouter } from "convex/server";
import { cleanPageHandler, firstPageHandler } from "./api";

const http = httpRouter();

// Legacy route "/clean" has been removed

http.route({
  path: "/cleanPage",
  method: "POST",
  handler: cleanPageHandler
});
http.route({
  path: "/cleanPage",
  method: "OPTIONS",
  handler: cleanPageHandler   // httpAction will catch OPTIONS itself
});

// Route for first page prioritized OCR
http.route({
  path: "/firstPage",
  method: "POST",
  handler: firstPageHandler
});
http.route({
  path: "/firstPage",
  method: "OPTIONS",
  handler: firstPageHandler   // httpAction will catch OPTIONS itself
});

export default http;