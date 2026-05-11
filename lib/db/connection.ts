import fs from "fs";
import Database from "better-sqlite3";
import path from "path";
import { ensureAppSettingsColumns } from "./migrations";
import { createTables } from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "md-translator.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) {
    ensureAppSettingsColumns(_db);
    return _db;
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  createTables(_db);
  ensureAppSettingsColumns(_db);
  return _db;
}