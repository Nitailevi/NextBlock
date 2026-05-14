function Stat({ label, value, tone }) {
  return (
    <div className={`stat-pill ${tone}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function formatReadableDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function Header({
  viewMode,
  selectedDate,
  currentTime,
  isToday,
  summary,
  themeMode,
  networkStatus,
  onShowInstallGuide,
  onToggleTheme,
  onClearToday,
  onViewModeChange,
  onDateChange,
  onReload,
}) {
  const compactSummary = [
    summary.active > 0 ? `${summary.active} active` : null,
    summary.planned > 0 ? `${summary.planned} left` : null,
    summary.done > 0 ? `${summary.done} done` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="hero-card hero-card-compact">
      <div className="hero-copy hero-copy-compact">
        <div className="eyebrow">Adaptive daily planner</div>
        <h1>NextBlock</h1>
        <div className="hero-meta">
          <div className="date-badge">{formatReadableDate(selectedDate)}</div>
          <div className="time-badge">
            {isToday ? `Live ${currentTime.slice(0, 5)}` : "Viewing another day"}
          </div>
        </div>
        <div className="header-summary-line">{compactSummary || "Fresh day"}</div>
      </div>

      <div className="hero-controls hero-controls-compact">
        <div className="control-card control-card-inline control-card-compact">
          <div className="toggle-row">
            {["day", "week", "month"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`chip-button ${viewMode === mode ? "chip-active" : ""}`}
                onClick={() => onViewModeChange(mode)}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <div className="header-actions">
            <label className="header-date-field" htmlFor="planner-date">
              <input
                id="planner-date"
                type="date"
                aria-label="Planner date"
                value={selectedDate}
                onChange={(event) => onDateChange(event.target.value)}
              />
            </label>
            <button type="button" className="secondary-button" onClick={onReload}>
              Sync
            </button>
          </div>
          <div className={`header-status-badge ${networkStatus?.online ? "header-status-online" : "header-status-offline"}`}>
            {networkStatus?.online ? "Online now" : "Offline mode"}
          </div>
          <div className="header-utility-row">
            {viewMode === "day" ? (
              <button type="button" className="utility-button utility-button-danger" onClick={onClearToday}>
                Clear
              </button>
            ) : null}
            <button type="button" className="utility-button" onClick={onToggleTheme}>
              {themeMode === "night" ? "Day" : "Night"}
            </button>
            <button type="button" className="utility-button" onClick={onShowInstallGuide}>
              Install
            </button>
          </div>
        </div>

        <div className="stats-grid stats-grid-compact">
          <Stat label="Total" value={summary.total} tone="tone-neutral" />
          <Stat label="Planned" value={summary.planned} tone="tone-planned" />
          <Stat label="Active" value={summary.active} tone="tone-active" />
          <Stat label="Done" value={summary.done} tone="tone-done" />
        </div>
      </div>
    </header>
  );
}
