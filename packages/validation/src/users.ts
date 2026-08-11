import { z } from "zod";

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-zA-Z0-9_.-]+$/, "أحرف/أرقام إنجليزية فقط بدون مسافات"),
  full_name: z.string().min(1).max(150),
  password: z.string().min(8).max(200),
  role: z.enum(["admin", "rep"]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  full_name: z.string().min(1).max(150).optional(),
  role: z.enum(["admin", "rep"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  new_password: z.string().min(8).max(200),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
