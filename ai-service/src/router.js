import { HOST, OPENAI_MODEL, PORT, PROVIDER } from "./config.js";
import { parseBody, sendEmpty, sendError, sendJson } from "./http.js";
import {
  createArrangeAdvice,
  createConsult,
  createDayPlan,
  createUnstuckConsult,
  getProviderMeta,
} from "./services/aiCoachService.js";

export async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const { pathname } = url;

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204);
    return;
  }

  if (request.method === "GET" && pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      service: "nextblock-ai-service",
      host: HOST,
      port: PORT,
      provider: PROVIDER,
      model: OPENAI_MODEL,
      ...getProviderMeta(),
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/ai/day-plan") {
    const payload = await parseBody(request);
    sendJson(response, 200, await createDayPlan(payload));
    return;
  }

  if (request.method === "POST" && pathname === "/api/ai/smart-arrange") {
    const payload = await parseBody(request);
    sendJson(response, 200, await createArrangeAdvice(payload));
    return;
  }

  if (request.method === "POST" && pathname === "/api/ai/consult") {
    const payload = await parseBody(request);
    sendJson(response, 200, await createConsult(payload));
    return;
  }

  if (request.method === "POST" && pathname === "/api/ai/unstuck-consult") {
    const payload = await parseBody(request);
    sendJson(response, 200, await createUnstuckConsult(payload));
    return;
  }

  sendError(response, 404, "Not found.");
}
