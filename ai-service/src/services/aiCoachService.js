import { OPENAI_API_KEY, PROVIDER } from "../config.js";
import {
  generateLocalArrangeAdvice,
  generateLocalConsult,
  generateLocalDayPlan,
  generateLocalUnstuckConsult,
} from "../providers/localProvider.js";
import {
  generateOpenAIArrangeAdvice,
  generateOpenAIConsult,
  generateOpenAIDayPlan,
  generateOpenAIUnstuckConsult,
} from "../providers/openaiProvider.js";

function usingOpenAI() {
  return PROVIDER === "openai" && Boolean(OPENAI_API_KEY);
}

export function getProviderMeta() {
  return {
    provider: usingOpenAI() ? "openai" : "local",
    aiReady: usingOpenAI(),
  };
}

export function createDayPlan(payload) {
  return usingOpenAI() ? generateOpenAIDayPlan(payload) : generateLocalDayPlan(payload);
}

export function createArrangeAdvice(payload) {
  return usingOpenAI() ? generateOpenAIArrangeAdvice(payload) : generateLocalArrangeAdvice(payload);
}

export function createConsult(payload) {
  return usingOpenAI() ? generateOpenAIConsult(payload) : generateLocalConsult(payload);
}

export function createUnstuckConsult(payload) {
  return usingOpenAI() ? generateOpenAIUnstuckConsult(payload) : generateLocalUnstuckConsult(payload);
}
