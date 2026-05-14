const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const AI_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_URL ?? `http://${defaultHost}:8090/api/ai`;
const AI_HEALTH_URL = AI_BASE_URL.replace("/api/ai", "/health");

async function readJson(response, fallbackMessage) {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return response.json();
}

export async function fetchAIHealth() {
  const response = await fetch(AI_HEALTH_URL);
  return readJson(response, "Failed to reach AI service");
}

export async function fetchAIDayPlan(payload) {
  const response = await fetch(`${AI_BASE_URL}/day-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(response, "Failed to fetch AI day plan");
}

export async function fetchAISmartArrangeAdvice(payload) {
  const response = await fetch(`${AI_BASE_URL}/smart-arrange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(response, "Failed to fetch AI smart arrange advice");
}

export async function fetchAIConsult(payload) {
  const response = await fetch(`${AI_BASE_URL}/consult`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(response, "Failed to fetch AI consult response");
}

export async function fetchAIUnstuckConsult(payload) {
  const response = await fetch(`${AI_BASE_URL}/unstuck-consult`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(response, "Failed to fetch AI unstuck consult response");
}
