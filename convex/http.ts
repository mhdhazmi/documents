import { httpRouter } from "convex/server";
import { cleanHandler } from "./api";

const http = httpRouter();


http.route({
  path: "/clean",
  method: "POST",
  handler: cleanHandler
});
http.route({
  path: "/clean",
  method: "OPTIONS",
  handler: cleanHandler   // httpAction will catch OPTIONS itself
});

export default http;