function rankValue(value) {
  return value === "HIGH" || value === "HARD" ? 3 : value === "MEDIUM" ? 2 : 1;
}

function sortByPriority(tasks) {
  return [...tasks].sort((left, right) => {
    const importanceDiff =
      rankValue(right.importance ?? right.priority ?? "MEDIUM")
      - rankValue(left.importance ?? left.priority ?? "MEDIUM");
    if (importanceDiff !== 0) {
      return importanceDiff;
    }

    const energyDiff =
      rankValue(right.energy ?? "MEDIUM") - rankValue(left.energy ?? "MEDIUM");
    if (energyDiff !== 0) {
      return energyDiff;
    }

    return Number(right.estimatedMinutes ?? 0) - Number(left.estimatedMinutes ?? 0);
  });
}

export function generateLocalDayPlan(payload) {
  const tasks = sortByPriority(payload.tasks ?? []);
  const focusTask =
    tasks.find(
      (task) => task.status !== "DONE" && (task.difficulty === "HARD" || task.energy === "HIGH")
    )
    ?? tasks.find((task) => task.status !== "DONE")
    ?? null;
  const frictionTask =
    tasks.find(
      (task) => task.status !== "DONE" && (task.energy === "LOW" || task.motivation === "LOW")
    )
    ?? null;

  return {
    mode: "day-plan",
    headline: focusTask
      ? `Protect ${focusTask.title} as the anchor block.`
      : "Start by placing one honest anchor block.",
    focusBlock: focusTask
      ? {
          title: focusTask.title,
          reason: "It carries the strongest mix of importance and focus demand.",
        }
      : null,
    suggestions: [
      focusTask
        ? `Place "${focusTask.title}" before the day gets noisy.`
        : "Create one short anchor block before planning the rest.",
      frictionTask
        ? `Pair "${frictionTask.title}" with a low-friction setup ritual.`
        : "Leave some lower-energy admin work for later in the day.",
      "Keep 15 to 30 minutes of slack instead of packing every slot.",
    ],
    risks: [
      tasks.length > 6
        ? "This day is carrying a lot of cognitive switching."
        : "Avoid overfilling the day with tiny leftovers.",
      focusTask && frictionTask
        ? "Do not put your hardest block after too many annoying tasks."
        : "Protect your first meaningful block from drift.",
    ],
    encouragement: "A good plan for an ADHD brain is believable, not perfect.",
    source: "built-in",
  };
}

export function generateLocalUnstuckPlan(task) {
  const title = task?.title ?? "this block";
  const estimatedMinutes = Number(task?.estimatedMinutes ?? 0);
  const difficulty = task?.difficulty ?? "MEDIUM";
  const category = String(task?.category ?? "").toLowerCase();

  if (estimatedMinutes >= 60) {
    return {
      mode: "TOO_BIG",
      headline: `Make ${title} smaller before you ask yourself to start it.`,
      reason: "Large blocks feel heavier than they need to.",
      firstStep: "Do only the first visible slice or setup move.",
      backupStep: "Shrink it to a 15-minute entry block.",
      suggestedMinutes: 15,
      ctaLabel: "Start smaller",
      ritualName: "Shrink the beast",
      setupStep: "Open only the exact tab, tool, or file needed for the first slice.",
      permissionSlip: "You are not committing to the whole task right now.",
      momentumLine: "A smaller doorway makes starting safer.",
      rescueChoices: [
        "Rename the block to the first slice only.",
        "Set a 15-minute timer and stop on purpose.",
      ],
      suggestions: [
        "Judge success by beginning, not finishing.",
        "Keep the first move concrete and visible.",
      ],
      source: "built-in",
    };
  }

  if (difficulty === "HARD") {
    return {
      mode: "TOO_HARD",
      headline: `Lower the bar for ${title}.`,
      reason: "Hard tasks often need an easier opening, not more force.",
      firstStep: "Make a rough first pass with no quality standard.",
      backupStep: "Do five messy minutes and let that count.",
      suggestedMinutes: 5,
      ctaLabel: "Do a rough first pass",
      ritualName: "Messy launch",
      setupStep: "Open a scratchpad or throwaway version first.",
      permissionSlip: "Bad first drafts are allowed here.",
      momentumLine: "Perfection pressure is often the real blocker.",
      rescueChoices: [
        "Make the ugly version first.",
        "Do one sentence, one bullet, or one tiny example.",
      ],
      suggestions: [
        "Motion beats polish at the start.",
        "Give yourself permission to stop after five honest minutes.",
      ],
      source: "built-in",
    };
  }

  if (category.includes("admin") || category.includes("email") || category.includes("home")) {
    return {
      mode: "FRICTION",
      headline: `This looks more annoying than impossible.`,
      reason: "Friction tasks usually need less setup and less resistance.",
      firstStep: "Put the task right in front of your face so it is half-started.",
      backupStep: "Race the opening move for two minutes only.",
      suggestedMinutes: 10,
      ctaLabel: "Break friction",
      ritualName: "Grease the slide",
      setupStep: "Open the inbox, load the form, dial the number, or place the item by the door.",
      permissionSlip: "This does not need to be elegant. It only needs to get easier.",
      momentumLine: "Friction drops fast once setup is already done.",
      rescueChoices: [
        "Do only the admin opening move.",
        "Remove clicks and setup before asking for focus.",
      ],
      suggestions: [
        "Treat this as a friction problem, not a character problem.",
        "Reduce the number of decisions between you and the first move.",
      ],
      source: "built-in",
    };
  }

  return {
    mode: "LOW_ENERGY",
    headline: `Re-enter ${title} without waiting to feel ready.`,
    reason: "The task seems reasonable, so the main blocker is probably activation energy.",
    firstStep: "Work on it for five minutes only.",
    backupStep: "Open the task and do one visible move.",
    suggestedMinutes: 5,
    ctaLabel: "Start for 5 minutes",
    ritualName: "Tiny launch",
    setupStep: "Put the work in view before your brain starts negotiating.",
    permissionSlip: "You do not need the right mood to begin.",
    momentumLine: "Starting changes the feeling faster than thinking does.",
    rescueChoices: [
      "Promise only five minutes.",
      "Do one visible move and then reassess.",
    ],
    suggestions: [
      "Make the opening step almost too small to resist.",
      "You are allowed to stop after the first five minutes.",
    ],
    source: "built-in",
  };
}
