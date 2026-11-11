import "dotenv/config";
import { createApp } from "./createApp.js";

const application = createApp();
const app = application.app;
const closeDatabase = application.close;
const realtime = application.realtime;
const expirePendingPayments = application.expirePendingPayments;
export { app, closeDatabase, realtime, expirePendingPayments };
