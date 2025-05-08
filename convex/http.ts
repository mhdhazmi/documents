import { httpRouter } from "convex/server";
import { cleanHandler, cleanPageHandler } from "./api";

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


http.route({
  path: "/clean_page",
  method: "POST",
  handler: cleanPageHandler
});
http.route({
  path: "/clean_page",
  method: "OPTIONS",
  handler: cleanPageHandler   // httpAction will catch OPTIONS itself
});

export default http;