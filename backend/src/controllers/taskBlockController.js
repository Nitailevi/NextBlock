import { sendEmpty, sendError, sendJson } from "../http.js";
import {
  arrangeTemplatesIntoRange,
  buildHardToStartResponse,
  createTaskBlock,
  createTaskTemplate,
  deleteTaskBlocksInRange,
  deleteTaskBlock,
  findTask,
  getDateRange,
  getWhatNow,
  loadTaskBlocksByDate,
  loadTaskBlocksByRange,
  listTaskTemplates,
  updateTaskBlock,
  updateTaskStatus,
  validateTaskPayload,
} from "../services/taskBlockService.js";
import { loadDatabase } from "../db/taskBlockStore.js";
import { nowIso } from "../utils/time.js";

export function healthCheck(_request, response) {
  sendJson(response, 200, {
    status: "ok",
    service: "nextblock-backend",
    time: nowIso(),
  });
}

export function listTaskBlocks(_request, response, { date }) {
  sendJson(response, 200, loadTaskBlocksByDate(date));
}

export function listTaskBlocksByRange(_request, response, { date, view }) {
  const range = getDateRange(date, view);
  sendJson(response, 200, {
    view,
    range,
    taskBlocks: loadTaskBlocksByRange(date, view),
  });
}

export async function createTaskBlockAction(request, response, { parseBody }) {
  const payload = await parseBody(request);
  const validationError = validateTaskPayload(payload);
  if (validationError) {
    sendError(response, 400, validationError);
    return;
  }

  sendJson(response, 201, createTaskBlock(payload));
}

export function listTaskTemplatesAction(_request, response) {
  sendJson(response, 200, listTaskTemplates());
}

export async function createTaskTemplateAction(request, response, { parseBody }) {
  const payload = await parseBody(request);
  if (!payload.title) {
    sendError(response, 400, "Template title is required.");
    return;
  }

  sendJson(response, 201, createTaskTemplate(payload));
}

export function arrangeTemplatesAction(_request, response, { date, view }) {
  if (!date) {
    sendError(response, 400, "Date is required.");
    return;
  }

  const result = arrangeTemplatesIntoRange(date, view);
  sendJson(response, 200, {
    createdCount: result.created.length,
    skippedCount: result.skipped.length,
    taskBlocks: result.created,
    skipped: result.skipped,
  });
}

export async function updateTaskBlockAction(request, response, { taskId, parseBody }) {
  const payload = await parseBody(request);
  const validationError = validateTaskPayload(payload);
  if (validationError) {
    sendError(response, 400, validationError);
    return;
  }

  const task = updateTaskBlock(taskId, payload);
  if (!task) {
    sendError(response, 404, "Task block not found.");
    return;
  }

  sendJson(response, 200, task);
}

export function deleteTaskBlockAction(_request, response, { taskId }) {
  const deleted = deleteTaskBlock(taskId);
  if (!deleted) {
    sendError(response, 404, "Task block not found.");
    return;
  }

  sendEmpty(response, 204);
}

export function deleteTaskBlocksInRangeAction(_request, response, { date, view }) {
  if (!date) {
    sendError(response, 400, "Date is required.");
    return;
  }

  const result = deleteTaskBlocksInRange(date, view);
  sendJson(response, 200, result);
}

export function methodNotAllowed(_request, response, { message }) {
  sendError(response, 405, message);
}

export function whatNowAction(_request, response, { date, time }) {
  sendJson(response, 200, getWhatNow(date, time));
}

export function updateTaskStatusAction(_request, response, { taskId, action }) {
  const task = updateTaskStatus(taskId, action);
  if (!task) {
    sendError(response, 404, "Task block not found.");
    return;
  }

  sendJson(response, 200, task);
}

export function hardToStartAction(_request, response, { taskId }) {
  const database = loadDatabase();
  const task = findTask(database, taskId);
  if (!task) {
    sendError(response, 404, "Task block not found.");
    return;
  }

  sendJson(response, 200, buildHardToStartResponse(task));
}

export function notFound(_request, response) {
  sendError(response, 404, "Not found.");
}
