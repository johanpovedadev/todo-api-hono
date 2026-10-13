import type { Database } from "bun:sqlite";
import type { Task } from "../schemas/task.schema";

/** Fila tal como vive en SQLite (snake_case, booleano como 0/1). */
interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  completed: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface NewTask {
  title: string;
  description: string | null;
  completed: boolean;
  now: string;
}

export interface TaskChanges {
  title?: string;
  description?: string | null;
  completed?: boolean;
  now: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Acceso a datos. Todas las consultas son sentencias preparadas con
 * parámetros nombrados: los valores nunca se concatenan al SQL.
 */
export class TaskRepository {
  constructor(private readonly db: Database) {}

  findAll(filter: { completed?: boolean } = {}): Task[] {
    const rows =
      filter.completed === undefined
        ? this.db.query<TaskRow, []>("SELECT * FROM tasks ORDER BY id").all()
        : this.db
            .query<TaskRow, { completed: number }>(
              "SELECT * FROM tasks WHERE completed = $completed ORDER BY id",
            )
            .all({ completed: filter.completed ? 1 : 0 });
    return rows.map(toTask);
  }

  findById(id: number): Task | null {
    const row = this.db
      .query<TaskRow, { id: number }>("SELECT * FROM tasks WHERE id = $id")
      .get({ id });
    return row ? toTask(row) : null;
  }

  create(task: NewTask): Task {
    const row = this.db
      .query<TaskRow, { title: string; description: string | null; completed: number; now: string }>(
        `INSERT INTO tasks (title, description, completed, created_at, updated_at)
         VALUES ($title, $description, $completed, $now, $now)
         RETURNING *`,
      )
      .get({
        title: task.title,
        description: task.description,
        completed: task.completed ? 1 : 0,
        now: task.now,
      })!;
    return toTask(row);
  }

  /** Actualiza solo los campos presentes. Devuelve null si el id no existe. */
  update(id: number, changes: TaskChanges): Task | null {
    const row = this.db
      .query<
        TaskRow,
        {
          id: number;
          title: string | null;
          setDescription: number;
          description: string | null;
          completed: number | null;
          now: string;
        }
      >(
        `UPDATE tasks SET
           title       = COALESCE($title, title),
           description = CASE WHEN $setDescription = 1 THEN $description ELSE description END,
           completed   = COALESCE($completed, completed),
           updated_at  = $now
         WHERE id = $id
         RETURNING *`,
      )
      .get({
        id,
        title: changes.title ?? null,
        // description admite null como valor válido ("borrar descripción"),
        // así que se distingue "no vino" de "vino en null".
        setDescription: "description" in changes ? 1 : 0,
        description: changes.description ?? null,
        completed: changes.completed === undefined ? null : changes.completed ? 1 : 0,
        now: changes.now,
      });
    return row ? toTask(row) : null;
  }

  delete(id: number): boolean {
    const result = this.db
      .query<never, { id: number }>("DELETE FROM tasks WHERE id = $id")
      .run({ id });
    return result.changes > 0;
  }
}
