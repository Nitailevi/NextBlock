import { parseBody, sendEmpty } from "./http.js";
import {
  arrangeTemplatesAction,
  createTaskBlockAction,
  createTaskTemplateAction,
  deleteTaskBlockAction,
  deleteTaskBlocksInRangeAction,
  hardToStartAction,
  healthCheck,
  listTaskBlocks,
  listTaskBlocksByRange,
  listTaskTemplatesAction,
  methodNotAllowed,
  notFound,
  updateTaskBlockAction,
  updateTaskStatusAction,
  whatNowAction,
} from "./controllers/taskBlockController.js";
import {
  parseTaskId,
} from "./services/taskBlockService.js";

export async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const { pathname, searchParams } = url;

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204);
    return;
  }

  if (request.method === "GET" && pathname === "/health") {
    healthCheck(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/task-blocks") {
    const date = searchParams.get("date");
    listTaskBlocks(request, response, { date });
    return;
  }

  if (request.method === "GET" && pathname === "/api/task-blocks/range") {
    const date = searchParams.get("date");
    const view = searchParams.get("view") ?? "day";
    listTaskBlocksByRange(request, response, { date, view });
    return;
  }

  if (request.method === "DELETE" && pathname === "/api/task-blocks/range") {
    const date = searchParams.get("date");
    const view = searchParams.get("view") ?? "day";
    deleteTaskBlocksInRangeAction(request, response, { date, view });
    return;
  }

  if (request.method === "POST" && pathname === "/api/task-blocks") {
    await createTaskBlockAction(request, response, { parseBody });
    return;
  }

  if (request.method === "GET" && pathname === "/api/task-templates") {
    listTaskTemplatesAction(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/task-templates") {
    await createTaskTemplateAction(request, response, { parseBody });
    return;
  }

  if (request.method === "POST" && pathname === "/api/task-templates/arrange") {
    const date = searchParams.get("date");
    const view = searchParams.get("view") ?? "day";
    arrangeTemplatesAction(request, response, { date, view });
    return;
  }

  const updateTaskId = parseTaskId(pathname);
  if (request.method === "PUT" && updateTaskId !== null) {
    await updateTaskBlockAction(request, response, { taskId: updateTaskId, parseBody });
    return;
  }

  const deleteTaskId = parseTaskId(pathname);
  if (request.method === "DELETE" && deleteTaskId !== null) {
    deleteTaskBlockAction(request, response, { taskId: deleteTaskId });
    return;
  }

  if (request.method === "POST" && pathname === "/api/task-blocks/actions/what-now") {
    methodNotAllowed(request, response, { message: "Use GET for this endpoint." });
    return;
  }

  if (request.method === "GET" && pathname === "/api/task-blocks/actions/what-now") {
    const date = searchParams.get("date");
    const time = searchParams.get("time") ?? "09:00:00";
    whatNowAction(request, response, { date, time });
    return;
  }

  for (const action of ["start", "complete", "miss"]) {
    const taskId = parseTaskId(pathname, `/${action}`);
    if (request.method === "POST" && taskId !== null) {
      updateTaskStatusAction(request, response, { taskId, action });
      return;
    }
  }

  const hardToStartTaskId = parseTaskId(pathname, "/hard-to-start");
  if (request.method === "POST" && hardToStartTaskId !== null) {
    hardToStartAction(request, response, { taskId: hardToStartTaskId });
    return;
  }

  notFound(request, response);
}
