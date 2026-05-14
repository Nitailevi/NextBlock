import { OPENAI_API_KEY, OPENAI_MODEL } from "../config.js";
import {
  generateLocalArrangeAdvice,
  generateLocalConsult,
  generateLocalDayPlan,
  generateLocalUnstuckConsult,
} from "./localProvider.js";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    ?.filter((item) => item.type === "output_text")
    ?.map((item) => item.text)
    ?.join("\n")
    ?.trim();

  return text || "";
}

async function requestJson(instructions, input, fallbackFactory) {
  if (!OPENAI_API_KEY) {
    return fallbackFactory();
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions,
      input: JSON.stringify(input),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const text = extractOutputText(payload);
  const parsed = safeJsonParse(text);
  return parsed ?? fallbackFactory();
}

export function generateOpenAIDayPlan(input) {
  return requestJson(
    "You are an ADHD-friendly planning coach. Return only valid JSON with keys: mode, headline, focusBlock, suggestions, risks, encouragement.",
    input,
    () => generateLocalDayPlan(input)
  );
}

export function generateOpenAIArrangeAdvice(input) {
  return requestJson(
    "You are an ADHD-friendly planning strategist. Return only valid JSON with keys: mode, summary, rules, opportunities.",
    input,
    () => generateLocalArrangeAdvice(input)
  );
}

export function generateOpenAIConsult(input) {
  return requestJson(
    "You are a warm ADHD-focused coach. Return only valid JSON with keys: mode, headline, answer, actions.",
    input,
    () => generateLocalConsult(input)
  );
}

export function generateOpenAIUnstuckConsult(input) {
  return requestJson(
    "You are an ADHD-friendly get-unstuck coach. Return only valid JSON with keys: mode, ritualName, headline, coaching, rescue.",
    input,
    () => generateLocalUnstuckConsult(input)
  );
}
