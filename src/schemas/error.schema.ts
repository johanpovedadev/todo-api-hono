import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.enum(["VALIDATION_ERROR", "NOT_FOUND", "UNAUTHORIZED", "INTERNAL_ERROR"]),
      message: z.string(),
      details: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional(),
    }),
  })
  .openapi("Error", {
    example: {
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos de entrada inválidos",
        details: [{ path: "title", message: "Too small: expected string to have >=3 characters" }],
      },
    },
  });

export type ErrorBody = z.infer<typeof ErrorSchema>;
