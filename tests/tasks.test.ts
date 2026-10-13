import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import { migrate, openDatabase } from "../src/db/database";

const TOKEN = "token-de-prueba";
const auth = { Authorization: `Bearer ${TOKEN}` };

let app: ReturnType<typeof createApp>;

// Cada test arranca con una base SQLite nueva en memoria: aislados y rápidos.
beforeEach(() => {
  const db = new Database(":memory:", { strict: true });
  migrate(db);
  app = createApp({ db, apiToken: TOKEN });
});

// La API responde JSON sin tipo; en las pruebas lo leemos como `any` para revisar campos.
const readJson = (res: Response): Promise<any> => res.json();

function request(method: string, path: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: { ...auth, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function createTask(body: Record<string, unknown> = { title: "Primera tarea" }) {
  const res = await request("POST", "/tasks", body);
  return readJson(res);
}

describe("POST /tasks", () => {
  test("crea una tarea y responde 201 con valores por defecto", async () => {
    const res = await request("POST", "/tasks", { title: "Comprar café" });

    expect(res.status).toBe(201);
    const task = await readJson(res);
    expect(task).toMatchObject({ id: 1, title: "Comprar café", description: null, completed: false });
    expect(task.createdAt).toBe(task.updatedAt);
  });

  test("rechaza un título más corto que el mínimo con 400", async () => {
    const res = await request("POST", "/tasks", { title: "ab" });

    expect(res.status).toBe(400);
    const payload = await readJson(res);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
    expect(payload.error.details[0].path).toBe("title");
  });

  test("rechaza campos desconocidos", async () => {
    const res = await request("POST", "/tasks", { title: "Válida", prioridad: "alta" });
    expect(res.status).toBe(400);
  });

  test("rechaza un JSON mal formado con 400", async () => {
    const res = await app.request("/tasks", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: "{ esto no es json",
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /tasks", () => {
  test("lista todas las tareas", async () => {
    await createTask({ title: "Tarea uno" });
    await createTask({ title: "Tarea dos" });

    const res = await request("GET", "/tasks");
    expect(res.status).toBe(200);
    expect(await readJson(res)).toHaveLength(2);
  });

  test("filtra por estado completed", async () => {
    await createTask({ title: "Pendiente" });
    await createTask({ title: "Hecha", completed: true });

    const done = await readJson(await request("GET", "/tasks?completed=true"));
    const pending = await readJson(await request("GET", "/tasks?completed=false"));

    expect(done.map((t: { title: string }) => t.title)).toEqual(["Hecha"]);
    expect(pending.map((t: { title: string }) => t.title)).toEqual(["Pendiente"]);
  });

  test("rechaza un filtro inválido", async () => {
    const res = await request("GET", "/tasks?completed=quizas");
    expect(res.status).toBe(400);
  });
});

describe("GET /tasks/{id}", () => {
  test("devuelve el detalle de la tarea", async () => {
    const created = await createTask();
    const res = await request("GET", `/tasks/${created.id}`);

    expect(res.status).toBe(200);
    expect(await readJson(res)).toEqual(created);
  });

  test("responde 404 si no existe", async () => {
    const res = await request("GET", "/tasks/999");
    expect(res.status).toBe(404);
    expect((await readJson(res)).error.code).toBe("NOT_FOUND");
  });

  test("responde 400 si el id no es un número", async () => {
    const res = await request("GET", "/tasks/abc");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /tasks/{id}", () => {
  test("actualiza solo los campos enviados", async () => {
    const created = await createTask({ title: "Original", description: "Se queda" });
    await Bun.sleep(5); // para que updatedAt cambie de verdad

    const res = await request("PATCH", `/tasks/${created.id}`, { completed: true });
    expect(res.status).toBe(200);
    const updated = await readJson(res);

    expect(updated).toMatchObject({ title: "Original", description: "Se queda", completed: true });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  test("permite borrar la descripción enviando null", async () => {
    const created = await createTask({ title: "Con nota", description: "borrar" });
    const updated = await readJson(await request("PATCH", `/tasks/${created.id}`, { description: null }));
    expect(updated.description).toBeNull();
  });

  test("rechaza un cuerpo vacío", async () => {
    const created = await createTask();
    const res = await request("PATCH", `/tasks/${created.id}`, {});
    expect(res.status).toBe(400);
  });

  test("responde 404 si no existe", async () => {
    const res = await request("PATCH", "/tasks/999", { completed: true });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /tasks/{id}", () => {
  test("elimina la tarea y responde 204", async () => {
    const created = await createTask();

    const res = await request("DELETE", `/tasks/${created.id}`);
    expect(res.status).toBe(204);
    expect((await request("GET", `/tasks/${created.id}`)).status).toBe(404);
  });

  test("responde 404 si no existe", async () => {
    const res = await request("DELETE", "/tasks/999");
    expect(res.status).toBe(404);
  });
});

describe("autenticación", () => {
  test("sin token responde 401", async () => {
    const res = await app.request("/tasks");
    expect(res.status).toBe(401);
    expect((await readJson(res)).error.code).toBe("UNAUTHORIZED");
  });

  test("con token incorrecto responde 401", async () => {
    const res = await app.request("/tasks", { headers: { Authorization: "Bearer otro" } });
    expect(res.status).toBe(401);
  });

  test("la documentación es pública", async () => {
    expect((await app.request("/docs")).status).toBe(200);
  });
});

describe("documentación OpenAPI", () => {
  test("expone la especificación con las rutas y el esquema de seguridad", async () => {
    const spec = await readJson(await app.request("/openapi.json"));

    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths)).toEqual(["/tasks", "/tasks/{id}"]);
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
  });
});

describe("errores generales", () => {
  test("una ruta inexistente responde 404 con el formato estándar", async () => {
    const res = await request("GET", "/no-existe");
    expect(res.status).toBe(404);
    expect((await readJson(res)).error.code).toBe("NOT_FOUND");
  });

  test("un fallo inesperado responde 500 sin filtrar detalles internos", async () => {
    const db = new Database(":memory:", { strict: true });
    migrate(db);
    const broken = createApp({ db });
    db.close(); // la base cerrada provoca un error que nadie esperaba

    const original = console.error;
    console.error = () => {}; // silencia el log esperado de este test
    const res = await broken.request("/tasks");
    console.error = original;

    expect(res.status).toBe(500);
    expect(await readJson(res)).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
    });
  });
});

describe("migración", () => {
  test("es idempotente: correrla dos veces no falla", () => {
    const db = new Database(":memory:");
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
  });

  test("openDatabase deja la tabla tasks lista para usar", () => {
    const db = openDatabase(":memory:");
    const table = db.query("SELECT name FROM sqlite_master WHERE name = 'tasks'").get();
    expect(table).toEqual({ name: "tasks" });
  });
});
