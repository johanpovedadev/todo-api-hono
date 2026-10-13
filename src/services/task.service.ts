import { NotFoundError } from "../errors";
import type { TaskRepository } from "../repositories/task.repository";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../schemas/task.schema";

/** Reglas de negocio. No sabe de HTTP ni de SQL. */
export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  list(filter: { completed?: boolean }): Task[] {
    return this.repository.findAll(filter);
  }

  get(id: number): Task {
    const task = this.repository.findById(id);
    if (!task) throw new NotFoundError("Tarea", id);
    return task;
  }

  create(input: CreateTaskInput): Task {
    return this.repository.create({
      title: input.title,
      description: input.description ?? null,
      completed: input.completed ?? false,
      now: this.now(),
    });
  }

  update(id: number, input: UpdateTaskInput): Task {
    const task = this.repository.update(id, { ...input, now: this.now() });
    if (!task) throw new NotFoundError("Tarea", id);
    return task;
  }

  delete(id: number): void {
    if (!this.repository.delete(id)) throw new NotFoundError("Tarea", id);
  }

  private now(): string {
    return this.clock().toISOString();
  }
}
