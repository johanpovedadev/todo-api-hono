import type { ZodError } from "zod";
import type { ErrorBody } from "./schemas/error.schema";

export class NotFoundError extends Error {
  constructor(resource: string, id: number) {
    super(`${resource} con id ${id} no existe`);
    this.name = "NotFoundError";
  }
}

export function validationErrorBody(error: ZodError): ErrorBody {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Datos de entrada inválidos",
      details: error.issues.map((issue) => ({
        path: issue.path.join(".") || "(body)",
        message: issue.message,
      })),
    },
  };
}

export function errorBody(code: ErrorBody["error"]["code"], message: string): ErrorBody {
  return { error: { code, message } };
}
