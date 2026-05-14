import { useEffect, useState } from "react";

function formatClock(minutesLeft) {
  const mins = Math.floor(minutesLeft / 60);
  const secs = minutesLeft % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function GuidanceTask({
  label,
  task,
  onTaskAction,
  onHardToStart,
  busyTaskId,
}) {
  if (!task) {
    return (
      <div className="focus-task empty-focus">
        <div className="section-label">{label}</div>
        <div className="empty-state">Nothing queued here yet.</div>
      </div>
    );
  }

  const isBusy = busyTaskId === task.id;
  const showStart = task.status === "PLANNED";
  const showComplete = task.status === "ACTIVE";
  const showMiss = task.status !== "DONE" && task.status !== "MISSED";

  return (
    <div className="focus-task">
      <div className="section-label">{label}</div>
      <h3>{task.title}</h3>
      {task.description ? <p className="muted">{task.description}</p> : null}

      <div className="task-card-time">
        {task.startTime.slice(0, 5)} - {task.endTime.slice(0, 5)}
      </div>

      <div className="badges">
        <span className={`badge badge-status status-${task.status.toLowerCase()}`}>
          {task.status}
        </span>
        <span className="badge badge-difficulty">{task.difficulty}</span>
      </div>

      <div className="action-row">
        {showStart ? (
          <button
            className="primary-button"
            disabled={isBusy}
            onClick={() => onTaskAction(task.id, "start")}
          >
            {isBusy ? "Working..." : "Start"}
          </button>
        ) : null}

        {showComplete ? (
          <button
            className="primary-button"
            disabled={isBusy}
            onClick={() => onTaskAction(task.id, "complete")}
          >
            {isBusy ? "Working..." : "Complete"}
          </button>
        ) : null}

        {showMiss ? (
          <button
            className="ghost-button"
            disabled={isBusy}
            onClick={() => onTaskAction(task.id, "miss")}
          >
            Mark missed
          </button>
        ) : null}

        <button
          className="ghost-button"
          disabled={isBusy}
          onClick={() => onHardToStart(task)}
        >
          Get unstuck
        </button>
      </div>
    </div>
  );
}

function FocusCompanion({ currentTask, nextTask, onTaskAction, busyTaskId }) {
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionLabel, setSessionLabel] = useState("");
  const [witnessMode, setWitnessMode] = useState(false);

  useEffect(() => {
    if (sessionSeconds <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSessionSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [sessionSeconds]);

  const anchorTask = currentTask ?? nextTask;
  const focusOptions = [300, 600, 1500];

  return (
    <div className="focus-companion">
      <div className="section-label">Focus companion</div>
      <div className="focus-companion-head">
        <div>
          <h3>{sessionSeconds > 0 ? sessionLabel || "Focus sprint running" : "Start a visible sprint"}</h3>
          <p className="muted">
            {anchorTask
              ? `Anchor on "${anchorTask.title}" and let the timer carry the first few minutes.`
              : "Pick the next realistic block and let the timer create urgency without pressure."}
          </p>
        </div>
        <div className={`focus-orb ${sessionSeconds > 0 ? "focus-orb-live" : ""}`}>
          {sessionSeconds > 0 ? formatClock(sessionSeconds) : "Ready"}
        </div>
      </div>

      <div className="preset-row">
        {focusOptions.map((seconds) => (
          <button
            key={seconds}
            type="button"
            className="chip-button"
            onClick={() => {
              setSessionSeconds(seconds);
              setSessionLabel(`${Math.round(seconds / 60)} minute focus sprint`);
            }}
          >
            {Math.round(seconds / 60)} min sprint
          </button>
        ))}
        {sessionSeconds > 0 ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setSessionSeconds(0);
              setSessionLabel("");
            }}
          >
            End sprint
          </button>
        ) : null}
      </div>

      <div className="body-double-card">
        <div>
          <strong>{witnessMode ? "Witness mode is on" : "Need a body-double effect?"}</strong>
          <p className="muted">
            {witnessMode
              ? "Act like someone will check back when this timer ends. Tiny accountability is still accountability."
              : "Borrow the feeling of being seen. State the block, start the timer, and stay with it."}
          </p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setWitnessMode((prev) => !prev)}
        >
          {witnessMode ? "Leave witness mode" : "Turn on witness mode"}
        </button>
      </div>

      {anchorTask?.status === "PLANNED" ? (
        <div className="action-row">
          <button
            type="button"
            className="primary-button"
            disabled={busyTaskId === anchorTask.id}
            onClick={() => onTaskAction(anchorTask.id, "start")}
          >
            {busyTaskId === anchorTask.id ? "Working..." : "Start this sprint on the chosen block"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RecoveryPrompt({ summary, currentTask }) {
  let title = "Stay with the smallest next move";
  let body = "Pick one short block, start it, and let the rest of the day stay quiet for a minute.";

  if (currentTask) {
    title = "Protect the block already in motion";
    body = "You do not need to solve the whole day. Keep this block alive, then reevaluate.";
  } else if (summary.missed > 0) {
    title = "Your day slipped a little. That's recoverable.";
    body = "Avoid trying to fix everything. Update one block or start the next realistic one.";
  } else if (summary.done > 0) {
    title = "Momentum is already here";
    body = "Use the next block while your attention is still warm.";
  }

  return (
    <div className="recovery-panel">
      <div className="section-label">Recovery note</div>
      <h3>{title}</h3>
      <p className="muted">{body}</p>
    </div>
  );
}

function StarterPlan({ supportState, busyTaskId, onTaskAction }) {
  const hasStructuredPlan = Boolean(
    supportState.headline ||
      supportState.firstStep ||
      supportState.backupStep ||
      supportState.reason ||
      supportState.ritualName
  );
  const isLegacyPlan =
    !hasStructuredPlan &&
    supportState.suggestions.length > 0;

  if (supportState.loading) {
    return <p className="muted">Building a smaller way into this block...</p>;
  }

  if (supportState.error) {
    return <p className="error-text">{supportState.error}</p>;
  }

  if (!hasStructuredPlan && supportState.suggestions.length === 0) {
    return (
      <p className="muted">
        Tap <strong>Get unstuck</strong> on a task when you want a smaller,
        more concrete way to begin.
      </p>
    );
  }

  return (
    <>
      {isLegacyPlan ? (
        <div className="legacy-warning">
          <strong>Older unstuck response detected.</strong>
          <span>Restart the backend to get the new structured starter plan.</span>
        </div>
      ) : null}

      <div className="starter-headline-row">
        {supportState.ritualName ? (
          <div className="helper-chip helper-chip-ritual">{supportState.ritualName}</div>
        ) : null}
        {supportState.source ? (
          <div className="helper-chip">
            {supportState.source === "built-in"
              ? "Built-in coach"
              : supportState.source === "ai-service"
                ? "AI coach"
                : "Planner coach"}
          </div>
        ) : null}
        {supportState.mode ? <div className="helper-chip">{supportState.mode}</div> : null}
        {supportState.suggestedMinutes ? (
          <div className="helper-chip">{supportState.suggestedMinutes} min</div>
        ) : null}
      </div>

      <h3>{supportState.headline || supportState.taskTitle}</h3>

      {supportState.reason ? (
        <p className="muted starter-reason">{supportState.reason}</p>
      ) : null}

      {supportState.momentumLine ? (
        <div className="starter-note-band">{supportState.momentumLine}</div>
      ) : null}

      {supportState.firstStep ? (
        <div className="starter-step-card">
          <div className="section-label">First step</div>
          <p>{supportState.firstStep}</p>
        </div>
      ) : null}

      {supportState.setupStep ? (
        <div className="starter-step-card starter-step-card-setup">
          <div className="section-label">Set the scene</div>
          <p>{supportState.setupStep}</p>
        </div>
      ) : null}

      {supportState.backupStep ? (
        <div className="starter-step-card starter-step-card-secondary">
          <div className="section-label">Backup step</div>
          <p>{supportState.backupStep}</p>
        </div>
      ) : null}

      {supportState.permissionSlip ? (
        <div className="permission-slip">
          <div className="section-label">Permission slip</div>
          <p>{supportState.permissionSlip}</p>
        </div>
      ) : null}

      {supportState.rescueChoices.length > 0 ? (
        <div className="rescue-choice-grid">
          {supportState.rescueChoices.map((choice) => (
            <div key={choice} className="rescue-choice-card">
              {choice}
            </div>
          ))}
        </div>
      ) : null}

      {supportState.suggestions.length > 0 ? (
        <ul className="suggestion-list">
          {supportState.suggestions.map((suggestion, index) => (
            <li key={suggestion}>
              <span className="suggestion-number">{index + 1}</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {supportState.taskStatus === "PLANNED" ? (
        <div className="action-row">
          <button
            className="primary-button"
            disabled={busyTaskId === supportState.taskId}
            onClick={() => onTaskAction(supportState.taskId, "start")}
          >
            {busyTaskId === supportState.taskId
              ? "Working..."
              : supportState.ctaLabel || "Start this block now"}
          </button>
        </div>
      ) : null}
    </>
  );
}

export default function WhatNowCard({
  whatNow,
  loading,
  selectedDate,
  currentTime,
  supportState,
  summary,
  onTaskAction,
  onHardToStart,
  busyTaskId,
  compact = false,
}) {
  const hasStarterPlan = Boolean(
    supportState.loading
      || supportState.error
      || supportState.headline
      || supportState.firstStep
      || supportState.ritualName
      || supportState.suggestions.length
  );

  return (
    <section className="card focus-card">
      <div className="card-head">
        <div>
          <div className="eyebrow">Current guidance</div>
          <h2>What now</h2>
        </div>
        <div className="time-chip">
          {selectedDate} at {currentTime.slice(0, 5)}
        </div>
      </div>

      {loading ? (
        <p className="muted">Updating your current flow...</p>
      ) : (
        <>
          <p className="focus-message">
            {whatNow?.message || "No guidance yet. Add a block to get started."}
          </p>

          <div className="focus-grid">
            <GuidanceTask
              label="Current"
              task={whatNow?.currentTask}
              onTaskAction={onTaskAction}
              onHardToStart={onHardToStart}
              busyTaskId={busyTaskId}
            />
            <GuidanceTask
              label="Next"
              task={whatNow?.nextTask}
              onTaskAction={onTaskAction}
              onHardToStart={onHardToStart}
              busyTaskId={busyTaskId}
            />
          </div>

          {!compact ? <RecoveryPrompt summary={summary} currentTask={whatNow?.currentTask} /> : null}

          {!compact ? (
            <FocusCompanion
              currentTask={whatNow?.currentTask}
              nextTask={whatNow?.nextTask}
              onTaskAction={onTaskAction}
              busyTaskId={busyTaskId}
            />
          ) : null}

          {(!compact || hasStarterPlan) ? (
            <div className="support-card">
              <div className="section-label">Starter plan</div>
              <StarterPlan
                supportState={supportState}
                busyTaskId={busyTaskId}
                onTaskAction={onTaskAction}
              />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
