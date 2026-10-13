import { timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { errorBody } from "../errors";

export const BEARER_SCHEME = "bearerAuth";

function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Exige `Authorization: Bearer <token>`; si falta o no coincide, responde 401. */
export function bearerAuth(expectedToken: string): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header("Authorization") ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token || !sameToken(token, expectedToken)) {
      c.header("WWW-Authenticate", 'Bearer realm="tasks"');
      return c.json(errorBody("UNAUTHORIZED", "Token ausente o inválido"), 401);
    }
    await next();
  };
}
