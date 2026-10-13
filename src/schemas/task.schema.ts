import { z } from "@hono/zod-openapi";

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000;

const title = z.string().trim().min(TITLE_MIN).max(TITLE_MAX);
const description = z.string().trim().max(DESCRIPTION_MAX).nullable();

export const TaskSchema = z
  .object({
    id: z.number().int().positive().openapi({ example: 1 }),
    title: z.string().openapi({ example: "Preparar informe semanal" }),
    description: z.string().nullable().openapi({ example: "Incluir métricas del call center" }),
    completed: z.boolean().openapi({ example: false }),
    createdAt: z.iso.datetime().openapi({ example: "2026-10-13T15:00:00.000Z" }),
    updatedAt: z.iso.datetime().openapi({ example: "2026-10-13T15:00:00.000Z" }),
  })
  .openapi("Task");

export const CreateTaskSchema = z
  .strictObject({
    title: title.openapi({ example: "Preparar informe semanal" }),
    description: description.optional().openapi({ example: "Incluir métricas del call center" }),
    completed: z.boolean().optional().openapi({ example: false }),
  })
  .openapi("CreateTask");

export const UpdateTaskSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    completed: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  })
  .openapi("UpdateTask", { example: { completed: true } });

export const TaskIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ param: { name: "id", in: "path" }, example: 1 }),
});

export const ListTasksQuerySchema = z.object({
  completed: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
    .openapi({
      param: { name: "completed", in: "query" },
      description: "Filtra por estado. Si se omite, devuelve todas.",
      example: "false",
    }),
});

export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
