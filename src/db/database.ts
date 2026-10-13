import { Database } from "bun:sqlite";

/**
 * Migraciones en orden. Cada una corre una sola vez; la versión aplicada
 * se guarda en PRAGMA user_version, así que agregar una nueva es sumar
 * un elemento al final del arreglo.
 */
const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS tasks (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     title       TEXT    NOT NULL CHECK (length(title) >= 3),
     description TEXT,
     completed   INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
     created_at  TEXT    NOT NULL,
     updated_at  TEXT    NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed);`,
];

export function openDatabase(path: string): Database {
  const db = new Database(path, { create: true, strict: true });
  db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  return db;
}

export function migrate(db: Database): void {
  const { user_version: current } = db
    .query<{ user_version: number }, []>("PRAGMA user_version")
    .get()!;

  db.transaction(() => {
    for (let version = current; version < MIGRATIONS.length; version++) {
      db.exec(MIGRATIONS[version]!);
    }
    db.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);
  })();
}
