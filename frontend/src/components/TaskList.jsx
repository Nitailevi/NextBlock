import { useEffect, useRef, useState } from "react";
import TaskCard from "./TaskCard";

function parseMinutes(time) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function formatReadableDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function listDatesInRange(rangeMeta) {
  if (!rangeMeta?.from || !rangeMeta?.to) {
    return [];
  }

  const dates = [];
  let cursor = new Date(`${rangeMeta.from}T12:00:00`);
  const end = new Date(`${rangeMeta.to}T12:00:00`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function PlannerInsight({ tasks }) {
  const remaining = tasks.filter((task) => task.status === "PLANNED").length;
  const active = tasks.find((task) => task.status === "ACTIVE");
  const done = tasks.filter((task) => task.status === "DONE").length;
  const totalMinutes = tasks.reduce(
    (sum, task) => sum + Number(task.estimatedMinutes || 0),
    0
  );
  const doneMinutes = tasks
    .filter((task) => task.status === "DONE")
    .reduce((sum, task) => sum + Number(task.estimatedMinutes || 0), 0);

  let message = `${remaining} planned block${remaining === 1 ? "" : "s"} left today.`;

  if (active) {
    message = `You're in motion on "${active.title}". Keep that momentum small and steady.`;
  } else if (remaining === 0 && tasks.length > 0) {
    message = "This day is wrapped. Review what worked and reset the next block gently.";
  } else if (done > 0) {
    message = `You already kept ${done} promise${done === 1 ? "" : "s"} to yourself today.`;
  }

  return (
    <div className="insight-strip">
      <div className="insight-main">{message}</div>
      <div className="insight-meta">
        {doneMinutes > 0 ? `${doneMinutes} completed minutes honored` : `${totalMinutes} planned minutes in this day`}
      </div>
    </div>
  );
}

function QuickAddBar({ quickAddData, quickAddBusy, onQuickAddChange, onQuickAdd, titleInputRef }) {
  const quickLengths = [15, 25, 45, 60];

  return (
    <div className="quick-add-wrap">
      <form className="quick-add-bar" onSubmit={onQuickAdd}>
        <div className="quick-add-title">
          <input
            ref={titleInputRef}
            name="title"
            placeholder="Quick add: draft roadmap, call mom, tidy desk..."
            value={quickAddData.title}
            onChange={onQuickAddChange}
            required
          />
        </div>

        <div className="quick-add-mini">
          <input
            type="number"
            min="5"
            step="5"
            name="minutes"
            value={quickAddData.minutes}
            onChange={onQuickAddChange}
          />
        </div>

        <div className="quick-add-mini">
          <select
            name="difficulty"
            value={quickAddData.difficulty}
            onChange={onQuickAddChange}
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        <div className="quick-add-mini">
          <input
            name="category"
            placeholder="Category"
            value={quickAddData.category}
            onChange={onQuickAddChange}
          />
        </div>

        <button className="primary-button" type="submit" disabled={quickAddBusy}>
          {quickAddBusy ? "Adding..." : "Add fast"}
        </button>
      </form>

      <div className="preset-row">
        {quickLengths.map((length) => (
          <button
            key={length}
            className={`chip-button ${Number(quickAddData.minutes) === length ? "chip-active" : ""}`}
            type="button"
            onClick={() =>
              onQuickAddChange({ target: { name: "minutes", value: String(length) } })
            }
          >
            {length}m
          </button>
        ))}
      </div>
    </div>
  );
}

function PanicToPlan({
  braindumpState,
  quickAddBusy,
  onBraindumpChange,
  onCompileBraindump,
  onCreateDraftBlocks,
}) {
  return (
    <div className="panic-to-plan">
      <div className="panic-head">
        <div>
          <div className="section-label">Panic to plan</div>
          <h3>Dump the swirl. We&apos;ll turn it into blocks.</h3>
        </div>
        <div className="helper-chip">Goblin-like, calmer</div>
      </div>

      <textarea
        className="panic-input"
        placeholder="Write the mess exactly as it feels: reply to Maya, figure out groceries, call doctor, clean desk, finish deck..."
        value={braindumpState.text}
        onChange={onBraindumpChange}
      />

      <div className="action-row">
        <button type="button" className="secondary-button" onClick={onCompileBraindump}>
          Turn into blocks
        </button>
        {braindumpState.drafts.length > 0 ? (
          <button
            type="button"
            className="primary-button"
            disabled={quickAddBusy}
            onClick={onCreateDraftBlocks}
          >
            {quickAddBusy ? "Building..." : "Add all to today"}
          </button>
        ) : null}
      </div>

      {braindumpState.drafts.length > 0 ? (
        <div className="panic-draft-grid">
          {braindumpState.drafts.map((draft) => (
            <div key={draft.id} className="panic-draft-card">
              <strong>{draft.title}</strong>
              <span className="muted">
                {draft.minutes} min{draft.category ? ` · ${draft.category}` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlanningStudio({
  templates,
  templateFormData,
  templateBusy,
  arrangeSummary,
  aiDayPlan,
  aiStatus,
  viewMode,
  onTemplateChange,
  onTemplateDayToggle,
  onCreateTemplate,
  onArrangeTemplates,
  onRequestAIDayPlan,
  onClearRange,
}) {
  const dayOptions = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const aiCoachRef = useRef(null);

  useEffect(() => {
    if (!aiDayPlan?.data) {
      return;
    }

    aiCoachRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [aiDayPlan?.data]);

  return (
    <div className="planning-studio">
      <div className="panic-head">
        <div>
          <div className="section-label">Smart arrange</div>
          <h3>Feed the system your repeating life</h3>
          <p className="planning-subcopy muted">
            Add recurring blocks with time, energy, motivation, difficulty, and importance. Then let NextBlock place them across the {viewMode}.
          </p>
        </div>
        <div className="planning-head-actions">
          <div
            className={`ai-status-badge ${
              aiStatus?.loading ? "ai-status-loading" : aiStatus?.online ? "ai-status-online" : "ai-status-offline"
            }`}
          >
            <span className="ai-status-dot" />
            <span>
              {aiStatus?.loading
                ? "AI checking"
                : aiStatus?.online
                  ? `AI online${aiStatus?.provider ? ` · ${aiStatus.provider}` : ""}`
                  : "AI offline · built-in coach ready"}
            </span>
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={templateBusy}
            onClick={onArrangeTemplates}
          >
            {templateBusy ? "Arranging..." : `Arrange this ${viewMode}`}
          </button>
        </div>
      </div>

      <div className="planning-action-row">
        <button
          type="button"
          className="secondary-button"
          disabled={templateBusy || aiDayPlan?.loading}
          onClick={onRequestAIDayPlan}
        >
          {aiDayPlan?.loading ? "Thinking..." : "Ask AI coach"}
        </button>
        <div className="muted planning-inline-note">
          It reads your current tasks and recurring rules, then suggests the most believable shape for the day.
        </div>
      </div>

      <div className="cleanup-row">
        <button type="button" className="ghost-button ghost-danger" onClick={() => onClearRange("day")}>
          Clear day
        </button>
        <button type="button" className="ghost-button ghost-danger" onClick={() => onClearRange("week")}>
          Clear week
        </button>
        <button type="button" className="ghost-button ghost-danger" onClick={() => onClearRange("month")}>
          Clear month
        </button>
      </div>

      {aiDayPlan?.loading ? (
        <div className="ai-coach-card ai-coach-card-loading">
          <div className="section-label">AI day coach</div>
          <h4>Thinking through your day...</h4>
          <div className="planning-inline-note">
            Looking at current tasks, recurring rules, and the shape of your day.
          </div>
        </div>
      ) : null}

      <form className="planning-form-grid" onSubmit={onCreateTemplate}>
        <label className="planning-field planning-field-title">
          <span className="planning-field-label">Recurring task</span>
          <input
            name="title"
            placeholder="Gym, meds, invoice hour, weekly groceries..."
            value={templateFormData.title}
            onChange={onTemplateChange}
            required
          />
        </label>

        <div className="planning-form-row">
          <label className="planning-field">
            <span className="planning-field-label">Cadence</span>
            <select name="cadence" value={templateFormData.cadence} onChange={onTemplateChange}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </label>
          <label className="planning-field">
            <span className="planning-field-label">Best window</span>
            <select name="preferredWindow" value={templateFormData.preferredWindow} onChange={onTemplateChange}>
              <option value="ANYTIME">Anytime</option>
              <option value="MORNING">Morning</option>
              <option value="MIDDAY">Midday</option>
              <option value="AFTERNOON">Afternoon</option>
              <option value="EVENING">Evening</option>
            </select>
          </label>
          <label className="planning-field">
            <span className="planning-field-label">Minutes</span>
            <input
              type="number"
              min="5"
              step="5"
              name="estimatedMinutes"
              value={templateFormData.estimatedMinutes}
              onChange={onTemplateChange}
            />
          </label>
        </div>

        <div className="planning-form-row">
          <label className="planning-field">
            <span className="planning-field-label">Motivation</span>
            <select name="motivation" value={templateFormData.motivation} onChange={onTemplateChange}>
              <option value="LOW">Low motivation</option>
              <option value="MEDIUM">Medium motivation</option>
              <option value="HIGH">High motivation</option>
            </select>
          </label>
          <label className="planning-field">
            <span className="planning-field-label">Energy</span>
            <select name="energy" value={templateFormData.energy} onChange={onTemplateChange}>
              <option value="LOW">Low energy</option>
              <option value="MEDIUM">Medium energy</option>
              <option value="HIGH">High energy</option>
            </select>
          </label>
          <label className="planning-field">
            <span className="planning-field-label">Importance</span>
            <select name="importance" value={templateFormData.importance} onChange={onTemplateChange}>
              <option value="LOW">Low importance</option>
              <option value="MEDIUM">Medium importance</option>
              <option value="HIGH">High importance</option>
            </select>
          </label>
          <label className="planning-field">
            <span className="planning-field-label">Difficulty</span>
            <select name="difficulty" value={templateFormData.difficulty} onChange={onTemplateChange}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
        </div>

        <div className="planning-form-row">
          <label className="planning-field">
            <span className="planning-field-label">Category</span>
            <input
              name="category"
              placeholder="Category"
              value={templateFormData.category}
              onChange={onTemplateChange}
            />
          </label>
          {templateFormData.cadence === "MONTHLY" ? (
            <label className="planning-field">
              <span className="planning-field-label">Day of month</span>
              <input
                type="number"
                min="1"
                max="31"
                name="dayOfMonth"
                value={templateFormData.dayOfMonth}
                onChange={onTemplateChange}
              />
            </label>
          ) : null}
        </div>

        {templateFormData.cadence === "WEEKLY" ? (
          <div className="preset-row">
            {dayOptions.map((dayName) => (
              <button
                key={dayName}
                type="button"
                className={`chip-button ${templateFormData.daysOfWeek.includes(dayName) ? "chip-active" : ""}`}
                onClick={() => onTemplateDayToggle(dayName)}
              >
                {dayName.slice(0, 3)}
              </button>
            ))}
          </div>
        ) : null}

        <button type="submit" className="secondary-button" disabled={templateBusy}>
          {templateBusy ? "Saving..." : "Save planning rule"}
        </button>
      </form>

      {templates.length > 0 ? (
        <div className="template-list">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-card-top">
                <strong>{template.title}</strong>
                <span className="template-cadence-pill">{template.cadence.toLowerCase()}</span>
              </div>
              <span className="muted">
                {template.estimatedMinutes} min · {template.preferredWindow.toLowerCase()}
                {template.cadence === "WEEKLY" && template.daysOfWeek?.length
                  ? ` · ${template.daysOfWeek.map((day) => day.slice(0, 3)).join(", ")}`
                  : ""}
                {template.cadence === "MONTHLY" ? ` · day ${template.dayOfMonth}` : ""}
              </span>
              <div className="template-meta-row">
                <span className="mini-meta-chip">motivation {template.motivation.toLowerCase()}</span>
                <span className="mini-meta-chip">energy {template.energy.toLowerCase()}</span>
                <span className="mini-meta-chip">difficulty {template.difficulty.toLowerCase()}</span>
                <span className="mini-meta-chip">importance {template.importance.toLowerCase()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {aiDayPlan?.data ? (
        <div ref={aiCoachRef} className="ai-coach-card ai-coach-card-live">
          <div className="planning-debt-head">
            <div>
              <div className="section-label">AI day coach</div>
              <h4>{aiDayPlan.data.headline}</h4>
            </div>
            <div className="helper-chip">
              {aiDayPlan.data.source === "built-in" ? "Built-in coach" : "Live coach"}
            </div>
          </div>

          {aiDayPlan.data.focusBlock ? (
            <div className="ai-focus-callout">
              <strong>{aiDayPlan.data.focusBlock.title}</strong>
              <span className="muted">{aiDayPlan.data.focusBlock.reason}</span>
            </div>
          ) : null}

          <div className="ai-coach-grid">
            <div>
              <strong>Suggestions</strong>
              <div className="planning-debt-list">
                {(aiDayPlan.data.suggestions ?? []).map((item) => (
                  <div key={item} className="planning-debt-item planning-debt-item-positive">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <strong>Watch for</strong>
              <div className="planning-debt-list">
                {(aiDayPlan.data.risks ?? []).map((item) => (
                  <div key={item} className="planning-debt-item">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {aiDayPlan.data.encouragement ? (
            <div className="planning-inline-note">{aiDayPlan.data.encouragement}</div>
          ) : null}
        </div>
      ) : null}

      {aiDayPlan?.error ? <div className="banner-error">{aiDayPlan.error}</div> : null}

      {arrangeSummary ? (
        <div className="planning-debt-panel">
          <div className="planning-debt-head">
            <div>
              <div className="section-label">Planning debt</div>
              <h4>What got placed, and what the planner protected</h4>
            </div>
            <div className="helper-chip">
              {arrangeSummary.createdCount} placed · {arrangeSummary.skippedCount} held
            </div>
          </div>

          {arrangeSummary.created.length > 0 ? (
            <div className="planning-debt-group">
              <strong>Placed now</strong>
              <div className="planning-debt-list">
                {arrangeSummary.created.slice(0, 6).map((task) => (
                  <div key={task.id} className="planning-debt-item planning-debt-item-positive">
                    <span>{task.title}</span>
                    <span className="muted">
                      {task.date} · {task.startTime.slice(0, 5)} - {task.endTime.slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {arrangeSummary.skipped.length > 0 ? (
            <div className="planning-debt-group">
              <strong>Held back on purpose</strong>
              <div className="planning-debt-list">
                {arrangeSummary.skipped.slice(0, 6).map((item) => (
                  <div key={`${item.templateId}-${item.date}`} className="planning-debt-item">
                    <span>{item.title}</span>
                    <span className="muted">{item.date}</span>
                    <span className="planning-debt-reason">{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RangePlan({ tasks, rangeMeta, viewMode }) {
  const grouped = tasks.reduce((accumulator, task) => {
    accumulator[task.date] ??= [];
    accumulator[task.date].push(task);
    return accumulator;
  }, {});

  const dates = listDatesInRange(rangeMeta);

  return (
    <div className="range-plan-grid">
      {dates.map((date) => (
        <div key={date} className="range-day-card">
          <div className="section-label">{formatReadableDate(date)}</div>
          <div className="range-day-list">
            {(grouped[date] ?? []).length > 0 ? (
              grouped[date]
                .sort((left, right) => left.startTime.localeCompare(right.startTime))
                .map((task) => (
                <div key={task.id} className="range-task-line">
                  <strong>{task.title}</strong>
                  <span className="muted">
                    {task.startTime.slice(0, 5)} - {task.endTime.slice(0, 5)} · {task.status.toLowerCase()}
                  </span>
                  {task.arrangementReason ? (
                    <span className="range-task-reason">{task.arrangementReason}</span>
                  ) : null}
                </div>
                ))
            ) : (
              <div className="range-empty muted">
                {viewMode === "month"
                  ? "Nothing arranged here yet."
                  : "Open space for this day."}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function WinsRail({ doneTasks, latestWin }) {
  if (doneTasks.length === 0) {
    return null;
  }

  const sortedDoneTasks = [...doneTasks].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt ?? left.createdAt ?? 0);
    const rightTime = Date.parse(right.updatedAt ?? right.createdAt ?? 0);
    return rightTime - leftTime;
  });

  return (
    <div className="wins-panel">
      <div className="wins-head">
        <div>
          <div className="section-label">Wins today</div>
          <h3>{doneTasks.length} completed block{doneTasks.length === 1 ? "" : "s"}</h3>
        </div>
        <div className="helper-chip">{doneTasks.reduce((sum, task) => sum + Number(task.estimatedMinutes || 0), 0)} min</div>
      </div>

      <div className="wins-list">
        {sortedDoneTasks.map((task) => (
          <div
            key={task.id}
            className={`win-chip-card ${latestWin?.id === task.id ? "win-chip-card-latest" : ""}`}
          >
            <div className="win-chip-topline">
              <span className="win-chip-badge">
                {latestWin?.id === task.id ? "Newest win" : "Done"}
              </span>
              {task.category ? <span className="mini-category">{task.category}</span> : null}
            </div>
            <strong>{task.title}</strong>
            <span className="muted">
              {task.startTime.slice(0, 5)} - {task.endTime.slice(0, 5)} · {task.estimatedMinutes} min
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineBoard({
  tasks,
  currentTaskId,
  nextTaskId,
  editingTaskId,
  dragState,
  onTimelineTaskDrop,
  onTimelineDragStart,
  onTimelineDragEnd,
  onTimelineTaskSelect,
}) {
  const [dropMinutes, setDropMinutes] = useState(null);

  if (tasks.length === 0) {
    return null;
  }

  const earliest = Math.max(
    0,
    Math.min(...tasks.map((task) => parseMinutes(task.startTime))) - 30
  );
  const latest = Math.min(
    24 * 60,
    Math.max(...tasks.map((task) => parseMinutes(task.endTime))) + 30
  );
  const span = Math.max(60, latest - earliest);
  const hourMarkers = [];

  for (let marker = Math.floor(earliest / 60) * 60; marker <= latest; marker += 60) {
    hourMarkers.push(marker);
  }

  function getMinutesFromEvent(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const ratio = rect.height === 0 ? 0 : y / rect.height;
    const rawMinutes = earliest + ratio * span;
    const rounded = Math.round(rawMinutes / 15) * 15;
    return Math.min(Math.max(rounded, 0), 24 * 60);
  }

  return (
    <div className="timeline-card">
      <div className="timeline-topbar">
        <div className="section-label">Timeline</div>
        <div className="timeline-help muted">
          Drag a task block up or down here to rewrite its time.
        </div>
      </div>

      <div
        className={`timeline-board ${dragState.taskId ? "timeline-board-drop-mode" : ""}`}
        onDragOver={(event) => {
          if (!dragState.taskId) {
            return;
          }

          event.preventDefault();
          setDropMinutes(getMinutesFromEvent(event));
        }}
        onDragLeave={() => setDropMinutes(null)}
        onDrop={(event) => {
          if (!dragState.taskId) {
            return;
          }

          event.preventDefault();
          const nextMinutes = getMinutesFromEvent(event) - dragState.offsetMinutes;
          onTimelineTaskDrop(dragState.taskId, nextMinutes);
          setDropMinutes(null);
        }}
      >
        {hourMarkers.map((marker) => (
          <div
            key={marker}
            className="timeline-hour"
            style={{ top: `${((marker - earliest) / span) * 100}%` }}
          >
            <span className="timeline-hour-label">
              {String(Math.floor(marker / 60)).padStart(2, "0")}:00
            </span>
          </div>
        ))}

        {dropMinutes !== null ? (
          <div
            className="timeline-drop-guide"
            style={{ top: `${((dropMinutes - earliest) / span) * 100}%` }}
          >
            <span>{String(Math.floor(dropMinutes / 60)).padStart(2, "0")}:{String(dropMinutes % 60).padStart(2, "0")}</span>
          </div>
        ) : null}

        {tasks.map((task) => {
          const start = parseMinutes(task.startTime);
          const end = parseMinutes(task.endTime);
          const top = ((start - earliest) / span) * 100;
          const height = Math.max(10, ((end - start) / span) * 100);
          const toneClass =
            task.id === currentTaskId
              ? "timeline-block-current"
              : task.id === nextTaskId
                ? "timeline-block-next"
                : task.status === "DONE"
                  ? "timeline-block-done"
                  : task.status === "MISSED"
                    ? "timeline-block-missed"
                    : "timeline-block-planned";

          return (
            <button
              key={task.id}
              type="button"
              draggable
              className={`timeline-block ${toneClass} ${task.id === editingTaskId ? "timeline-block-editing" : ""} ${task.id === dragState.taskId ? "timeline-block-dragging" : ""}`}
              style={{ top: `${top}%`, height: `${height}%` }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                const rect = event.currentTarget.getBoundingClientRect();
                const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
                const ratio = rect.height === 0 ? 0 : y / rect.height;
                const offsetMinutes = Math.round((end - start) * ratio);
                onTimelineDragStart(task.id, offsetMinutes);
              }}
              onDragEnd={() => {
                setDropMinutes(null);
                onTimelineDragEnd();
              }}
              onClick={() => onTimelineTaskSelect(task.id, true)}
            >
              <span className="timeline-block-title">{task.title}</span>
              <span className="timeline-block-time">
                {task.startTime.slice(0, 5)} - {task.endTime.slice(0, 5)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskList({
  mode = "full",
  tasks,
  loading,
  latestWin,
  viewMode,
  rangeMeta,
  templates,
  templateFormData,
  templateBusy,
  arrangeSummary,
  aiDayPlan,
  aiStatus,
  currentTaskId,
  nextTaskId,
  busyTaskId,
  editingTaskId,
  editFormData,
  editError,
  quickAddData,
  quickAddBusy,
  braindumpState,
  onTaskAction,
  onHardToStart,
  onEditOpen,
  onEditCancel,
  onEditChange,
  onEditSave,
  onDuplicateTask,
  onQuickAddChange,
  onQuickAdd,
  onBraindumpChange,
  onCompileBraindump,
  onCreateDraftBlocks,
  onTemplateChange,
  onTemplateDayToggle,
  onCreateTemplate,
  onArrangeTemplates,
  onRequestAIDayPlan,
  onClearRange,
  onReformDay,
  onSwapTaskSlots,
  onMoveTaskByMinutes,
  onTimelineReschedule,
}) {
  const isTodayMode = mode === "today";
  const isAddMode = mode === "add";
  const isOrganizeMode = mode === "organize";
  const showQuickAdd = mode === "full" || isAddMode;
  const showBraindump = mode === "full" || isAddMode;
  const showPlanningStudio = mode === "full" || isOrganizeMode;
  const showPlannerShell = mode === "full" || isTodayMode || isOrganizeMode;
  const [dragState, setDragState] = useState({ taskId: null, offsetMinutes: 0 });
  const [dragTargetId, setDragTargetId] = useState(null);
  const [showDone, setShowDone] = useState(true);
  const [showMissed, setShowMissed] = useState(true);
  const quickAddTitleRef = useRef(null);

  useEffect(() => {
    if (!showQuickAdd) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      const tagName = target?.tagName;
      const isTypingTarget =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        tagName === "BUTTON" ||
        target?.isContentEditable;

      if (isTypingTarget) {
        return;
      }

      if (event.key.toLowerCase() === "n" || event.key === "/") {
        event.preventDefault();
        quickAddTitleRef.current?.focus();
        quickAddTitleRef.current?.select();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showQuickAdd]);

  const visibleTasks = tasks.filter((task) => {
    if (!showDone && task.status === "DONE") {
      return false;
    }

    if (!showMissed && task.status === "MISSED") {
      return false;
    }

    return true;
  });
  const doneTasks = tasks.filter((task) => task.status === "DONE");
  const activeAndPlannedTasks = visibleTasks.filter((task) => task.status !== "DONE");
  const queueTasks = tasks.filter((task) => task.status !== "DONE");

  if (isAddMode) {
    return (
      <section className="card tasks-card tasks-card-quiet">
        <div className="card-head compact-head">
          <div>
            <div className="eyebrow">Capture fast</div>
            <h2>Add without friction</h2>
          </div>
          <div className="helper-chip">Fast lane</div>
        </div>

        {showQuickAdd ? (
          <QuickAddBar
            quickAddData={quickAddData}
            quickAddBusy={quickAddBusy}
            onQuickAddChange={onQuickAddChange}
            onQuickAdd={onQuickAdd}
            titleInputRef={quickAddTitleRef}
          />
        ) : null}

        {showBraindump ? (
          <PanicToPlan
            braindumpState={braindumpState}
            quickAddBusy={quickAddBusy}
            onBraindumpChange={onBraindumpChange}
            onCompileBraindump={onCompileBraindump}
            onCreateDraftBlocks={onCreateDraftBlocks}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className={`card tasks-card ${isTodayMode ? "tasks-card-today" : ""}`}>
      <div className="card-head compact-head">
        <div>
          <div className="eyebrow">
            {isTodayMode
              ? "Today"
              : viewMode === "day"
                ? "Daily blocks"
                : `${viewMode} planner`}
          </div>
          <h2>
            {isTodayMode
              ? "Today, in order"
              : viewMode === "day"
                ? "Your plan"
                : `Your ${viewMode} plan`}
          </h2>
        </div>
        <div className="helper-chip">
          {isTodayMode
            ? `${queueTasks.length} on deck`
            : tasks.length === 0
              ? "No blocks yet"
              : `${tasks.length} scheduled`}
        </div>
      </div>

      {showQuickAdd ? (
        <QuickAddBar
          quickAddData={quickAddData}
          quickAddBusy={quickAddBusy}
          onQuickAddChange={onQuickAddChange}
          onQuickAdd={onQuickAdd}
          titleInputRef={quickAddTitleRef}
        />
      ) : null}

      {showBraindump ? (
        <PanicToPlan
          braindumpState={braindumpState}
          quickAddBusy={quickAddBusy}
          onBraindumpChange={onBraindumpChange}
          onCompileBraindump={onCompileBraindump}
          onCreateDraftBlocks={onCreateDraftBlocks}
        />
      ) : null}

      {showPlanningStudio ? (
        <PlanningStudio
          templates={templates}
          templateFormData={templateFormData}
          templateBusy={templateBusy}
          arrangeSummary={arrangeSummary}
          aiDayPlan={aiDayPlan}
          aiStatus={aiStatus}
          viewMode={viewMode}
          onTemplateChange={onTemplateChange}
          onTemplateDayToggle={onTemplateDayToggle}
          onCreateTemplate={onCreateTemplate}
          onArrangeTemplates={onArrangeTemplates}
          onRequestAIDayPlan={onRequestAIDayPlan}
          onClearRange={onClearRange}
        />
      ) : null}

      {!showPlannerShell ? null : loading ? (
        <p className="muted">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <div className="empty-panel">
          <h3>A clear day starts small</h3>
          <p className="muted">
            Add one short block for this date and the planner will start guiding
            what to do now and what comes next.
          </p>
        </div>
      ) : viewMode !== "day" ? (
        <>
          <PlannerInsight tasks={tasks} />

          <div className="view-toolbar">
            <div className="drag-note muted">
              Viewing the {viewMode} range
              {rangeMeta?.from && rangeMeta?.to ? ` from ${rangeMeta.from} to ${rangeMeta.to}` : ""}.
            </div>
          </div>

          <RangePlan tasks={tasks} rangeMeta={rangeMeta} viewMode={viewMode} />
        </>
      ) : (
        <>
          {isTodayMode ? (
            <div className="today-queue-note">
              The quieter this screen stays, the easier it is to just do the next block.
            </div>
          ) : (
            <PlannerInsight tasks={tasks} />
          )}

          {isTodayMode ? null : (
            <div className="view-toolbar">
              <div className="drag-note muted">
                Press <strong>N</strong> to add fast. Drag onto another task to swap slots, or drag on the timeline to rewrite time.
              </div>
              <div className="toggle-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onReformDay}
                >
                  Re-form day
                </button>
                <button
                  type="button"
                  className={`chip-button ${showDone ? "chip-active" : ""}`}
                  onClick={() => setShowDone((prev) => !prev)}
                >
                  {showDone ? "Hide done" : "Show done"}
                </button>
                <button
                  type="button"
                  className={`chip-button ${showMissed ? "chip-active" : ""}`}
                  onClick={() => setShowMissed((prev) => !prev)}
                >
                  {showMissed ? "Hide missed" : "Show missed"}
                </button>
              </div>
            </div>
          )}

          {isTodayMode ? (
            <div className="today-queue">
              <div className="task-list">
                {queueTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isCurrent={task.id === currentTaskId}
                    isNext={task.id === nextTaskId}
                    isEditing={task.id === editingTaskId}
                    isDragging={task.id === dragState.taskId}
                    isDropTarget={task.id === dragTargetId}
                    editFormData={task.id === editingTaskId ? editFormData : null}
                    editError={task.id === editingTaskId ? editError : ""}
                    onTaskAction={onTaskAction}
                    onHardToStart={onHardToStart}
                    onEditOpen={onEditOpen}
                    onEditCancel={onEditCancel}
                    onEditChange={onEditChange}
                    onEditSave={onEditSave}
                    onDuplicateTask={onDuplicateTask}
                    onMoveTaskEarlier={() => onMoveTaskByMinutes(task, -15)}
                    onMoveTaskLater={() => onMoveTaskByMinutes(task, 15)}
                    onDragStart={() => setDragState({ taskId: task.id, offsetMinutes: 0 })}
                    onDragEnd={() => {
                      setDragState({ taskId: null, offsetMinutes: 0 });
                      setDragTargetId(null);
                    }}
                    onDragOver={() => setDragTargetId(task.id)}
                    onDrop={() => {
                      if (dragState.taskId) {
                        onSwapTaskSlots(dragState.taskId, task.id);
                      }
                      setDragState({ taskId: null, offsetMinutes: 0 });
                      setDragTargetId(null);
                    }}
                    busyTaskId={busyTaskId}
                  />
                ))}
              </div>
              <WinsRail doneTasks={doneTasks} latestWin={latestWin} />
            </div>
          ) : (
            <div className="planner-workspace">
              <div className="timeline-column">
                <TimelineBoard
                  tasks={visibleTasks}
                  currentTaskId={currentTaskId}
                  nextTaskId={nextTaskId}
                  editingTaskId={editingTaskId}
                  dragState={dragState}
                  onTimelineTaskDrop={onTimelineReschedule}
                  onTimelineDragStart={(taskId, offsetMinutes) => {
                    setDragState({ taskId, offsetMinutes });
                  }}
                  onTimelineDragEnd={() => {
                    setDragState({ taskId: null, offsetMinutes: 0 });
                  }}
                  onTimelineTaskSelect={(taskId, openEditor = false) => {
                    setDragState({ taskId: openEditor ? null : taskId, offsetMinutes: 0 });
                    if (openEditor) {
                      const task = tasks.find((item) => item.id === taskId);
                      if (task) {
                        onEditOpen(task);
                      }
                    }
                  }}
                />
              </div>

              <div className="task-rail">
                <WinsRail doneTasks={doneTasks} latestWin={latestWin} />
                <div className="task-list">
                  {activeAndPlannedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isCurrent={task.id === currentTaskId}
                      isNext={task.id === nextTaskId}
                      isEditing={task.id === editingTaskId}
                      isDragging={task.id === dragState.taskId}
                      isDropTarget={task.id === dragTargetId}
                      editFormData={task.id === editingTaskId ? editFormData : null}
                      editError={task.id === editingTaskId ? editError : ""}
                      onTaskAction={onTaskAction}
                      onHardToStart={onHardToStart}
                      onEditOpen={onEditOpen}
                      onEditCancel={onEditCancel}
                      onEditChange={onEditChange}
                      onEditSave={onEditSave}
                      onDuplicateTask={onDuplicateTask}
                      onMoveTaskEarlier={() => onMoveTaskByMinutes(task, -15)}
                      onMoveTaskLater={() => onMoveTaskByMinutes(task, 15)}
                      onDragStart={() => setDragState({ taskId: task.id, offsetMinutes: 0 })}
                      onDragEnd={() => {
                        setDragState({ taskId: null, offsetMinutes: 0 });
                        setDragTargetId(null);
                      }}
                      onDragOver={() => setDragTargetId(task.id)}
                      onDrop={() => {
                        if (dragState.taskId) {
                          onSwapTaskSlots(dragState.taskId, task.id);
                        }
                        setDragState({ taskId: null, offsetMinutes: 0 });
                        setDragTargetId(null);
                      }}
                      busyTaskId={busyTaskId}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
