import { Router } from "express";
import rateLimit from "express-rate-limit";
import { bootstrapSetupSchema } from "@banan/validation";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { bootstrapSetup, isSetupNeeded } from "../services/setupService.js";

export const setupRouter = Router();

const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// عام (بدون مصادقة) — الحماية عبر SETUP_TOKEN + قفل تلقائي بعد أول شركة
setupRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json({ needs_setup: await isSetupNeeded() });
  }),
);

setupRouter.post(
  "/bootstrap",
  setupLimiter,
  asyncHandler(async (req, res) => {
    const input = bootstrapSetupSchema.parse(req.body);
    const result = await bootstrapSetup(input);
    res.status(201).json({ data: result });
  }),
);
