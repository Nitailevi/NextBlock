import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

export const HOST = process.env.BACKEND_HOST ?? "0.0.0.0";
export const PORT = 8080;
export const dataDir = join(rootDir, "data");
export const dbPath = join(dataDir, "task-blocks.json");
