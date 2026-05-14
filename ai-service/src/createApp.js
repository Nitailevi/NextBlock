import { createServer } from "node:http";
import { handleRequest } from "./router.js";
import { sendError } from "./http.js";

export function createApp() {
  return createServer(async (request, response) => {
    try {
      await handleRequest(request, response);
    } catch (error) {
      console.error(error);
      sendError(response, 500, error.message || "Unexpected AI service error.");
    }
  });
}
