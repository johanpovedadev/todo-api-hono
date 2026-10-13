import { createApp } from "./app";
import { loadConfig } from "./config";
import { openDatabase } from "./db/database";

const config = loadConfig();
const db = openDatabase(config.databasePath);
const app = createApp({ db, apiToken: config.apiToken, logRequests: true });

if (!config.apiToken) {
  console.warn("API_TOKEN no está definido: la API corre SIN autenticación.");
}
console.log(`To-Do API en http://localhost:${config.port}  ·  docs: /docs`);

export default { port: config.port, fetch: app.fetch };
