import { useState } from "react";

export default function CreateTaskForm({
  formData,
  onChange,
  onSubmit,
  error,
  isSubmitting,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const durationPresets = [15, 25, 45, 60];

  return (
    <section className="card form-card compact-form-card">
      <div className="card-head compact-head">
        <div>
          <div className="eyebrow">Fine tune a block</div>
          <h2>Shape the details</h2>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          {showAdvanced ? "Hide extras" : "Show extras"}
        </button>
      </div>

      <form onSubmit={onSubmit} className="form-grid compact-form-grid">
        <label className="field">
          <span className="field-label">Title</span>
          <input
            name="title"
            placeholder="Reply to two client emails"
            value={formData.title}
            onChange={onChange}
            required
          />
        </label>

        <div className="form-row compact-top-row">
          <label className="field">
            <span className="field-label">Start</span>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={onChange}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">End</span>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={onChange}
              required
            />
          </label>

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
        </div>

        <div className="preset-row">
          {durationPresets.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`chip-button ${Number(formData.estimatedMinutes) === minutes ? "chip-active" : ""}`}
              onClick={() =>
                onChange({
                  target: { name: "estimatedMinutes", value: String(minutes) },
                })
              }
            >
              {minutes}m
            </button>
          ))}
        </div>

        {showAdvanced ? (
          <div className="advanced-fields">
            <div className="form-row">
              <label className="field">
                <span className="field-label">Estimated minutes</span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  name="estimatedMinutes"
                  value={formData.estimatedMinutes}
                  onChange={onChange}
                  required
                />
              </label>

              <label className="field">
                <span className="field-label">Category</span>
                <input
                  name="category"
                  placeholder="Work, admin, home, focus, study"
                  value={formData.category}
                  onChange={onChange}
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Description</span>
              <input
                name="description"
                placeholder="Optional details that make starting easier"
                value={formData.description}
                onChange={onChange}
              />
            </label>
          </div>
        ) : (
          <div className="mini-form-summary">
            <span>{formData.estimatedMinutes} min</span>
            <span>{formData.difficulty.toLowerCase()}</span>
            <span>{formData.category || "no category"}</span>
          </div>
        )}

        <button className="primary-button compact-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving block..." : "Add this block"}
        </button>

        {error ? <div className="error-text">{error}</div> : null}
      </form>
    </section>
  );
}
