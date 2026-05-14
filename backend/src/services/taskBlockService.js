import { loadDatabase, saveDatabase } from "../db/taskBlockStore.js";
import { durationMinutes, nowIso, sortByStartTime } from "../utils/time.js";

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const WINDOW_STARTS = {
  MORNING: 9 * 60,
  MIDDAY: 12 * 60,
  AFTERNOON: 15 * 60,
  EVENING: 18 * 60,
  ANYTIME: 9 * 60,
};
const WINDOW_CENTERS = {
  MORNING: 10 * 60,
  MIDDAY: 13 * 60,
  AFTERNOON: 16 * 60,
  EVENING: 19 * 60,
  ANYTIME: 14 * 60,
};
const DAY_START = 8 * 60;
const DAY_END = 22 * 60;

export function parseTaskId(pathname, suffix = "") {
  const pattern = suffix
    ? new RegExp(`^/api/task-blocks/(\\d+)${suffix}$`)
    : /^\/api\/task-blocks\/(\d+)$/;
  const match = pathname.match(pattern);
  return match ? Number(match[1]) : null;
}

export function validateTaskPayload(payload) {
  if (!payload.title || !payload.date || !payload.startTime || !payload.endTime) {
    return "Title, date, start time, and end time are required.";
  }

  if (payload.startTime >= payload.endTime) {
    return "Start time must be before end time.";
  }

  return null;
}

export function sanitizeTaskPayload(payload, existingTask = null) {
  const timestamp = nowIso();
  return {
    id: existingTask?.id ?? null,
    title: String(payload.title ?? "").trim(),
    description: String(payload.description ?? "").trim(),
    date: String(payload.date ?? ""),
    startTime: String(payload.startTime ?? ""),
    endTime: String(payload.endTime ?? ""),
    status: existingTask?.status ?? "PLANNED",
    difficulty: String(payload.difficulty ?? existingTask?.difficulty ?? "MEDIUM"),
    category: String(payload.category ?? "").trim(),
    estimatedMinutes: Number(payload.estimatedMinutes ?? existingTask?.estimatedMinutes ?? 30),
    actualMinutes: existingTask?.actualMinutes ?? null,
    arrangementReason: existingTask?.arrangementReason ?? payload.arrangementReason ?? "",
    createdAt: existingTask?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function findTask(database, taskId) {
  return database.taskBlocks.find((task) => task.id === taskId) ?? null;
}

export function getTaskBlocksByDate(database, date) {
  return sortByStartTime(database.taskBlocks.filter((task) => task.date === date));
}

export function loadTaskBlocksByDate(date) {
  return getTaskBlocksByDate(loadDatabase(), date);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, offset) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return formatDate(date);
}

function startOfWeek(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return formatDate(date);
}

function endOfWeek(dateString) {
  return addDays(startOfWeek(dateString), 6);
}

function endOfMonth(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setMonth(date.getMonth() + 1, 0);
  return formatDate(date);
}

export function getDateRange(dateString, view = "day") {
  if (view === "week") {
    return { from: startOfWeek(dateString), to: endOfWeek(dateString) };
  }

  if (view === "month") {
    const from = formatDate(new Date(`${dateString.slice(0, 7)}-01T12:00:00`));
    return { from, to: endOfMonth(dateString) };
  }

  return { from: dateString, to: dateString };
}

export function loadTaskBlocksByRange(date, view = "day") {
  const database = loadDatabase();
  const { from, to } = getDateRange(date, view);
  return sortByStartTime(
    database.taskBlocks.filter((task) => task.date >= from && task.date <= to)
  );
}

export function createTaskBlock(payload) {
  const database = loadDatabase();
  const task = sanitizeTaskPayload(payload);
  task.templateId = payload.templateId ?? null;
  task.id = database.nextId++;
  database.taskBlocks.push(task);
  saveDatabase(database);
  return task;
}

export function updateTaskBlock(taskId, payload) {
  const database = loadDatabase();
  const existingTask = findTask(database, taskId);

  if (!existingTask) {
    return null;
  }

  const nextTask = sanitizeTaskPayload(payload, existingTask);
  nextTask.id = taskId;
  nextTask.templateId = existingTask.templateId ?? payload.templateId ?? null;
  const index = database.taskBlocks.findIndex((task) => task.id === taskId);
  database.taskBlocks[index] = nextTask;
  saveDatabase(database);
  return nextTask;
}

export function listTaskTemplates() {
  const database = loadDatabase();
  return database.taskTemplates ?? [];
}

export function createTaskTemplate(payload) {
  const database = loadDatabase();
  const template = {
    id: database.nextTemplateId++,
    title: String(payload.title ?? "").trim(),
    cadence: String(payload.cadence ?? "DAILY"),
    preferredWindow: String(payload.preferredWindow ?? "ANYTIME"),
    estimatedMinutes: Number(payload.estimatedMinutes ?? 25),
    motivation: String(payload.motivation ?? "MEDIUM"),
    energy: String(payload.energy ?? "MEDIUM"),
    difficulty: String(payload.difficulty ?? "MEDIUM"),
    importance: String(payload.importance ?? "MEDIUM"),
    category: String(payload.category ?? "").trim(),
    daysOfWeek: Array.isArray(payload.daysOfWeek) ? payload.daysOfWeek : [],
    dayOfMonth: Number(payload.dayOfMonth ?? 1),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  database.taskTemplates.push(template);
  saveDatabase(database);
  return template;
}

function isTemplateDueOnDate(template, dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  if (template.cadence === "DAILY") {
    return true;
  }

  if (template.cadence === "WEEKLY") {
    const dayName = DAY_NAMES[date.getDay()];
    return template.daysOfWeek?.includes(dayName);
  }

  if (template.cadence === "MONTHLY") {
    return date.getDate() === Number(template.dayOfMonth ?? 1);
  }

  return false;
}

function rankValue(value) {
  return value === "HIGH" ? 3 : value === "MEDIUM" ? 2 : 1;
}

function rankDifficulty(value) {
  return value === "HARD" ? 3 : value === "MEDIUM" ? 2 : 1;
}

function sortTemplatesForPlanning(templates) {
  return [...templates].sort((left, right) => {
    const importanceDiff = rankValue(right.importance) - rankValue(left.importance);
    if (importanceDiff !== 0) {
      return importanceDiff;
    }
    const energyDiff = rankValue(right.energy) - rankValue(left.energy);
    if (energyDiff !== 0) {
      return energyDiff;
    }
    const difficultyDiff = rankDifficulty(right.difficulty) - rankDifficulty(left.difficulty);
    if (difficultyDiff !== 0) {
      return difficultyDiff;
    }
    return Number(right.estimatedMinutes ?? 0) - Number(left.estimatedMinutes ?? 0);
  });
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function getPlanningDates(date, view) {
  const { from, to } = getDateRange(date, view);
  const dates = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function roundToQuarter(minutes) {
  return Math.max(15, Math.ceil(minutes / 15) * 15);
}

function buildOccupiedSlots(tasks) {
  return [...tasks]
    .map((task) => ({
      start: Number(task.startTime.slice(0, 2)) * 60 + Number(task.startTime.slice(3, 5)),
      end: Number(task.endTime.slice(0, 2)) * 60 + Number(task.endTime.slice(3, 5)),
    }))
    .sort((left, right) => left.start - right.start);
}

function getDayProfile(dateString) {
  const weekday = DAY_NAMES[new Date(`${dateString}T12:00:00`).getDay()];
  return {
    weekday,
    centers: {
      MORNING: weekday === "SUNDAY" ? 9 * 60 + 30 : WINDOW_CENTERS.MORNING,
      MIDDAY: WINDOW_CENTERS.MIDDAY,
      AFTERNOON: WINDOW_CENTERS.AFTERNOON,
      EVENING: weekday === "FRIDAY" ? 17 * 60 : WINDOW_CENTERS.EVENING,
    },
  };
}

function motivationAnchor(template) {
  const motivation = rankValue(template.motivation);
  if (motivation === 1) {
    return WINDOW_CENTERS.MORNING;
  }
  if (motivation === 3) {
    return WINDOW_CENTERS.AFTERNOON;
  }
  return WINDOW_CENTERS.MIDDAY;
}

function energyAnchor(template, dayProfile) {
  const energy = rankValue(template.energy);
  if (energy === 3 || rankDifficulty(template.difficulty) === 3) {
    return dayProfile.centers.MORNING;
  }
  if (energy === 1) {
    return dayProfile.centers.AFTERNOON;
  }
  return dayProfile.centers.MIDDAY;
}

function preferredAnchor(template, dayProfile) {
  const key = template.preferredWindow in dayProfile.centers ? template.preferredWindow : "MIDDAY";
  return dayProfile.centers[key] ?? WINDOW_CENTERS.ANYTIME;
}

function getDailyCapacity(dateString) {
  const weekday = DAY_NAMES[new Date(`${dateString}T12:00:00`).getDay()];
  if (weekday === "FRIDAY" || weekday === "SATURDAY") {
    return 240;
  }
  if (weekday === "SUNDAY") {
    return 300;
  }
  return 360;
}

function getScheduledMinutes(tasks) {
  return tasks.reduce((sum, task) => sum + Number(task.estimatedMinutes ?? durationMinutes(task) ?? 0), 0);
}

function isHighFocusTemplate(template) {
  return rankValue(template.energy) === 3 || rankDifficulty(template.difficulty) === 3;
}

function isHighFocusTask(task) {
  return task.difficulty === "HARD" || Number(task.estimatedMinutes ?? 0) >= 45;
}

function scoreSlot(template, startMinutes, dateString) {
  const profile = getDayProfile(dateString);
  const startPenalty = startMinutes - DAY_START;
  const preferredPenalty = Math.abs(startMinutes - preferredAnchor(template, profile));
  const energyPenalty = Math.abs(startMinutes - energyAnchor(template, profile));
  const motivationPenalty = Math.abs(startMinutes - motivationAnchor(template));
  const importanceBoost = rankValue(template.importance) * 26;
  const easyTaskPenalty = rankDifficulty(template.difficulty) === 1 ? 30 : 0;
  const lowEnergyBoost = rankValue(template.energy) === 1 && startMinutes >= WINDOW_CENTERS.AFTERNOON ? 24 : 0;
  const morningProtectionPenalty =
    !isHighFocusTemplate(template) && startMinutes < 11 * 60 ? 85 : 0;
  const lateHighFocusPenalty =
    isHighFocusTemplate(template) && startMinutes >= 14 * 60 ? 95 : 0;

  return (
    preferredPenalty * 1.4 +
    energyPenalty * 1.1 +
    motivationPenalty * 0.8 +
    startPenalty * 0.25 +
    easyTaskPenalty -
    importanceBoost -
    lowEnergyBoost +
    morningProtectionPenalty +
    lateHighFocusPenalty
  );
}

function findBestSlot(existingTasks, template, dateString) {
  const occupied = buildOccupiedSlots(existingTasks);
  const duration = Math.max(15, roundToQuarter(Number(template.estimatedMinutes ?? 25)));
  let bestStart = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let start = DAY_START; start + duration <= DAY_END; start += 15) {
    const end = start + duration;
    const overlaps = occupied.some((slot) => start < slot.end && end > slot.start);
    if (overlaps) {
      continue;
    }

    const score = scoreSlot(template, start, dateString);
    if (score < bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  return bestStart === null
    ? null
    : {
        startMinutes: bestStart,
        endMinutes: bestStart + duration,
      };
}

function buildArrangementReason(template, dateString, slot) {
  const parts = [];
  const hour = Math.floor(slot.startMinutes / 60);

  if (isHighFocusTemplate(template)) {
    parts.push("Protected an earlier slot for a higher-energy block");
  } else if (rankValue(template.energy) === 1 && slot.startMinutes >= WINDOW_CENTERS.AFTERNOON) {
    parts.push("Placed later to match lower-energy work");
  }

  if (template.preferredWindow !== "ANYTIME") {
    parts.push(`Respected your ${template.preferredWindow.toLowerCase()} preference`);
  }

  if (rankValue(template.importance) === 3) {
    parts.push("Kept a higher-importance commitment visible");
  }

  if (rankValue(template.motivation) === 1) {
    parts.push("Put it earlier to reduce motivation friction");
  }

  if (parts.length === 0) {
    parts.push(`Placed it where ${hour < 12 ? "morning" : hour < 17 ? "midday energy" : "late-day space"} was open`);
  }

  return parts.join(". ") + ".";
}

export function arrangeTemplatesIntoRange(date, view = "day") {
  const database = loadDatabase();
  const templates = sortTemplatesForPlanning(database.taskTemplates ?? []);
  const planningDates = getPlanningDates(date, view);
  const created = [];
  const skipped = [];

  for (const dateString of planningDates) {
    const existingForDate = database.taskBlocks
      .filter((task) => task.date === dateString)
      .sort((left, right) => left.startTime.localeCompare(right.startTime));

    for (const template of templates) {
      if (!isTemplateDueOnDate(template, dateString)) {
        continue;
      }

      const alreadyScheduled = database.taskBlocks.some(
        (task) => task.templateId === template.id && task.date === dateString
      );
      if (alreadyScheduled) {
        continue;
      }

      const capacity = getDailyCapacity(dateString);
      const scheduledMinutes = getScheduledMinutes(existingForDate);
      const templateMinutes = Number(template.estimatedMinutes || 25);
      if (scheduledMinutes + templateMinutes > capacity) {
        skipped.push({
          templateId: template.id,
          title: template.title,
          date: dateString,
          reason: `Skipped to protect a softer daily load cap of ${capacity} minutes.`,
        });
        continue;
      }

      const currentHighFocusCount = existingForDate.filter(isHighFocusTask).length;
      if (isHighFocusTemplate(template) && currentHighFocusCount >= 2) {
        skipped.push({
          templateId: template.id,
          title: template.title,
          date: dateString,
          reason: "Skipped because that day already has two heavier focus blocks.",
        });
        continue;
      }

      const slot = findBestSlot(existingForDate, template, dateString);
      if (!slot) {
        skipped.push({
          templateId: template.id,
          title: template.title,
          date: dateString,
          reason: "No clean open slot fit this block without crowding the day.",
        });
        continue;
      }

      const task = {
        id: database.nextId++,
        templateId: template.id,
        title: template.title,
        description: "",
        date: dateString,
        startTime: minutesToTime(slot.startMinutes),
        endTime: minutesToTime(slot.endMinutes),
        status: "PLANNED",
        difficulty: template.difficulty,
        category: template.category,
        estimatedMinutes: Number(template.estimatedMinutes || 25),
        actualMinutes: null,
        arrangementReason: buildArrangementReason(template, dateString, slot),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      database.taskBlocks.push(task);
      existingForDate.push(task);
      existingForDate.sort((left, right) => left.startTime.localeCompare(right.startTime));
      created.push(task);
    }
  }

  saveDatabase(database);
  return { created, skipped };
}

export function deleteTaskBlock(taskId) {
  const database = loadDatabase();
  const nextTasks = database.taskBlocks.filter((task) => task.id !== taskId);

  if (nextTasks.length === database.taskBlocks.length) {
    return false;
  }

  database.taskBlocks = nextTasks;
  saveDatabase(database);
  return true;
}

export function deleteTaskBlocksInRange(date, view = "day") {
  const database = loadDatabase();
  const { from, to } = getDateRange(date, view);
  const beforeCount = database.taskBlocks.length;

  database.taskBlocks = database.taskBlocks.filter(
    (task) => task.date < from || task.date > to
  );

  const deletedCount = beforeCount - database.taskBlocks.length;
  saveDatabase(database);

  return {
    deletedCount,
    range: { from, to },
    view,
  };
}

export function getWhatNow(date, time) {
  const database = loadDatabase();
  const tasks = getTaskBlocksByDate(database, date);
  const activeTask = tasks.find((task) => task.status === "ACTIVE") ?? null;
  const currentTask = activeTask
    ?? tasks.find((task) => task.status !== "DONE" && task.status !== "MISSED" && task.startTime <= time && task.endTime >= time)
    ?? null;

  const nextTask = tasks.find((task) => {
    if (currentTask && task.id === currentTask.id) {
      return false;
    }
    return task.status !== "DONE" && task.status !== "MISSED" && task.startTime >= time;
  }) ?? null;

  let message = "No guidance yet. Add a block to get started.";
  if (currentTask?.status === "ACTIVE") {
    message = `Stay with "${currentTask.title}" until this block is done.`;
  } else if (currentTask) {
    message = `This looks like the right block to start: "${currentTask.title}".`;
  } else if (nextTask) {
    message = `Your next realistic block is "${nextTask.title}".`;
  } else if (tasks.length > 0) {
    message = "The visible blocks for this day are complete or skipped.";
  }

  return { message, currentTask, nextTask };
}

export function updateTaskStatus(taskId, action) {
  const database = loadDatabase();
  const task = findTask(database, taskId);

  if (!task) {
    return null;
  }

  task.status = action === "start" ? "ACTIVE" : action === "complete" ? "DONE" : "MISSED";
  if (action === "complete") {
    task.actualMinutes = task.actualMinutes ?? task.estimatedMinutes ?? durationMinutes(task);
  }
  task.updatedAt = nowIso();
  saveDatabase(database);
  return task;
}

export function diagnoseHardToStartMode(task) {
  const title = (task.title ?? "").toLowerCase();
  const description = (task.description ?? "").toLowerCase();
  const category = (task.category ?? "").toLowerCase();

  if (Number(task.estimatedMinutes ?? 0) >= 75) {
    return "TOO_BIG";
  }
  if (task.difficulty === "HARD") {
    return "TOO_HARD";
  }
  if (
    ["wait", "reply", "email", "call", "ask", "follow up", "research"].some((keyword) =>
      title.includes(keyword) || description.includes(keyword)
    )
  ) {
    return "BLOCKED";
  }
  if (task.title.trim().length < 8 || task.description.trim().length === 0) {
    return "TOO_VAGUE";
  }
  if (
    ["admin", "chores", "email", "calls", "errands"].some((keyword) =>
      category.includes(keyword) || title.includes(keyword)
    )
  ) {
    return "FRICTION";
  }
  return "LOW_ENERGY";
}

export function buildHardToStartResponse(task) {
  const mode = diagnoseHardToStartMode(task);
  const response = {
    taskBlockId: task.id,
    mode,
    headline: "",
    reason: "",
    firstStep: "",
    backupStep: "",
    suggestedMinutes: null,
    ctaLabel: "",
    suggestions: [],
    ritualName: "",
    setupStep: "",
    permissionSlip: "",
    momentumLine: "",
    rescueChoices: [],
  };

  if (mode === "TOO_BIG") {
    response.headline = "This block is probably too big to start whole.";
    response.reason = "Long blocks feel heavier to enter, even when the work itself is fine.";
    response.firstStep = "Do only the setup or first visible slice.";
    response.backupStep = "Shrink it into a 15-minute starter block.";
    response.suggestedMinutes = 15;
    response.ctaLabel = "Start small";
    response.ritualName = "Shrink the beast";
    response.setupStep = "Open only the exact tab, document, or object needed for the first slice.";
    response.permissionSlip = "You are not starting the whole task. You are only opening the door.";
    response.momentumLine = "A smaller target gives your brain a safer on-ramp.";
    response.rescueChoices = [
      "Rename this block as only the first slice.",
      "Cut the block down to 15 minutes and stop on purpose.",
    ];
    response.suggestions = [
      "Open the materials you need and stop there if needed.",
      "Judge success by starting the first slice, not finishing the whole block.",
    ];
  } else if (mode === "TOO_HARD") {
    response.headline = "Lower the bar for the first pass.";
    response.reason = "Hard tasks often need an easier doorway, not more pressure.";
    response.firstStep = "Make a rough version with no quality standard.";
    response.backupStep = "Give it five messy minutes and allow that to count.";
    response.suggestedMinutes = 5;
    response.ctaLabel = "Do a rough first pass";
    response.ritualName = "Bad first draft";
    response.setupStep = "Create a throwaway version or scratchpad where quality does not matter.";
    response.permissionSlip = "You are allowed to do this badly and still call it progress.";
    response.momentumLine = "Perfection pressure is often the real blocker, not the task.";
    response.rescueChoices = [
      "Make the ugliest version possible first.",
      "Do one sentence, one bullet, or one tiny example.",
    ];
    response.suggestions = [
      "Aim for motion, not polish.",
      "Start badly on purpose to break the freeze.",
    ];
  } else if (mode === "BLOCKED") {
    response.headline = "You may be blocked, not lazy.";
    response.reason = "This task sounds like it depends on missing input, someone else, or a prep step.";
    response.firstStep = "Do the unblock step first: send the message, gather the missing thing, or clarify the dependency.";
    response.backupStep = "Turn it into a shorter prep block instead of forcing the full task.";
    response.suggestedMinutes = 10;
    response.ctaLabel = "Unblock it";
    response.ritualName = "Unblock before effort";
    response.setupStep = "Write the missing ingredient in one line before you do anything else.";
    response.permissionSlip = "Prep counts. Clarifying counts. Sending the unblock message counts.";
    response.momentumLine = "Being blocked is different from being avoidant.";
    response.rescueChoices = [
      "Send the message now and stop there.",
      "Convert this into a prep block instead of pretending it is execution.",
    ];
    response.suggestions = [
      "List what is missing in one sentence.",
      "Finish the unblock step, not the whole original block.",
    ];
  } else if (mode === "TOO_VAGUE") {
    response.headline = "The next visible action is still fuzzy.";
    response.reason = "Vague task wording makes your brain keep re-deciding where to start.";
    response.firstStep = "Rewrite this as one concrete action you can see yourself doing.";
    response.backupStep = "Name the first file, tab, room, or person involved.";
    response.suggestedMinutes = 10;
    response.ctaLabel = "Make it concrete";
    response.ritualName = "Name the next visible move";
    response.setupStep = "Turn the title into a verb plus object you can picture.";
    response.permissionSlip = "You do not need a full plan. You need one visible next move.";
    response.momentumLine = "Your brain starts faster when the opening scene is obvious.";
    response.rescueChoices = [
      "Rename the block to the first action only.",
      "Write: open ___ and do ___.",
    ];
    response.suggestions = [
      "Use a verb plus object in the title.",
      "Choose the first visible move only.",
    ];
  } else if (mode === "FRICTION") {
    response.headline = "This looks less hard than annoying.";
    response.reason = "Friction tasks often fail because they feel tedious, ambiguous, or interruptive.";
    response.firstStep = "Set up the environment so the task is already half-started.";
    response.backupStep = "Do a two-minute ugly version just to break resistance.";
    response.suggestedMinutes = 10;
    response.ctaLabel = "Break friction";
    response.ritualName = "Grease the slide";
    response.setupStep = "Put the thing in front of your face: inbox open, number dialed, form loaded, bag by the door.";
    response.permissionSlip = "This only needs to become easier, not impressive.";
    response.momentumLine = "Annoying tasks get easier when the setup is already done.";
    response.rescueChoices = [
      "Do only the opening admin move.",
      "Race the task for two minutes and stop if needed.",
    ];
    response.suggestions = [
      "Reduce clicks, tabs, and setup before asking for focus.",
      "Treat this like a friction problem, not a character flaw.",
    ];
  } else {
    response.headline = "Start tiny and borrow momentum.";
    response.reason = "The task looks reasonable, so the blocker is probably activation energy.";
    response.firstStep = "Work on it for five minutes only.";
    response.backupStep = "Open the work and do one visible action.";
    response.suggestedMinutes = 5;
    response.ctaLabel = "Start for 5 minutes";
    response.ritualName = "Tiny launch";
    response.setupStep = "Put the work in view and begin before your brain starts negotiating.";
    response.permissionSlip = "You do not need to feel ready to begin.";
    response.momentumLine = "Starting changes the feeling faster than thinking about starting.";
    response.rescueChoices = [
      "Promise only five minutes.",
      "Do one visible move and let that be enough for now.",
    ];
    response.suggestions = [
      "Make the opening step almost too small to resist.",
      "You are allowed to stop after the first five minutes.",
    ];
  }

  return response;
}

export function getHardToStartResponse(taskId) {
  const database = loadDatabase();
  const task = findTask(database, taskId);
  return task ? buildHardToStartResponse(task) : null;
}
