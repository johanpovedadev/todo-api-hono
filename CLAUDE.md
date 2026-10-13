# To-Do API — reglas del proyecto

API REST de tareas con **Hono + Bun + SQLite + OpenAPI**. Es la prueba técnica
de GNP y también va al portafolio, así que el estándar es de empresa.

## Reglas que no se rompen

1. **Nada sube a GitHub sin probar.** Antes de cualquier `git push`:
   ```bash
   bun run check
   ```
   Corre tipos (`tsc`) y pruebas (`bun test`). Si algo falla, no se sube.
   El gancho `.githooks/pre-push` lo hace cumplir solo; no se salta con `--no-verify`.
2. **Probar también a mano** lo que cambió: `bun run dev` y usar Swagger en
   `http://localhost:3000/docs`. Las pruebas automáticas no reemplazan mirarlo.
3. **`git push` siempre se pregunta antes.** Publicar es irreversible.
4. **Gitflow:** `main` (lo entregado) ← `develop` ← `feature/<nombre>`.
   Nunca se trabaja directo sobre `main`. Cada cambio entra por Pull Request.
5. **Commits pequeños** con prefijo convencional: `feat:`, `fix:`, `test:`,
   `docs:`, `chore:`, `refactor:`.
6. **Todo cambio de comportamiento trae su prueba** en `tests/`. Cobertura
   mínima: 80 % de líneas (`bun run test:coverage`).
7. **Secretos fuera del repo:** el token va en `.env` (ignorado). Solo se sube
   `.env.example`. La base `*.sqlite` tampoco se sube.

## Arquitectura (quién hace qué)

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Rutas | `src/routes` | Contrato HTTP + OpenAPI. No tiene lógica. |
| Esquemas | `src/schemas` | Validación con Zod (entrada, salida, errores). |
| Servicio | `src/services` | Reglas de negocio. No sabe de HTTP ni de SQL. |
| Repositorio | `src/repositories` | SQL con sentencias preparadas. Nada más. |
| Base de datos | `src/db` | Conexión y migraciones automáticas. |

Una capa solo llama a la de abajo. Si una ruta necesita SQL, va por el servicio.
