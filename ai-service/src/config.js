import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

export const HOST = process.env.AI_SERVICE_HOST ?? "0.0.0.0";
export const PORT = Number(process.env.AI_SERVICE_PORT ?? 8090);
export const PROVIDER = process.env.AI_PROVIDER ?? "local";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";
export const rootPath = rootDir;
