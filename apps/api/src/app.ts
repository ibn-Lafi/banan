import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  // Railway (وأي منصة استضافة) تُشغّل التطبيق خلف reverse proxy، فنحتاج نثق بترويسة
  // X-Forwarded-For حتى تعمل express-rate-limit وتحديد IP الحقيقي بشكل صحيح.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", apiRouter);

  app.use(errorHandler);

  return app;
}
