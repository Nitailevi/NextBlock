export function nowIso() {
  return new Date().toISOString();
}

export function compareTime(left, right) {
  return left.localeCompare(right);
}

export function sortByStartTime(tasks) {
  return [...tasks].sort((left, right) => compareTime(left.startTime, right.startTime));
}

export function durationMinutes(task) {
  const [startHours, startMinutes] = task.startTime.slice(0, 5).split(":").map(Number);
  const [endHours, endMinutes] = task.endTime.slice(0, 5).split(":").map(Number);
  return endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
}
