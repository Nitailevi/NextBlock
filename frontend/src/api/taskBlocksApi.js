const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? `http://${defaultHost}:8080/api/task-blocks`;
const TEMPLATE_URL = BASE_URL.replace("/api/task-blocks", "/api/task-templates");

const TASKS_KEY = "nextblock-local-task-blocks";
const TEMPLATES_KEY = "nextblock-local-task-templates";
const TASK_ID_KEY = "nextblock-local-task-id";
const TEMPLATE_ID_KEY = "nextblock-local-template-id";
const REQUEST_TIMEOUT_MS = 1200;

function readStoredJson(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function nextId(key) {
  if (typeof window === "undefined") {
    return Date.now();
  }

  const current = Number(window.localStorage.getItem(key) ?? "1000");
  const nextValue = current + 1;
  window.localStorage.setItem(key, String(nextValue));
  return nextValue;
}

function getLocalTasks() {
  return readStoredJson(TASKS_KEY, []);
}

function setLocalTasks(tasks) {
  writeStoredJson(TASKS_KEY, tasks);
}

function getLocalTemplates() {
  return readStoredJson(TEMPLATES_KEY, []);
}

function setLocalTemplates(templates) {
  writeStoredJson(TEMPLATES_KEY, templates);
}

function sortTasks(tasks) {
  return [...tasks].sort((left, right) => {
    const dateDiff = left.date.localeCompare(right.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    const timeDiff = left.startTime.localeCompare(right.startTime);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return Number(left.id) - Number(right.id);
  });
}

function withSeconds(timeValue) {
  if (!timeValue) {
    return "09:00:00";
  }

  return timeValue.length === 5 ? `${timeValue}:00` : timeValue;
}

function parseMinutes(timeValue) {
  const [hours, minutes] = withSeconds(timeValue).slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function addMinutes(timeValue, minutesToAdd) {
  return formatMinutes(parseMinutes(timeValue) + minutesToAdd);
}

function getDurationMinutes(task) {
  const duration = parseMinutes(task.endTime) - parseMinutes(task.startTime);
  return duration > 0 ? duration : Number(task.estimatedMinutes ?? 25);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

function buildRange(date, view) {
  const anchor = new Date(`${date}T12:00:00`);

  if (view === "week") {
    const day = anchor.getDay();
    const diffToSunday = day;
    const from = new Date(anchor);
    from.setDate(anchor.getDate() - diffToSunday);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      view,
    };
  }

  if (view === "month") {
    const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
    const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      view,
    };
  }

  return { from: date, to: date, view: "day" };
}

function isTaskInRange(task, range) {
  return task.date >= range.from && task.date <= range.to;
}

function statusRank(status) {
  if (status === "ACTIVE") {
    return 0;
  }
  if (status === "PLANNED") {
    return 1;
  }
  if (status === "MISSED") {
    return 2;
  }
  return 3;
}

function computeWhatNow(date, time, tasks = getLocalTasks()) {
  const dayTasks = sortTasks(tasks.filter((task) => task.date === date));
  const timeMinutes = parseMinutes(time);

  const currentTask =
    dayTasks.find((task) => task.status === "ACTIVE")
    ?? dayTasks.find(
      (task) =>
        task.status !== "DONE" &&
        task.status !== "MISSED" &&
        parseMinutes(task.startTime) <= timeMinutes &&
        parseMinutes(task.endTime) >= timeMinutes
    )
    ?? null;

  const nextTask =
    dayTasks.find(
      (task) =>
        task.status === "PLANNED" &&
        parseMinutes(task.startTime) >= timeMinutes &&
        (!currentTask || task.id !== currentTask.id)
    )
    ?? dayTasks.find((task) => task.status === "PLANNED")
    ?? null;

  let message = "No guidance yet. Add a block to get started.";
  if (currentTask) {
    message = `Stay with "${currentTask.title}" until the block is done.`;
  } else if (nextTask) {
    message = `The cleanest next move is "${nextTask.title}".`;
  } else if (dayTasks.length > 0) {
    message = "This day is mostly wrapped. Keep the rest light.";
  }

  return {
    currentTask,
    nextTask,
    message,
  };
}

function readJson(response, fallbackMessage) {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const contentLength = response.headers.get("content-length");

  if (contentLength === "0" || !contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isOfflineLikeError(error) {
  return error instanceof TypeError || error?.name === "AbortError";
}

function normalizeTaskInput(taskBlock) {
  const now = new Date().toISOString();
  return {
    title: taskBlock.title,
    description: taskBlock.description ?? "",
    date: taskBlock.date ?? todayIso(),
    startTime: withSeconds(taskBlock.startTime),
    endTime: withSeconds(taskBlock.endTime),
    status: taskBlock.status ?? "PLANNED",
    difficulty: taskBlock.difficulty ?? "MEDIUM",
    category: taskBlock.category ?? "",
    estimatedMinutes: Number(taskBlock.estimatedMinutes ?? 25),
    actualMinutes: Number(taskBlock.actualMinutes ?? 0),
    importance: taskBlock.importance ?? "MEDIUM",
    energy: taskBlock.energy ?? "MEDIUM",
    motivation: taskBlock.motivation ?? "MEDIUM",
    arrangementReason: taskBlock.arrangementReason ?? "",
    createdAt: taskBlock.createdAt ?? now,
    updatedAt: now,
  };
}

function createLocalTask(taskBlock) {
  const nextTask = {
    id: nextId(TASK_ID_KEY),
    ...normalizeTaskInput(taskBlock),
  };
  const tasks = sortTasks([...getLocalTasks(), nextTask]);
  setLocalTasks(tasks);
  return nextTask;
}

function updateLocalTaskRecord(id, patch) {
  const tasks = getLocalTasks();
  const nextTasks = tasks.map((task) =>
    Number(task.id) === Number(id)
      ? {
          ...task,
          ...patch,
          id: task.id,
          updatedAt: new Date().toISOString(),
        }
      : task
  );
  setLocalTasks(sortTasks(nextTasks));
  return nextTasks.find((task) => Number(task.id) === Number(id)) ?? null;
}

function deleteLocalTaskRecord(id) {
  const tasks = getLocalTasks();
  const nextTasks = tasks.filter((task) => Number(task.id) !== Number(id));
  setLocalTasks(nextTasks);
}

function applyLocalTaskAction(id, action) {
  const tasks = getLocalTasks();
  const activeId = action === "start" ? Number(id) : null;
  const nextTasks = tasks.map((task) => {
    if (action === "start" && task.status === "ACTIVE" && Number(task.id) !== Number(id)) {
      return {
        ...task,
        status: "PLANNED",
        updatedAt: new Date().toISOString(),
      };
    }

    if (Number(task.id) !== Number(id)) {
      return task;
    }

    if (action === "start") {
      return { ...task, status: "ACTIVE", updatedAt: new Date().toISOString() };
    }
    if (action === "complete") {
      return {
        ...task,
        status: "DONE",
        actualMinutes: getDurationMinutes(task),
        updatedAt: new Date().toISOString(),
      };
    }
    if (action === "miss") {
      return { ...task, status: "MISSED", updatedAt: new Date().toISOString() };
    }

    return task;
  });

  setLocalTasks(sortTasks(nextTasks));
  return nextTasks.find((task) => Number(task.id) === activeId || Number(task.id) === Number(id)) ?? null;
}

function normalizeTemplateInput(template) {
  return {
    title: template.title,
    cadence: template.cadence ?? "DAILY",
    preferredWindow: template.preferredWindow ?? "ANYTIME",
    estimatedMinutes: Number(template.estimatedMinutes ?? 25),
    motivation: template.motivation ?? "MEDIUM",
    energy: template.energy ?? "MEDIUM",
    difficulty: template.difficulty ?? "MEDIUM",
    importance: template.importance ?? "MEDIUM",
    category: template.category ?? "",
    daysOfWeek: template.daysOfWeek ?? ["MONDAY"],
    dayOfMonth: Number(template.dayOfMonth ?? 1),
    createdAt: new Date().toISOString(),
  };
}

function createLocalTemplate(template) {
  const nextTemplate = {
    id: nextId(TEMPLATE_ID_KEY),
    ...normalizeTemplateInput(template),
  };
  const templates = [...getLocalTemplates(), nextTemplate];
  setLocalTemplates(templates);
  return nextTemplate;
}

function listDatesInRange(range) {
  const dates = [];
  const cursor = new Date(`${range.from}T12:00:00`);
  const end = new Date(`${range.to}T12:00:00`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function matchesTemplateDate(template, date) {
  const target = new Date(`${date}T12:00:00`);

  if (template.cadence === "DAILY") {
    return true;
  }

  if (template.cadence === "WEEKLY") {
    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return (template.daysOfWeek ?? []).includes(dayNames[target.getDay()]);
  }

  if (template.cadence === "MONTHLY") {
    return target.getDate() === Number(template.dayOfMonth ?? 1);
  }

  return false;
}

function getWindowStartMinutes(preferredWindow) {
  if (preferredWindow === "MORNING") {
    return 8 * 60;
  }
  if (preferredWindow === "MIDDAY") {
    return 12 * 60;
  }
  if (preferredWindow === "AFTERNOON") {
    return 15 * 60;
  }
  if (preferredWindow === "EVENING") {
    return 18 * 60;
  }
  return 9 * 60;
}

function arrangeLocalTemplates(date, view) {
  const range = buildRange(date, view);
  const templates = getLocalTemplates();
  const tasks = getLocalTasks();
  const created = [];
  const skipped = [];
  const nextTasks = [...tasks];

  for (const targetDate of listDatesInRange(range)) {
    const dayTasks = sortTasks(nextTasks.filter((task) => task.date === targetDate));
    let cursorMinutes = dayTasks.length > 0
      ? Math.max(...dayTasks.map((task) => parseMinutes(task.endTime))) + 15
      : 0;

    for (const template of templates) {
      if (!matchesTemplateDate(template, targetDate)) {
        continue;
      }

      const alreadyExists = dayTasks.some((task) => task.templateId === template.id);
      if (alreadyExists) {
        skipped.push({
          templateId: template.id,
          title: template.title,
          date: targetDate,
          reason: "Already placed for this date.",
        });
        continue;
      }

      const preferredStart = getWindowStartMinutes(template.preferredWindow);
      cursorMinutes = Math.max(cursorMinutes, preferredStart);
      const duration = Number(template.estimatedMinutes ?? 25);
      const endMinutes = cursorMinutes + duration;

      if (endMinutes > 22 * 60) {
        skipped.push({
          templateId: template.id,
          title: template.title,
          date: targetDate,
          reason: "No honest room left in this day.",
        });
        continue;
      }

      const task = {
        id: nextId(TASK_ID_KEY),
        title: template.title,
        description: "",
        date: targetDate,
        startTime: formatMinutes(cursorMinutes),
        endTime: formatMinutes(endMinutes),
        status: "PLANNED",
        difficulty: template.difficulty,
        category: template.category,
        estimatedMinutes: duration,
        actualMinutes: 0,
        importance: template.importance,
        energy: template.energy,
        motivation: template.motivation,
        arrangementReason: `Placed in the ${template.preferredWindow.toLowerCase()} window.`,
        templateId: template.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      nextTasks.push(task);
      dayTasks.push(task);
      created.push(task);
      cursorMinutes = endMinutes + 15;
    }
  }

  setLocalTasks(sortTasks(nextTasks));
  return {
    createdCount: created.length,
    skippedCount: skipped.length,
    created,
    skipped,
  };
}

export async function fetchTaskBlocksByDate(date) {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}?date=${date}`);
    return await readJson(response, "Failed to fetch task blocks");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    return sortTasks(getLocalTasks().filter((task) => task.date === date));
  }
}

export async function fetchTaskBlocksByRange(date, view) {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/range?date=${date}&view=${view}`);
    return await readJson(response, "Failed to fetch task blocks for this range");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    const range = buildRange(date, view);
    return {
      taskBlocks: sortTasks(getLocalTasks().filter((task) => isTaskInRange(task, range))),
      range,
    };
  }
}

export async function clearTaskBlocksInRange(date, view) {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/range?date=${date}&view=${view}`, {
      method: "DELETE",
    });

    return await readJson(response, "Failed to clear task blocks in this range");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    const range = buildRange(date, view);
    const tasks = getLocalTasks();
    const kept = tasks.filter((task) => !isTaskInRange(task, range));
    const deletedCount = tasks.length - kept.length;
    setLocalTasks(kept);
    return { deletedCount };
  }
}

export async function createTaskBlock(taskBlock) {
  try {
    const response = await fetchWithTimeout(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskBlock),
    });

    return await readJson(response, "Failed to create task block");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    return createLocalTask(taskBlock);
  }
}

export async function updateTaskBlock(id, taskBlock) {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskBlock),
    });

    return await readJson(response, "Failed to update task block");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    return updateLocalTaskRecord(id, normalizeTaskInput(taskBlock));
  }
}

export async function fetchWhatNow(date, time) {
  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/actions/what-now?date=${date}&time=${time}`
    );

    return await readJson(response, "Failed to fetch what now");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    return computeWhatNow(date, time);
  }
}

export async function updateTaskStatus(id, action) {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/${id}/${action}`, {
      method: "POST",
    });

    return await readJson(response, `Failed to ${action} task block`);
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    return applyLocalTaskAction(id, action);
  }
}

export async function deleteTaskBlock(id) {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/${id}`, {
      method: "DELETE",
    });

    return await readJson(response, "Failed to delete task block");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    deleteLocalTaskRecord(id);
    return null;
  }
}

export async function fetchHardToStartSuggestions(id) {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/${id}/hard-to-start`, {
      method: "POST",
    });

    return await readJson(response, "Failed to fetch hard-to-start suggestions");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    return null;
  }
}

export async function fetchTaskTemplates() {
  try {
    const response = await fetchWithTimeout(TEMPLATE_URL);
    return await readJson(response, "Failed to fetch planning templates");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    return getLocalTemplates();
  }
}

export async function createTaskTemplate(template) {
  try {
    const response = await fetchWithTimeout(TEMPLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(template),
    });

    return await readJson(response, "Failed to create planning template");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    return createLocalTemplate(template);
  }
}

export async function arrangeTaskTemplates(date, view) {
  try {
    const response = await fetchWithTimeout(`${TEMPLATE_URL}/arrange?date=${date}&view=${view}`, {
      method: "POST",
    });

    return await readJson(response, "Failed to arrange planning templates");
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    return arrangeLocalTemplates(date, view);
  }
}
