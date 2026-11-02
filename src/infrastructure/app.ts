import "dotenv/config";
import { createApp } from "./createApp.js";

const application = createApp();
const app = application.app;
const closeDatabase = application.close;
export { app, closeDatabase };
