import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { BEARER_SCHEME } from "../middleware/auth";
import { ErrorSchema } from "../schemas/error.schema";
import {
  CreateTaskSchema,
  ListTasksQuerySchema,
  TaskIdParamSchema,
  TaskSchema,
  UpdateTaskSchema,
} from "../schemas/task.schema";
import type { TaskService } from "../services/task.service";

const json = <T>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

const errors = {
  400: json(ErrorSchema, "Datos de entrada inválidos"),
  401: json(ErrorSchema, "Token ausente o inválido"),
} as const;
const notFound = { 404: json(ErrorSchema, "La tarea no existe") } as const;

const tags = ["Tareas"];
const security = [{ [BEARER_SCHEME]: [] }];

const listRoute = createRoute({
  method: "get",
  path: "/tasks",
  tags,
  security,
  summary: "Listar tareas",
  description: "Devuelve todas las tareas, opcionalmente filtradas por estado.",
  request: { query: ListTasksQuerySchema },
  responses: { 200: json(TaskSchema.array(), "Listado de tareas"), ...errors },
});

const getRoute = createRoute({
  method: "get",
  path: "/tasks/{id}",
  tags,
  security,
  summary: "Obtener una tarea",
  request: { params: TaskIdParamSchema },
  responses: { 200: json(TaskSchema, "Detalle de la tarea"), ...errors, ...notFound },
});

const createTaskRoute = createRoute({
  method: "post",
  path: "/tasks",
  tags,
  security,
  summary: "Crear una tarea",
  request: { body: { ...json(CreateTaskSchema, "Tarea a crear"), required: true } },
  responses: { 201: json(TaskSchema, "Tarea creada"), ...errors },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/tasks/{id}",
  tags,
  security,
  summary: "Actualizar una tarea",
  description: "Actualización parcial: solo cambian los campos enviados.",
  request: {
    params: TaskIdParamSchema,
    body: { ...json(UpdateTaskSchema, "Campos a modificar"), required: true },
  },
  responses: { 200: json(TaskSchema, "Tarea actualizada"), ...errors, ...notFound },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/tasks/{id}",
  tags,
  security,
  summary: "Eliminar una tarea",
  request: { params: TaskIdParamSchema },
  responses: { 204: { description: "Tarea eliminada" }, ...errors, ...notFound },
});

export function taskRoutes(service: TaskService, app: OpenAPIHono) {
  return app
    .openapi(listRoute, (c) => c.json(service.list(c.req.valid("query")), 200))
    .openapi(getRoute, (c) => c.json(service.get(c.req.valid("param").id), 200))
    .openapi(createTaskRoute, (c) => c.json(service.create(c.req.valid("json")), 201))
    .openapi(updateRoute, (c) =>
      c.json(service.update(c.req.valid("param").id, c.req.valid("json")), 200),
    )
    .openapi(deleteRoute, (c) => {
      service.delete(c.req.valid("param").id);
      return c.body(null, 204);
    });
}
