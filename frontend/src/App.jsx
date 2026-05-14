import { useEffect, useState } from "react";
import {
  arrangeTaskTemplates,
  clearTaskBlocksInRange,
  createTaskBlock,
  createTaskTemplate,
  deleteTaskBlock,
  fetchHardToStartSuggestions,
  fetchTaskBlocksByDate,
  fetchTaskBlocksByRange,
  fetchTaskTemplates,
  fetchWhatNow,
  updateTaskBlock,
  updateTaskStatus,
} from "./api/taskBlocksApi";
import { fetchAIDayPlan, fetchAIHealth, fetchAIUnstuckConsult } from "./api/aiPlannerApi";
import Header from "./components/Header";
import WhatNowCard from "./components/WhatNowCard";
import CreateTaskForm from "./components/CreateTaskForm";
import TaskList from "./components/TaskList";
import { generateLocalDayPlan, generateLocalUnstuckPlan } from "./lib/localAICoach";

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatTimeInput(date) {
  return date.toTimeString().slice(0, 8);
}

function getInitialDate() {
  return formatDateInput(new Date());
}

function getAIServiceHint() {
  return "AI service not reachable. Start it with: cd /Users/nitailevi/Desktop/פרוייקטים/nextblock/ai-service && npm start";
}

function getSnapshotKey(name, date, viewMode) {
  return `nextblock-${name}-${date}-${viewMode}`;
}

function getEmptySupportState(overrides = {}) {
  return {
    taskId: null,
    taskTitle: "",
    taskStatus: "",
    mode: "",
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
    loading: false,
    error: "",
    source: "",
    ...overrides,
  };
}

function mapSupportState(task, data) {
  return getEmptySupportState({
    taskId: task.id,
    taskTitle: task.title,
    taskStatus: task.status,
    mode: data.mode ?? "",
    headline: data.headline ?? "",
    reason: data.reason ?? "",
    firstStep: data.firstStep ?? "",
    backupStep: data.backupStep ?? "",
    suggestedMinutes: data.suggestedMinutes ?? null,
    ctaLabel: data.ctaLabel ?? "",
    suggestions: data.suggestions ?? [],
    ritualName: data.ritualName ?? "",
    setupStep: data.setupStep ?? "",
    permissionSlip: data.permissionSlip ?? "",
    momentumLine: data.momentumLine ?? "",
    rescueChoices: data.rescueChoices ?? [],
    source: data.source ?? "",
  });
}

function getInitialFormState(date) {
  return {
    title: "",
    description: "",
    date,
    startTime: "09:00",
    endTime: "09:30",
    difficulty: "MEDIUM",
    category: "",
    estimatedMinutes: 30,
  };
}

function getInitialQuickAddState() {
  return {
    title: "",
    minutes: 25,
    difficulty: "MEDIUM",
    category: "",
  };
}

function getInitialBraindumpState() {
  return {
    text: "",
    drafts: [],
    open: false,
  };
}

function getInitialTemplateFormState() {
  return {
    title: "",
    cadence: "DAILY",
    preferredWindow: "ANYTIME",
    estimatedMinutes: 25,
    motivation: "MEDIUM",
    energy: "MEDIUM",
    difficulty: "MEDIUM",
    importance: "MEDIUM",
    category: "",
    daysOfWeek: ["MONDAY"],
    dayOfMonth: 1,
  };
}

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "day";
  }

  return window.localStorage.getItem("nextblock-theme") ?? "day";
}

function titleCase(text) {
  return text
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function estimateDraftMinutes(line) {
  const lower = line.toLowerCase();
  if (lower.includes("email") || lower.includes("reply") || lower.includes("message")) {
    return 15;
  }
  if (lower.includes("call") || lower.includes("meeting")) {
    return 25;
  }
  if (lower.includes("clean") || lower.includes("organize") || lower.includes("admin")) {
    return 25;
  }
  if (lower.includes("plan") || lower.includes("write") || lower.includes("study")) {
    return 45;
  }
  return 25;
}

function inferDraftCategory(line) {
  const lower = line.toLowerCase();
  if (lower.includes("email") || lower.includes("reply") || lower.includes("admin")) {
    return "Admin";
  }
  if (lower.includes("call") || lower.includes("meeting")) {
    return "Communication";
  }
  if (lower.includes("clean") || lower.includes("laundry") || lower.includes("tidy")) {
    return "Home";
  }
  if (lower.includes("study") || lower.includes("read") || lower.includes("write")) {
    return "Focus";
  }
  return "";
}

function compileBraindump(text) {
  return text
    .split(/\n|[.!?]/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 3)
    .map((line, index) => ({
      id: `${Date.now()}-${index}`,
      title: titleCase(line),
      minutes: estimateDraftMinutes(line),
      difficulty: line.length > 60 ? "HARD" : "MEDIUM",
      category: inferDraftCategory(line),
    }))
    .slice(0, 8);
}

function InstallGuideOverlay({ open, onClose }) {
  if (!open) {
    return null;
  }

  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)")?.matches)
    || (typeof navigator !== "undefined" && Boolean(navigator.standalone));
  const isIPhone =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="install-overlay" onClick={onClose}>
      <div className="install-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="install-sheet-topline">
          <div>
            <div className="eyebrow">iPhone app</div>
            <h2>{isStandalone ? "NextBlock is already installed" : "Install NextBlock on your Home Screen"}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>

        {isStandalone ? (
          <p className="muted">
            You’re already opening NextBlock like an app. Close this and keep going.
          </p>
        ) : (
          <>
            <p className="muted">
              {isIPhone
                ? "You’re on iPhone now. Use Safari’s Share button to install this as an app."
                : "Open this same address in Safari on your iPhone while your phone and Mac are on the same Wi-Fi."}
            </p>
            <ol className="install-guide-list">
              <li>Keep `./run-dev.sh` running on your Mac.</li>
              <li>Open this app in Safari on your iPhone.</li>
              <li>Tap `Share`.</li>
              <li>Choose `Add to Home Screen`.</li>
              <li>Tap `Add`, then launch NextBlock from the Home Screen.</li>
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function MobileTabBar({ activeTab, onChange }) {
  const tabs = [
    { id: "today", label: "Today" },
    { id: "add", label: "Add" },
    { id: "organize", label: "Organize" },
  ];

  return (
    <nav className="mobile-tabbar" aria-label="App sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`mobile-tabbar-button ${activeTab === tab.id ? "mobile-tabbar-button-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function buildSummary(tasks) {
  const counts = {
    total: tasks.length,
    planned: 0,
    active: 0,
    done: 0,
    missed: 0,
  };

  for (const task of tasks) {
    if (task.status === "PLANNED") {
      counts.planned += 1;
    } else if (task.status === "ACTIVE") {
      counts.active += 1;
    } else if (task.status === "DONE") {
      counts.done += 1;
    } else if (task.status === "MISSED") {
      counts.missed += 1;
    }
  }

  return counts;
}

function taskToEditForm(task) {
  return {
    title: task.title ?? "",
    description: task.description ?? "",
    date: task.date,
    startTime: task.startTime.slice(0, 5),
    endTime: task.endTime.slice(0, 5),
    difficulty: task.difficulty,
    category: task.category ?? "",
    estimatedMinutes: task.estimatedMinutes,
  };
}

function parseMinutes(time) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getDurationMinutes(task) {
  return parseMinutes(task.endTime) - parseMinutes(task.startTime);
}

function withSeconds(timeValue) {
  return `${timeValue.slice(0, 5)}:00`;
}

function roundUpToQuarterHour(date) {
  const clone = new Date(date);
  clone.setSeconds(0, 0);
  const remainder = clone.getMinutes() % 15;
  if (remainder !== 0) {
    clone.setMinutes(clone.getMinutes() + 15 - remainder);
  }
  return clone;
}

function getNetworkAwareMessage(error, fallbackMessage) {
  if (error instanceof TypeError) {
    return "The backend is not reachable. Start the backend on localhost:8080 and try again.";
  }

  return fallbackMessage;
}

function CompletionCelebration({ celebration, onAction, onClose }) {
  if (!celebration.visible) {
    return null;
  }

  return (
    <div className="celebration-backdrop" onClick={onClose}>
      <div className="celebration-modal" onClick={(event) => event.stopPropagation()}>
        <div className="celebration-burst celebration-burst-one" />
        <div className="celebration-burst celebration-burst-two" />
        <div className="celebration-burst celebration-burst-three" />
        {celebration.phase === "launch" ? (
          <div className="celebration-arrow-wrap" aria-hidden="true">
            <div className="celebration-arrow-line" />
            <div className="celebration-arrow-head" />
            <div className="celebration-arrow-impact" />
          </div>
        ) : null}

        <div className="celebration-label">Block complete</div>
        <h2>{celebration.title}</h2>
        <p>
          You finished a promised block. That counts. Let your brain register the win
          before jumping to the next thing.
        </p>

        <div className="celebration-stats">
          <div className="celebration-stat">
            <span className="celebration-stat-value">{celebration.doneCount}</span>
            <span className="celebration-stat-label">Done today</span>
          </div>
          <div className="celebration-stat">
            <span className="celebration-stat-value">{celebration.minutes}</span>
            <span className="celebration-stat-label">Minutes honored</span>
          </div>
        </div>

        {celebration.feedback ? (
          <div className="celebration-feedback">
            <strong>{celebration.feedback}</strong>
          </div>
        ) : null}

        {celebration.phase === "launch" ? (
          <div className="celebration-phase-text">Direct hit. Let that land.</div>
        ) : celebration.actionDone ? (
          <div className="action-row">
            <button type="button" className="primary-button celebration-button" onClick={onClose}>
              Close win ritual
            </button>
          </div>
        ) : (
          <div className="celebration-action-grid">
            <button
              type="button"
              className="celebration-action-card"
              onClick={(event) => {
                event.stopPropagation();
                onAction("momentum");
              }}
            >
              <strong>{celebration.nextTaskId ? "Ride momentum" : "Protect the win"}</strong>
              <span>
                {celebration.nextTaskTitle
                  ? `Start ${celebration.nextTaskTitle}`
                  : "Let this win land before you choose the next block"}
              </span>
            </button>

            <button
              type="button"
              className="celebration-action-card"
              onClick={(event) => {
                event.stopPropagation();
                onAction("log");
              }}
            >
              <strong>Feel that win</strong>
              <span>Save the moment and let it count</span>
            </button>

            <button
              type="button"
              className="celebration-action-card"
              onClick={(event) => {
                event.stopPropagation();
                onAction("reset");
              }}
            >
              <strong>Take a reset</strong>
              <span>Protect a short pause before the next thing</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [viewMode, setViewMode] = useState("day");
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  const [currentTime, setCurrentTime] = useState(() => formatTimeInput(new Date()));
  const [taskBlocks, setTaskBlocks] = useState([]);
  const [rangeMeta, setRangeMeta] = useState(null);
  const [whatNow, setWhatNow] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingWhatNow, setLoadingWhatNow] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editError, setEditError] = useState("");
  const [editFormData, setEditFormData] = useState(null);
  const [quickAddData, setQuickAddData] = useState(getInitialQuickAddState);
  const [quickAddBusy, setQuickAddBusy] = useState(false);
  const [braindumpState, setBraindumpState] = useState(getInitialBraindumpState);
  const [templates, setTemplates] = useState([]);
  const [templateFormData, setTemplateFormData] = useState(getInitialTemplateFormState);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [arrangeSummary, setArrangeSummary] = useState(null);
  const [aiDayPlan, setAIDayPlan] = useState({
    loading: false,
    error: "",
    data: null,
  });
  const [aiStatus, setAIStatus] = useState({
    loading: true,
    online: false,
    provider: "",
    model: "",
  });
  const [networkStatus, setNetworkStatus] = useState(() => ({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
  }));
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [themeMode, setThemeMode] = useState(getInitialTheme);
  const [activeTab, setActiveTab] = useState("today");
  const [supportState, setSupportState] = useState(getEmptySupportState());
  const [celebration, setCelebration] = useState({
    visible: false,
    phase: "choices",
    title: "",
    doneCount: 0,
    minutes: 0,
    nextTaskId: null,
    nextTaskTitle: "",
    feedback: "",
    actionDone: false,
  });
  const [formData, setFormData] = useState(() => getInitialFormState(getInitialDate()));
  const [latestWin, setLatestWin] = useState(() => {
    const stored = window.localStorage.getItem("nextblock-latest-win");
    return stored ? JSON.parse(stored) : null;
  });

  const summary = buildSummary(taskBlocks);
  const isToday = selectedDate === getInitialDate();

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!celebration.visible || celebration.phase !== "launch") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCelebration((prev) => ({
        ...prev,
        phase: "choices",
      }));
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [celebration.visible, celebration.phase]);

  useEffect(() => {
    if (!celebration.visible) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setCelebration({
          visible: false,
          phase: "choices",
          title: "",
          doneCount: 0,
          minutes: 0,
          nextTaskId: null,
          nextTaskTitle: "",
          feedback: "",
          actionDone: false,
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [celebration.visible]);

  async function loadTaskBlocks(date = selectedDate) {
    try {
      setLoadingTasks(true);
      setPageError("");
      if (viewMode === "day") {
        const data = await fetchTaskBlocksByDate(date);
        setTaskBlocks(data);
        setRangeMeta({ view: "day", range: { from: date, to: date } });
        window.localStorage.setItem(
          getSnapshotKey("tasks", date, "day"),
          JSON.stringify({
            tasks: data,
            rangeMeta: { view: "day", range: { from: date, to: date } },
          })
        );
      } else {
        const data = await fetchTaskBlocksByRange(date, viewMode);
        setTaskBlocks(data.taskBlocks ?? []);
        setRangeMeta(data.range ?? null);
        window.localStorage.setItem(
          getSnapshotKey("tasks", date, viewMode),
          JSON.stringify({
            tasks: data.taskBlocks ?? [],
            rangeMeta: data.range ?? null,
          })
        );
      }
    } catch (error) {
      console.error(error);
      const snapshot = window.localStorage.getItem(getSnapshotKey("tasks", date, viewMode));
      if (snapshot) {
        const parsed = JSON.parse(snapshot);
        setTaskBlocks(parsed.tasks ?? []);
        setRangeMeta(parsed.rangeMeta ?? null);
        setPageError("Offline: showing the last saved version of this plan.");
      } else {
        setPageError(getNetworkAwareMessage(error, "Could not load tasks for this day."));
        setTaskBlocks([]);
      }
    } finally {
      setLoadingTasks(false);
    }
  }

  async function loadTemplates() {
    try {
      const data = await fetchTaskTemplates();
      setTemplates(data ?? []);
      window.localStorage.setItem("nextblock-templates", JSON.stringify(data ?? []));
    } catch (error) {
      console.error(error);
      const snapshot = window.localStorage.getItem("nextblock-templates");
      if (snapshot) {
        setTemplates(JSON.parse(snapshot));
      }
    }
  }

  async function loadWhatNow(date = selectedDate, time = currentTime) {
    try {
      setLoadingWhatNow(true);
      const data = await fetchWhatNow(date, time);
      setWhatNow(data);
      window.localStorage.setItem(
        getSnapshotKey("whatnow", date, viewMode),
        JSON.stringify(data)
      );
    } catch (error) {
      console.error(error);
      const snapshot = window.localStorage.getItem(getSnapshotKey("whatnow", date, viewMode));
      if (snapshot) {
        setWhatNow(JSON.parse(snapshot));
        setPageError("Offline: showing the last saved guidance.");
      } else {
        setPageError(getNetworkAwareMessage(error, "Could not load current guidance."));
        setWhatNow(null);
      }
    } finally {
      setLoadingWhatNow(false);
    }
  }

  async function reloadAll(date = selectedDate, time = currentTime) {
    await Promise.all([loadTaskBlocks(date), loadWhatNow(date, time), loadTemplates()]);
  }

  useEffect(() => {
    const tick = () => setCurrentTime(formatTimeInput(new Date()));
    tick();

    const intervalId = window.setInterval(tick, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleOnline = () => setNetworkStatus({ online: true });
    const handleOffline = () => setNetworkStatus({ online: false });

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
  }, [selectedDate, viewMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadAIHealth() {
      try {
        const data = await fetchAIHealth();
        if (cancelled) {
          return;
        }

        setAIStatus({
          loading: false,
          online: true,
          provider: data.provider ?? "",
          model: data.model ?? "",
        });
      } catch {
        if (cancelled) {
          return;
        }

        setAIStatus({
          loading: false,
          online: false,
          provider: "",
          model: "",
        });
      }
    }

    loadAIHealth();
    const intervalId = window.setInterval(loadAIHealth, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem("nextblock-theme", themeMode);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", themeMode === "night" ? "#0b0b0d" : "#f97316");
    }
  }, [themeMode]);

  useEffect(() => {
    if (!isToday) {
      return;
    }

    loadWhatNow(selectedDate, currentTime);
  }, [currentTime, isToday, selectedDate]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      date: selectedDate,
    }));
  }, [selectedDate]);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleQuickAddChange(event) {
    const { name, value } = event.target;
    setQuickAddData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleTemplateChange(event) {
    const { name, value } = event.target;
    setTemplateFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleTemplateDayToggle(dayName) {
    setTemplateFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(dayName)
        ? prev.daysOfWeek.filter((day) => day !== dayName)
        : [...prev.daysOfWeek, dayName],
    }));
  }

  function handleBraindumpChange(event) {
    const nextText = event.target.value;
    setBraindumpState((prev) => ({
      ...prev,
      text: nextText,
      drafts: prev.open ? compileBraindump(nextText) : prev.drafts,
    }));
  }

  function handleCompileBraindump() {
    setBraindumpState((prev) => ({
      ...prev,
      open: true,
      drafts: compileBraindump(prev.text),
    }));
  }

  function openEditTask(task) {
    setEditingTaskId(task.id);
    setEditFormData(taskToEditForm(task));
    setEditError("");
  }

  function closeEditTask() {
    setEditingTaskId(null);
    setEditFormData(null);
    setEditError("");
  }

  function buildTaskSlot(minutes) {
    if (taskBlocks.length > 0) {
      const lastTask = taskBlocks[taskBlocks.length - 1];
      const startMinutes = parseMinutes(lastTask.endTime);
      const endMinutes = startMinutes + minutes;

      if (endMinutes > 24 * 60) {
        throw new Error("No more room in this day for that block.");
      }

      return {
        startTime: formatMinutes(startMinutes),
        endTime: formatMinutes(endMinutes),
      };
    }

    const anchor = isToday ? roundUpToQuarterHour(new Date()) : new Date(`${selectedDate}T09:00:00`);
    const startMinutes = anchor.getHours() * 60 + anchor.getMinutes();
    const endMinutes = startMinutes + minutes;

    if (endMinutes > 24 * 60) {
      throw new Error("No more room in this day for that block.");
    }

    return {
      startTime: formatMinutes(startMinutes),
      endTime: formatMinutes(endMinutes),
    };
  }

  async function handleCreateTask(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setFormError("");

      await createTaskBlock({
        ...formData,
        startTime: withSeconds(formData.startTime),
        endTime: withSeconds(formData.endTime),
        estimatedMinutes: Number(formData.estimatedMinutes),
      });

      setFormData(getInitialFormState(selectedDate));
      setNotice("Task block added.");
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setFormError(
        getNetworkAwareMessage(error, "Could not create this task block. Check the times and try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickAdd(event) {
    event.preventDefault();

    try {
      setQuickAddBusy(true);
      setPageError("");

      const minutes = Number(quickAddData.minutes);
      const slot = buildTaskSlot(minutes);

      await createTaskBlock({
        title: quickAddData.title,
        description: "",
        date: selectedDate,
        startTime: withSeconds(slot.startTime),
        endTime: withSeconds(slot.endTime),
        difficulty: quickAddData.difficulty,
        category: quickAddData.category,
        estimatedMinutes: minutes,
      });

      setQuickAddData(getInitialQuickAddState());
      setNotice("Quick block added.");
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setPageError(error.message || "Could not quick-add this block.");
    } finally {
      setQuickAddBusy(false);
    }
  }

  async function handleCreateDraftBlocks() {
    if (braindumpState.drafts.length === 0) {
      return;
    }

    try {
      setQuickAddBusy(true);
      setPageError("");
      let anchorTime = null;

      for (const draft of braindumpState.drafts) {
        const slot = anchorTime
          ? {
              startTime: anchorTime,
              endTime: formatMinutes(parseMinutes(anchorTime) + draft.minutes),
            }
          : buildTaskSlot(draft.minutes);

        await createTaskBlock({
          title: draft.title,
          description: "",
          date: selectedDate,
          startTime: withSeconds(slot.startTime),
          endTime: withSeconds(slot.endTime),
          difficulty: draft.difficulty,
          category: draft.category,
          estimatedMinutes: draft.minutes,
        });

        anchorTime = slot.endTime;
      }

      setBraindumpState(getInitialBraindumpState());
      setNotice("Braindump turned into real blocks.");
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setPageError(getNetworkAwareMessage(error, "Could not turn that braindump into blocks."));
    } finally {
      setQuickAddBusy(false);
    }
  }

  async function handleCreateTemplate(event) {
    event.preventDefault();

    try {
      setTemplateBusy(true);
      setPageError("");
      await createTaskTemplate({
        ...templateFormData,
        estimatedMinutes: Number(templateFormData.estimatedMinutes),
        dayOfMonth: Number(templateFormData.dayOfMonth),
      });
      setTemplateFormData(getInitialTemplateFormState());
      setNotice("Planning rule saved.");
      await loadTemplates();
    } catch (error) {
      console.error(error);
      setPageError(getNetworkAwareMessage(error, "Could not save that planning rule."));
    } finally {
      setTemplateBusy(false);
    }
  }

  async function handleArrangeTemplates() {
    try {
      setTemplateBusy(true);
      setPageError("");
      const result = await arrangeTaskTemplates(selectedDate, viewMode);
      setArrangeSummary({
        viewMode,
        range: rangeMeta,
        createdCount: result.createdCount ?? 0,
        skippedCount: result.skippedCount ?? 0,
        created: result.taskBlocks ?? [],
        skipped: result.skipped ?? [],
      });
      setNotice(
        result.createdCount > 0
          ? `Smart arrange created ${result.createdCount} block${result.createdCount === 1 ? "" : "s"}${result.skippedCount ? ` and skipped ${result.skippedCount} to protect focus or load.` : ""}.`
          : result.skippedCount
            ? `Nothing new was placed. ${result.skippedCount} rule${result.skippedCount === 1 ? "" : "s"} was held back to protect focus or load.`
            : "Everything due in this range is already arranged."
      );
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setPageError(getNetworkAwareMessage(error, "Could not arrange your planning rules."));
    } finally {
      setTemplateBusy(false);
    }
  }

  async function handleRequestAIDayPlan() {
    try {
      setAIDayPlan({
        loading: true,
        error: "",
        data: null,
      });

      const data = await fetchAIDayPlan({
        date: selectedDate,
        viewMode,
        tasks: taskBlocks,
        templates,
      });

      setAIDayPlan({
        loading: false,
        error: "",
        data,
      });
      setNotice("AI coach is ready.");
    } catch (error) {
      console.error(error);
      const fallback = generateLocalDayPlan({
        date: selectedDate,
        viewMode,
        tasks: taskBlocks,
        templates,
      });
      setAIDayPlan({
        loading: false,
        error: `${getNetworkAwareMessage(error, getAIServiceHint())} Using built-in coach instead.`,
        data: fallback,
      });
      setNotice("Using the built-in coach.");
    }
  }

  async function handleClearRange(targetView) {
    const label = targetView === "day" ? "day" : targetView === "week" ? "week" : "month";
    const confirmed = window.confirm(`Clear every task block in this ${label}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    try {
      setTemplateBusy(true);
      setPageError("");

      const result = await clearTaskBlocksInRange(selectedDate, targetView);

      setArrangeSummary(null);
      setAIDayPlan({
        loading: false,
        error: "",
        data: null,
      });
      closeEditTask();
      setSupportState(getEmptySupportState());

      setNotice(
        result.deletedCount > 0
          ? `Cleared ${result.deletedCount} block${result.deletedCount === 1 ? "" : "s"} from this ${label}.`
          : `That ${label} was already clear.`
      );
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setPageError(getNetworkAwareMessage(error, `Could not clear this ${label}.`));
    } finally {
      setTemplateBusy(false);
    }
  }

  async function handleSaveTaskEdit(taskId) {
    if (!editFormData) {
      return;
    }

    try {
      setBusyTaskId(taskId);
      setEditError("");
      setPageError("");

      await updateTaskBlock(taskId, {
        ...editFormData,
        startTime: withSeconds(editFormData.startTime),
        endTime: withSeconds(editFormData.endTime),
        estimatedMinutes: Number(editFormData.estimatedMinutes),
      });

      closeEditTask();
      setNotice("Task block updated.");
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setEditError(
        getNetworkAwareMessage(error, "Could not save changes. Double-check the times and fields.")
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleSwapTaskSlots(sourceTaskId, targetTaskId) {
    if (sourceTaskId === targetTaskId) {
      return;
    }

    const sourceTask = taskBlocks.find((task) => task.id === sourceTaskId);
    const targetTask = taskBlocks.find((task) => task.id === targetTaskId);

    if (!sourceTask || !targetTask) {
      return;
    }

    try {
      setBusyTaskId(sourceTaskId);
      setPageError("");

      await Promise.all([
        updateTaskBlock(sourceTask.id, {
          ...taskToEditForm(sourceTask),
          date: targetTask.date,
          startTime: targetTask.startTime,
          endTime: targetTask.endTime,
          estimatedMinutes: targetTask.estimatedMinutes,
        }),
        updateTaskBlock(targetTask.id, {
          ...taskToEditForm(targetTask),
          date: sourceTask.date,
          startTime: sourceTask.startTime,
          endTime: sourceTask.endTime,
          estimatedMinutes: sourceTask.estimatedMinutes,
        }),
      ]);

      setNotice(`Swapped "${sourceTask.title}" with "${targetTask.title}".`);
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setPageError("Could not swap those blocks.");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleMoveTaskByMinutes(task, deltaMinutes) {
    const startMinutes = parseMinutes(task.startTime) + deltaMinutes;
    const endMinutes = parseMinutes(task.endTime) + deltaMinutes;

    if (startMinutes < 0 || endMinutes > 24 * 60) {
      setPageError("That move would push the block outside the day.");
      return;
    }

    try {
      setBusyTaskId(task.id);
      setPageError("");

      await updateTaskBlock(task.id, {
        ...taskToEditForm(task),
        startTime: withSeconds(formatMinutes(startMinutes)),
        endTime: withSeconds(formatMinutes(endMinutes)),
        estimatedMinutes: task.estimatedMinutes,
      });

      setNotice(`Moved "${task.title}" by ${Math.abs(deltaMinutes)} minutes.`);
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setPageError("Could not move that task block.");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDuplicateTask(task) {
    const duration = Number(task.estimatedMinutes || getDurationMinutes(task) || 30);
    const startMinutes = parseMinutes(task.endTime);
    const endMinutes = startMinutes + duration;

    if (endMinutes > 24 * 60) {
      setPageError("There isn't room to duplicate that block at the end of the day.");
      return;
    }

    try {
      setBusyTaskId(task.id);
      setPageError("");

      await createTaskBlock({
        title: task.title,
        description: task.description ?? "",
        date: task.date,
        startTime: withSeconds(task.endTime),
        endTime: withSeconds(formatMinutes(endMinutes)),
        difficulty: task.difficulty,
        category: task.category ?? "",
        estimatedMinutes: duration,
      });

      setNotice(`Duplicated "${task.title}" into the next open slot.`);
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setPageError(getNetworkAwareMessage(error, "Could not duplicate that block."));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleTimelineReschedule(taskId, newStartMinutes) {
    const task = taskBlocks.find((item) => item.id === taskId);

    if (!task) {
      return;
    }

    const duration = getDurationMinutes(task);
    const boundedStart = Math.max(0, Math.min(newStartMinutes, 24 * 60 - duration));
    const boundedEnd = boundedStart + duration;

    try {
      setBusyTaskId(task.id);
      setPageError("");

      await updateTaskBlock(task.id, {
        ...taskToEditForm(task),
        startTime: withSeconds(formatMinutes(boundedStart)),
        endTime: withSeconds(formatMinutes(boundedEnd)),
        estimatedMinutes: task.estimatedMinutes,
      });

      setNotice(`Moved "${task.title}" to ${formatMinutes(boundedStart)}.`);
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setPageError("Could not place that task there.");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleReformDay() {
    const remainingTasks = taskBlocks
      .filter((task) => task.status === "PLANNED")
      .sort((left, right) => left.startTime.localeCompare(right.startTime));

    if (remainingTasks.length === 0) {
      setPageError("There are no planned blocks left to reform.");
      return;
    }

    const activeTask = taskBlocks.find((task) => task.status === "ACTIVE") ?? null;
    const anchorMinutes = activeTask
      ? parseMinutes(activeTask.endTime)
      : parseMinutes((isToday ? currentTime : "09:00:00").slice(0, 5));
    const roundedAnchor = Math.ceil(anchorMinutes / 15) * 15;

    try {
      setPageError("");
      setBusyTaskId(remainingTasks[0].id);
      let cursor = roundedAnchor;

      for (const task of remainingTasks) {
        const duration = Number(task.estimatedMinutes || getDurationMinutes(task) || 30);
        const nextEnd = cursor + duration;

        if (nextEnd > 24 * 60) {
          break;
        }

        await updateTaskBlock(task.id, {
          ...taskToEditForm(task),
          startTime: withSeconds(formatMinutes(cursor)),
          endTime: withSeconds(formatMinutes(nextEnd)),
          estimatedMinutes: duration,
        });

        cursor = nextEnd;
      }

      setNotice("The rest of today was re-formed into a cleaner sequence.");
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
    } catch (error) {
      console.error(error);
      setPageError(getNetworkAwareMessage(error, "Could not reform the remaining day."));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleTaskAction(taskId, action) {
    const task = taskBlocks.find((item) => item.id === taskId);

    try {
      setBusyTaskId(taskId);
      setPageError("");

      if (action === "delete") {
        await deleteTaskBlock(taskId);
      } else {
        await updateTaskStatus(taskId, action);
      }

      if (supportState.taskId === taskId && action === "delete") {
        setSupportState(getEmptySupportState());
      }

      if (supportState.taskId === taskId && action !== "delete") {
        const nextStatus =
          action === "start"
            ? "ACTIVE"
            : action === "complete"
              ? "DONE"
              : action === "miss"
                ? "MISSED"
                : supportState.taskStatus;

        setSupportState((prev) => ({
          ...prev,
          taskStatus: nextStatus,
        }));
      }

      if (editingTaskId === taskId && action === "delete") {
        closeEditTask();
      }

      if (action === "complete" && task) {
        const completedWin = {
          id: task.id,
          title: task.title,
          minutes: Number(task.estimatedMinutes || 0),
          completedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(
          "nextblock-latest-win",
          JSON.stringify(completedWin)
        );
        setLatestWin(completedWin);

        const nextPlannedTask = taskBlocks.find(
          (item) => item.id !== task.id && item.status === "PLANNED"
        );

        setCelebration({
          visible: true,
          phase: "launch",
          title: task.title,
          doneCount: summary.done + 1,
          minutes: task.estimatedMinutes,
          nextTaskId: nextPlannedTask?.id ?? null,
          nextTaskTitle: nextPlannedTask?.title ?? "",
          feedback: "",
          actionDone: false,
        });
      }

      setNotice(
        action === "delete"
          ? "Task block deleted."
          : `Task marked ${action === "complete" ? "complete" : action}.`
      );
      await reloadAll(selectedDate, isToday ? currentTime : "09:00:00");
      return true;
    } catch (error) {
      console.error(error);
      setPageError(getNetworkAwareMessage(error, "That action did not go through. Please try again."));
      return false;
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleCelebrationAction(action) {
    const nextTaskId = celebration.nextTaskId;
    const nextTaskTitle = celebration.nextTaskTitle;

    if (action === "momentum") {
      if (!nextTaskId) {
        setCelebration((prev) => ({
          ...prev,
          feedback: "No next block is lined up yet. Add one and then ride the next win forward.",
          actionDone: true,
          phase: "choices",
        }));
        return;
      }

      try {
        setCelebration((prev) => ({
          ...prev,
          feedback: nextTaskTitle ? `Starting "${nextTaskTitle}"...` : "Starting your next block...",
          phase: "choices",
        }));
        const started = await handleTaskAction(nextTaskId, "start");
        if (!started) {
          setCelebration((prev) => ({
            ...prev,
            feedback: "Momentum hit a snag. Try again in a second.",
            actionDone: true,
            phase: "choices",
          }));
          return;
        }
        setCelebration((prev) => ({
          ...prev,
          feedback: nextTaskTitle
            ? `Momentum captured. "${nextTaskTitle}" is now live.`
            : "Momentum captured.",
          actionDone: true,
        }));
      } catch (error) {
        console.error(error);
        setCelebration((prev) => ({
          ...prev,
          feedback: "Momentum hit a snag. Try again in a second.",
          actionDone: true,
          phase: "choices",
        }));
      }
      return;
    }

    if (action === "log") {
      const existingWins = JSON.parse(window.localStorage.getItem("nextblock-win-log") ?? "[]");
      existingWins.unshift({
        title: celebration.title,
        minutes: celebration.minutes,
        at: new Date().toISOString(),
      });
      window.localStorage.setItem(
        "nextblock-win-log",
        JSON.stringify(existingWins.slice(0, 20))
      );
      setCelebration((prev) => ({
        ...prev,
        feedback: `Win logged for "${celebration.title}". This one counts.`,
        actionDone: true,
        phase: "choices",
      }));
      return;
    }

    if (action === "reset") {
      setCelebration((prev) => ({
        ...prev,
        feedback: "Reset protected. Take 5 quiet minutes before the next block.",
        actionDone: true,
        phase: "choices",
      }));
      return;
    }
  }

  async function handleHardToStart(task) {
    try {
      setSupportState(
        getEmptySupportState({
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          loading: true,
        })
      );

      try {
        const aiData = await fetchAIUnstuckConsult({
          task,
          tasks: taskBlocks,
          date: selectedDate,
          viewMode,
        });

        setSupportState(
          mapSupportState(task, {
            mode: aiData.mode ?? "UNSTUCK",
            headline: aiData.headline,
            firstStep: aiData.coaching?.[0] ?? "",
            setupStep: aiData.coaching?.[1] ?? "",
            backupStep: aiData.rescue ?? aiData.coaching?.[2] ?? "",
            ritualName: aiData.ritualName ?? "",
            suggestions: aiData.coaching ?? [],
            ctaLabel: "Try the first move",
            source: "ai-service",
          })
        );
        return;
      } catch (aiError) {
        console.error(aiError);
      }

      try {
        const data = await fetchHardToStartSuggestions(task.id);
        setSupportState(mapSupportState(task, { ...data, source: "backend" }));
        return;
      } catch (backendError) {
        console.error(backendError);
      }

      const fallback = generateLocalUnstuckPlan(task);
      setSupportState(mapSupportState(task, fallback));
      setNotice("Using the built-in unstuck coach.");
    } catch (error) {
      console.error(error);
      setSupportState(
        getEmptySupportState({
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          error: getNetworkAwareMessage(error, "Could not load suggestions right now."),
        })
      );
    }
  }

  return (
    <div className="page-shell">
      <div className="page-glow page-glow-left" />
      <div className="page-glow page-glow-right" />
      <InstallGuideOverlay open={showInstallGuide} onClose={() => setShowInstallGuide(false)} />

      <CompletionCelebration
        celebration={celebration}
        onAction={handleCelebrationAction}
        onClose={() =>
          setCelebration({
            visible: false,
            phase: "choices",
            title: "",
            doneCount: 0,
            minutes: 0,
            nextTaskId: null,
            nextTaskTitle: "",
            feedback: "",
            actionDone: false,
          })
        }
      />

      <main className="page">
        <div className="container">
          <Header
            viewMode={viewMode}
            selectedDate={selectedDate}
            currentTime={currentTime}
            isToday={isToday}
            summary={summary}
            themeMode={themeMode}
            networkStatus={networkStatus}
            onShowInstallGuide={() => setShowInstallGuide(true)}
            onToggleTheme={() => setThemeMode((prev) => (prev === "day" ? "night" : "day"))}
            onClearToday={() => handleClearRange("day")}
            onViewModeChange={setViewMode}
            onDateChange={setSelectedDate}
            onReload={() => reloadAll(selectedDate, isToday ? currentTime : "09:00:00")}
          />

          {!networkStatus.online ? (
            <div className="banner-error">You&apos;re offline. NextBlock will use your last saved plan when it can.</div>
          ) : null}
          {notice ? <div className="banner-success">{notice}</div> : null}
          {pageError ? <div className="banner-error">{pageError}</div> : null}

          <MobileTabBar activeTab={activeTab} onChange={setActiveTab} />

        <div className="layout">
            <div className="left-column">
              <div className={`mobile-pane ${activeTab === "today" ? "mobile-pane-active" : ""}`}>
                <WhatNowCard
                  whatNow={whatNow}
                  loading={loadingWhatNow}
                  selectedDate={selectedDate}
                  currentTime={currentTime}
                  supportState={supportState}
                  summary={summary}
                  onTaskAction={handleTaskAction}
                  onHardToStart={handleHardToStart}
                  busyTaskId={busyTaskId}
                  compact
                />

                <TaskList
                  mode="today"
                  tasks={taskBlocks}
                  loading={loadingTasks}
                  latestWin={latestWin}
                  viewMode={viewMode}
                  rangeMeta={rangeMeta}
                  templates={templates}
                  templateFormData={templateFormData}
                  templateBusy={templateBusy}
                  arrangeSummary={arrangeSummary}
                  aiDayPlan={aiDayPlan}
                  aiStatus={aiStatus}
                  currentTaskId={whatNow?.currentTask?.id ?? null}
                  nextTaskId={whatNow?.nextTask?.id ?? null}
                  busyTaskId={busyTaskId}
                  editingTaskId={editingTaskId}
                  editFormData={editFormData}
                  editError={editError}
                  quickAddData={quickAddData}
                  quickAddBusy={quickAddBusy}
                  braindumpState={braindumpState}
                  onTaskAction={handleTaskAction}
                  onHardToStart={handleHardToStart}
                  onEditOpen={openEditTask}
                  onEditCancel={closeEditTask}
                  onEditChange={handleEditChange}
                  onEditSave={handleSaveTaskEdit}
                  onDuplicateTask={handleDuplicateTask}
                  onQuickAddChange={handleQuickAddChange}
                  onQuickAdd={handleQuickAdd}
                  onBraindumpChange={handleBraindumpChange}
                  onCompileBraindump={handleCompileBraindump}
                  onCreateDraftBlocks={handleCreateDraftBlocks}
                  onTemplateChange={handleTemplateChange}
                  onTemplateDayToggle={handleTemplateDayToggle}
                  onCreateTemplate={handleCreateTemplate}
                  onArrangeTemplates={handleArrangeTemplates}
                  onRequestAIDayPlan={handleRequestAIDayPlan}
                  onClearRange={handleClearRange}
                  onReformDay={handleReformDay}
                  onSwapTaskSlots={handleSwapTaskSlots}
                  onMoveTaskByMinutes={handleMoveTaskByMinutes}
                  onTimelineReschedule={handleTimelineReschedule}
                />
              </div>

              <div className={`mobile-pane ${activeTab === "add" ? "mobile-pane-active" : ""}`}>
                <CreateTaskForm
                  formData={formData}
                  onChange={handleFormChange}
                  onSubmit={handleCreateTask}
                  error={formError}
                  isSubmitting={isSubmitting}
                />

                <TaskList
                  mode="add"
                  tasks={taskBlocks}
                  loading={loadingTasks}
                  latestWin={latestWin}
                  viewMode={viewMode}
                  rangeMeta={rangeMeta}
                  templates={templates}
                  templateFormData={templateFormData}
                  templateBusy={templateBusy}
                  arrangeSummary={arrangeSummary}
                  aiDayPlan={aiDayPlan}
                  aiStatus={aiStatus}
                  currentTaskId={whatNow?.currentTask?.id ?? null}
                  nextTaskId={whatNow?.nextTask?.id ?? null}
                  busyTaskId={busyTaskId}
                  editingTaskId={editingTaskId}
                  editFormData={editFormData}
                  editError={editError}
                  quickAddData={quickAddData}
                  quickAddBusy={quickAddBusy}
                  braindumpState={braindumpState}
                  onTaskAction={handleTaskAction}
                  onHardToStart={handleHardToStart}
                  onEditOpen={openEditTask}
                  onEditCancel={closeEditTask}
                  onEditChange={handleEditChange}
                  onEditSave={handleSaveTaskEdit}
                  onDuplicateTask={handleDuplicateTask}
                  onQuickAddChange={handleQuickAddChange}
                  onQuickAdd={handleQuickAdd}
                  onBraindumpChange={handleBraindumpChange}
                  onCompileBraindump={handleCompileBraindump}
                  onCreateDraftBlocks={handleCreateDraftBlocks}
                  onTemplateChange={handleTemplateChange}
                  onTemplateDayToggle={handleTemplateDayToggle}
                  onCreateTemplate={handleCreateTemplate}
                  onArrangeTemplates={handleArrangeTemplates}
                  onRequestAIDayPlan={handleRequestAIDayPlan}
                  onClearRange={handleClearRange}
                  onReformDay={handleReformDay}
                  onSwapTaskSlots={handleSwapTaskSlots}
                  onMoveTaskByMinutes={handleMoveTaskByMinutes}
                  onTimelineReschedule={handleTimelineReschedule}
                />
              </div>
            </div>

            <div className={`right-column mobile-pane ${activeTab === "organize" ? "mobile-pane-active" : ""}`}>
              <TaskList
                mode="organize"
                tasks={taskBlocks}
                loading={loadingTasks}
                latestWin={latestWin}
                viewMode={viewMode}
                rangeMeta={rangeMeta}
                templates={templates}
                templateFormData={templateFormData}
                templateBusy={templateBusy}
                arrangeSummary={arrangeSummary}
                aiDayPlan={aiDayPlan}
                aiStatus={aiStatus}
                currentTaskId={whatNow?.currentTask?.id ?? null}
                nextTaskId={whatNow?.nextTask?.id ?? null}
                busyTaskId={busyTaskId}
                editingTaskId={editingTaskId}
                editFormData={editFormData}
                editError={editError}
                quickAddData={quickAddData}
                quickAddBusy={quickAddBusy}
                braindumpState={braindumpState}
                onTaskAction={handleTaskAction}
                onHardToStart={handleHardToStart}
                onEditOpen={openEditTask}
                onEditCancel={closeEditTask}
                onEditChange={handleEditChange}
                onEditSave={handleSaveTaskEdit}
                onDuplicateTask={handleDuplicateTask}
                onQuickAddChange={handleQuickAddChange}
                onQuickAdd={handleQuickAdd}
                onBraindumpChange={handleBraindumpChange}
                onCompileBraindump={handleCompileBraindump}
                onCreateDraftBlocks={handleCreateDraftBlocks}
                onTemplateChange={handleTemplateChange}
                onTemplateDayToggle={handleTemplateDayToggle}
                onCreateTemplate={handleCreateTemplate}
                onArrangeTemplates={handleArrangeTemplates}
                onRequestAIDayPlan={handleRequestAIDayPlan}
                onClearRange={handleClearRange}
                onReformDay={handleReformDay}
                onSwapTaskSlots={handleSwapTaskSlots}
                onMoveTaskByMinutes={handleMoveTaskByMinutes}
                onTimelineReschedule={handleTimelineReschedule}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
