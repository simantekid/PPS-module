import path from 'path';
import Database from 'better-sqlite3';

export const db = new Database(path.join(process.cwd(), 'pps.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS topups (
    idtrx TEXT PRIMARY KEY,
    vendor_idtrx TEXT,
    kode TEXT NOT NULL,
    tujuan TEXT NOT NULL,
    status TEXT NOT NULL,
    sn TEXT,
    msg TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
