import type { Database } from "bun:sqlite";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { errorBody, NotFoundError, validationErrorBody } from "./errors";
import { BEARER_SCHEME, bearerAuth } from "./middleware/auth";
import { TaskRepository } from "./repositories/task.repository";
import { taskRoutes } from "./routes/task.routes";
import { TaskService } from "./services/task.service";

export interface AppOptions {
  db: Database;
  apiToken?: string;
  logRequests?: boolean;
}

/** Arma la aplicación con sus dependencias inyectadas (así los tests usan una base en memoria). */
export function createApp({ db, apiToken, logRequests = false }: AppOptions) {
  const app = new OpenAPIHono({
    // Toda falla de validación de Zod sale con el mismo formato de error.
    defaultHook: (result, c) => {
      if (!result.success) return c.json(validationErrorBody(result.error), 400);
    },
  });

  if (logRequests) app.use(logger());
  if (apiToken) app.use("/tasks/*", bearerAuth(apiToken));

  app.openAPIRegistry.registerComponent("securitySchemes", BEARER_SCHEME, {
    type: "http",
    scheme: "bearer",
    description: "Token definido en la variable de entorno API_TOKEN",
  });

  const service = new TaskService(new TaskRepository(db));
  taskRoutes(service, app);

  app.get("/", (c) => c.redirect("/docs"));
  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "To-Do API",
      version: "1.0.0",
      description: "API REST para gestionar tareas. Hono + Bun + SQLite.",
    },
  });
  app.get("/docs", swaggerUI({ url: "/openapi.json", persistAuthorization: true }));

  app.notFound((c) => c.json(errorBody("NOT_FOUND", "Ruta no encontrada"), 404));
  app.onError((err, c) => {
    if (err instanceof NotFoundError) return c.json(errorBody("NOT_FOUND", err.message), 404);
    // Hono lanza HTTPException 400 cuando el cuerpo no es un JSON válido.
    if (err instanceof HTTPException && err.status === 400) {
      return c.json(errorBody("VALIDATION_ERROR", "El cuerpo no es un JSON válido"), 400);
    }
    console.error(err);
    return c.json(errorBody("INTERNAL_ERROR", "Error interno del servidor"), 500);
  });

  return app;
}
