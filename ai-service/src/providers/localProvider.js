function rankValue(value) {
  return value === "HIGH" || value === "HARD" ? 3 : value === "MEDIUM" ? 2 : 1;
}

function sortByPriority(tasks) {
  return [...tasks].sort((left, right) => {
    const importanceDiff = rankValue(right.importance ?? right.priority ?? "MEDIUM")
      - rankValue(left.importance ?? left.priority ?? "MEDIUM");
    if (importanceDiff !== 0) {
      return importanceDiff;
    }

    const energyDiff = rankValue(right.energy ?? "MEDIUM") - rankValue(left.energy ?? "MEDIUM");
    if (energyDiff !== 0) {
      return energyDiff;
    }

    return Number(right.estimatedMinutes ?? 0) - Number(left.estimatedMinutes ?? 0);
  });
}

export function generateLocalDayPlan(payload) {
  const tasks = sortByPriority(payload.tasks ?? []);
  const focusTask = tasks.find(
    (task) => task.status !== "DONE" && (task.difficulty === "HARD" || task.energy === "HIGH")
  ) ?? tasks.find((task) => task.status !== "DONE") ?? null;
  const frictionTask = tasks.find(
    (task) => task.status !== "DONE" && (task.energy === "LOW" || task.motivation === "LOW")
  ) ?? null;

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
      tasks.length > 6 ? "This day is carrying a lot of cognitive switching." : "Avoid overfilling the day with tiny leftovers.",
      focusTask && frictionTask ? "Do not put your hardest block after too many annoying tasks." : "Protect your first meaningful block from drift.",
    ],
    encouragement: "A good plan for an ADHD brain is believable, not perfect.",
  };
}

export function generateLocalArrangeAdvice(payload) {
  const templates = sortByPriority(payload.templates ?? []);
  const heavyTemplates = templates.filter(
    (task) => task.energy === "HIGH" || task.difficulty === "HARD"
  );

  return {
    mode: "smart-arrange",
    summary: `I found ${templates.length} recurring rule${templates.length === 1 ? "" : "s"} and ${heavyTemplates.length} high-focus commitment${heavyTemplates.length === 1 ? "" : "s"}.`,
    rules: [
      "Keep high-energy or hard work in earlier protected slots.",
      "Cluster low-energy admin blocks later instead of scattering them across focus hours.",
      "Leave recovery space when a week already has several heavy blocks.",
    ],
    opportunities: heavyTemplates.slice(0, 3).map((task) => ({
      title: task.title,
      note: "This should usually land in a protected focus window.",
    })),
  };
}

export function generateLocalConsult(payload) {
  const prompt = String(payload.prompt ?? "").trim();
  const tasks = payload.tasks ?? [];
  const topTask = sortByPriority(tasks).find((task) => task.status !== "DONE") ?? null;

  return {
    mode: "consult",
    headline: topTask
      ? `If you only rescue one thing, rescue "${topTask.title}".`
      : "Let’s make the next move smaller and more believable.",
    answer: prompt
      ? `You asked: "${prompt}". My read is that the next useful move is to reduce decision load, protect one anchor block, and stop expecting the whole day to feel motivated.`
      : "The pattern here looks like cognitive overload more than lack of intent.",
    actions: [
      topTask ? `Shrink "${topTask.title}" to its first visible action.` : "Choose one anchor task.",
      "Move one annoying admin task away from your best focus time.",
      "Give yourself one explicit permission slip for an imperfect first pass.",
    ],
  };
}

export function generateLocalUnstuckConsult(payload) {
  const task = payload.task ?? {};
  const title = task.title ?? "this block";

  return {
    mode: "unstuck",
    ritualName: "Tiny re-entry",
    headline: `Let’s reopen ${title} without demanding full momentum.`,
    coaching: [
      "Open the exact surface where the task lives.",
      "Do one visible move before evaluating how you feel.",
      "Treat five honest minutes as a real win, not a fake start.",
    ],
    rescue: "If it still feels sticky, rename the block to the first slice only.",
  };
}
