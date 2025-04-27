import { httpRouter } from "convex/server";
import { cleanHnadler } from "./api";

const http = httpRouter();


http.route({
  path: "/clean",
  method: "POST",
  handler: cleanHnadler
});
http.route({
  path: "/clean",
  method: "OPTIONS",
  handler: cleanHnadler   // httpAction will catch OPTIONS itself
});

export default http;