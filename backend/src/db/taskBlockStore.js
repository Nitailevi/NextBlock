import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dataDir, dbPath } from "../config.js";

mkdirSync(dataDir, { recursive: true });

function ensureDatabase() {
  if (!existsSync(dbPath)) {
    writeFileSync(
      dbPath,
      JSON.stringify({ nextId: 1, nextTemplateId: 1, taskBlocks: [], taskTemplates: [] }, null, 2)
    );
  }
}

export function loadDatabase() {
  ensureDatabase();
  const database = JSON.parse(readFileSync(dbPath, "utf8"));
  database.nextTemplateId ??= 1;
  database.taskTemplates ??= [];
  database.taskBlocks ??= [];
  return database;
}

export function saveDatabase(database) {
  writeFileSync(dbPath, JSON.stringify(database, null, 2));
}
