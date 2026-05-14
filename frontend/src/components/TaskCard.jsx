function getStatusTone(status) {
  if (status === "ACTIVE") {
    return "status-active";
  }

  if (status === "DONE") {
    return "status-done";
  }

  if (status === "MISSED") {
    return "status-missed";
  }

  return "status-planned";
}

function EditTaskForm({
  formData,
  error,
  isBusy,
  onChange,
  onSave,
  onCancel,
}) {
  return (
    <div className="edit-panel">
      <div className="edit-grid">
        <label className="field">
          <span className="field-label">Title</span>
          <input name="title" value={formData.title} onChange={onChange} />
        </label>

        <label className="field">
          <span className="field-label">Description</span>
          <input
            name="description"
            value={formData.description}
            onChange={onChange}
          />
        </label>

        <div className="form-row compact-row">
          <label className="field">
            <span className="field-label">Start</span>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={onChange}
            />
          </label>

          <label className="field">
            <span className="field-label">End</span>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={onChange}
            />
          </label>
        </div>

        <div className="form-row compact-row">
          <label className="field">
            <span className="field-label">Difficulty</span>
            <select
              name="difficulty"
              value={formData.difficulty}
              onChange={onChange}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Minutes</span>
            <input
              type="number"
              min="5"
              step="5"
              name="estimatedMinutes"
              value={formData.estimatedMinutes}
              onChange={onChange}
            />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Category</span>
          <input name="category" value={formData.category} onChange={onChange} />
        </label>
      </div>

      {error ? <div className="error-text">{error}</div> : null}

      <div className="action-row">
        <button type="button" className="primary-button" disabled={isBusy} onClick={onSave}>
          {isBusy ? "Saving..." : "Save changes"}
        </button>
        <button type="button" className="ghost-button" disabled={isBusy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TaskCard({
  task,
  isCurrent,
  isNext,
  isEditing,
  isDragging,
  isDropTarget,
  editFormData,
  editError,
  onTaskAction,
  onHardToStart,
  onEditOpen,
  onEditCancel,
  onEditChange,
  onEditSave,
  onDuplicateTask,
  onMoveTaskEarlier,
  onMoveTaskLater,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  busyTaskId,
}) {
  const isBusy = busyTaskId === task.id;
  const canStart = task.status === "PLANNED";
  const canComplete = task.status === "ACTIVE";
  const canMiss = task.status !== "DONE" && task.status !== "MISSED";
  const completionState = task.status === "DONE" ? "card-done" : "";
  const cardState = isCurrent ? "card-current" : isNext ? "card-next" : completionState;

  return (
    <article
      className={`task-card ${cardState} ${isDragging ? "card-dragging" : ""} ${isDropTarget ? "card-drop-target" : ""}`}
      draggable={!isEditing}
      onDragStart={(event) => {
        if (!event.target.closest("[data-drag-handle='true']")) {
          event.preventDefault();
          return;
        }
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <div className="task-card-header">
        <div className="task-card-copy">
          <div className="task-card-topline">
            <span className="drag-handle" aria-hidden="true" data-drag-handle="true">
              <>⋮⋮</>
            </span>
            {isCurrent ? <span className="mini-flag">Now</span> : null}
            {isNext ? <span className="mini-flag mini-flag-next">Up next</span> : null}
            {task.category ? <span className="mini-category">{task.category}</span> : null}
            {task.status === "DONE" ? <span className="mini-flag mini-flag-done">Win kept</span> : null}
          </div>

          <h3 className="task-card-title">{task.title}</h3>

          {task.description ? <p className="task-card-description">{task.description}</p> : null}

          <div className="task-card-time">
            {task.startTime.slice(0, 5)} - {task.endTime.slice(0, 5)} · {task.estimatedMinutes} min
          </div>
          {task.arrangementReason ? (
            <div className="template-placement-note">{task.arrangementReason}</div>
          ) : null}
        </div>

        <div className="badges">
          <span className={`badge badge-status ${getStatusTone(task.status)}`}>
            {task.status}
          </span>
          <span className="badge badge-difficulty">{task.difficulty}</span>
        </div>
      </div>

      {isEditing && editFormData ? (
        <EditTaskForm
          formData={editFormData}
          error={editError}
          isBusy={isBusy}
          onChange={onEditChange}
          onSave={() => onEditSave(task.id)}
          onCancel={onEditCancel}
        />
      ) : (
        <>
          <div className="micro-move-row">
            <button type="button" className="chip-button" disabled={isBusy} onClick={onMoveTaskEarlier}>
              Move earlier 15m
            </button>
            <button type="button" className="chip-button" disabled={isBusy} onClick={onMoveTaskLater}>
              Move later 15m
            </button>
          </div>

          <div className="action-row">
            {canStart ? (
              <button
                type="button"
                className="primary-button"
                disabled={isBusy}
                onClick={() => onTaskAction(task.id, "start")}
              >
                {isBusy ? "Saving..." : "Start"}
              </button>
            ) : null}

            {canComplete ? (
              <button
                type="button"
                className="primary-button complete-button"
                disabled={isBusy}
                onClick={() => onTaskAction(task.id, "complete")}
              >
                {isBusy ? "Saving..." : "Complete"}
              </button>
            ) : null}

            {canMiss ? (
              <button
                type="button"
                className="ghost-button"
                disabled={isBusy}
                onClick={() => onTaskAction(task.id, "miss")}
              >
                Miss
              </button>
            ) : null}

            <button
              type="button"
              className="ghost-button"
              disabled={isBusy}
              onClick={() => onHardToStart(task)}
            >
              Get unstuck
            </button>

            <button
              type="button"
              className="ghost-button"
              disabled={isBusy}
              onClick={() => onDuplicateTask(task)}
            >
              Duplicate
            </button>

            <button
              type="button"
              className="ghost-button"
              disabled={isBusy}
              onClick={() => onEditOpen(task)}
            >
              Edit
            </button>

            <button
              type="button"
              className="ghost-button ghost-danger"
              disabled={isBusy}
              onClick={() => onTaskAction(task.id, "delete")}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </article>
  );
}
