import { createServer } from "node:http";
import { app, closeDatabase, realtime } from "./infrastructure/app.js";

const port = Number(process.env.PORT ?? 3000);
const server = createServer(app);
realtime.attach(server);
server.listen(port, () => console.log(`Server running on port ${port}`));
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    if (stopping) return;
    stopping = true;
    void realtime.close().catch((error: unknown) => console.error("WebSocket shutdown error:", error));
    server.close(() => { closeDatabase(); });
  });
}
