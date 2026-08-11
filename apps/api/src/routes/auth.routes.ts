import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema } from "@banan/validation";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { login } from "../services/authService.js";

export const authRouter = Router();

// القسم 20: Rate Limiting على /auth/login للحماية من brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await login(input);
    res.json(result);
  }),
);

authRouter.post("/logout", (_req, res) => {
  // الجلسات عبارة عن JWT قصيرة الأجل من Supabase — تسجيل الخروج يتم بحذفها من العميل.
  res.status(204).send();
});
