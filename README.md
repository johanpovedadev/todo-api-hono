# To-Do API — Hono · Bun · SQLite · OpenAPI

API REST para gestionar tareas. Validación estricta con Zod, documentación
OpenAPI generada desde el mismo código y autenticación opcional por token.

## Requisitos

- [Bun](https://bun.sh) 1.1 o superior

## Instalación y ejecución

```bash
bun install
cp .env.example .env      # opcional: define API_TOKEN para activar la autenticación
bun run dev               # recarga en caliente
# o
bun run start
```

La API queda en `http://localhost:3000`.

| Ruta | Qué es |
|---|---|
| `/docs` | Swagger UI para probar los endpoints desde el navegador |
| `/openapi.json` | Especificación OpenAPI 3.1 |

La tabla `tasks` se crea sola al arrancar (migración automática). No hay que
preparar la base a mano.

### Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP |
| `DATABASE_PATH` | `tasks.sqlite` | Archivo SQLite |
| `API_TOKEN` | *(vacío)* | Si se define, las rutas `/tasks` exigen `Authorization: Bearer <token>` |

Con el token activo, en Swagger UI se usa el botón **Authorize**.

## Endpoints

| Método | Ruta | Respuesta |
|---|---|---|
| `GET` | `/tasks?completed=true\|false` | 200 listado (filtro opcional) |
| `GET` | `/tasks/{id}` | 200 detalle · 404 |
| `POST` | `/tasks` | 201 tarea creada · 400 |
| `PATCH` | `/tasks/{id}` | 200 actualización parcial · 400 · 404 |
| `DELETE` | `/tasks/{id}` | 204 · 404 |

Todos los errores comparten el mismo formato:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos de entrada inválidos",
             "details": [{ "path": "title", "message": "..." }] } }
```

Ejemplo:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"title": "Preparar informe", "description": "Métricas semanales"}'
```

## Arquitectura

```
src/
├── index.ts            arranque del servidor
├── app.ts              arma la app: middleware, rutas, docs, manejo de errores
├── config.ts           variables de entorno
├── routes/             contrato HTTP + OpenAPI (sin lógica)
├── schemas/            validación Zod de entrada, salida y errores
├── services/           reglas de negocio (no sabe de HTTP ni de SQL)
├── repositories/       acceso a datos con sentencias preparadas
├── middleware/auth.ts  token Bearer
└── db/database.ts      conexión SQLite + migraciones
```

Decisiones:

- **Sin ORM, con sentencias preparadas.** Para una sola tabla un ORM suma más
  de lo que aporta. Los valores siempre van como parámetros (`$id`), nunca
  concatenados, así que no hay inyección SQL.
- **Migraciones versionadas** con `PRAGMA user_version`: cada migración corre
  una sola vez y agregar una nueva es sumar un elemento a la lista.
- **`createApp` recibe la base como parámetro** (inyección de dependencias), lo
  que permite probar contra SQLite en memoria sin tocar el archivo real.
- **`PATCH` distingue "no enviado" de `null`**: `{"description": null}` borra la
  descripción; omitirla la deja igual.
- **El token se compara en tiempo constante** (`timingSafeEqual`) para no dar
  pistas por tiempos de respuesta.

## Pruebas

```bash
bun test                 # 24 pruebas de integración
bun run test:coverage    # con reporte de cobertura (mínimo 80 %)
bun run check            # tipos + pruebas: lo mismo que corre el CI
```

Cada prueba usa una base SQLite nueva en memoria. Un gancho `pre-push` y
GitHub Actions corren `check` antes de que algo llegue a `main`.

## Mejoras posibles

- Paginación en `GET /tasks` (`limit` / `offset`).
- Si el volumen creciera mucho: pasar a Postgres y particionar por fecha de
  creación.
- `Dockerfile` para despliegue.
