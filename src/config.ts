export interface AppConfig {
  port: number;
  databasePath: string;
  /** Si es undefined, la API no exige autenticación. */
  apiToken: string | undefined;
}

export function loadConfig(env: Record<string, string | undefined> = Bun.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3000),
    databasePath: env.DATABASE_PATH ?? "tasks.sqlite",
    apiToken: env.API_TOKEN?.trim() || undefined,
  };
}
