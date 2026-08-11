import { randomUUID } from "node:crypto";
import type { LoginInput } from "@banan/validation";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";

/**
 * OD-2: نستخدم Supabase Auth، مع بريد داخلي مُشتق من user.id (وليس من username)
 * لضمان تفرّده عالمياً بغض النظر عن تكرار اسم المستخدم بين شركات مختلفة مستقبلاً
 * (Multi-Tenant — القسم 18).
 */
export function internalEmailFor(userId: string): string {
  return `${userId}@users.banan.internal`;
}

export async function login(input: LoginInput) {
  const { data: profile, error } = await supabaseAdmin
    .from("users")
    .select("id, company_id, username, full_name, role, status")
    .eq("username", input.username)
    .maybeSingle();

  if (error) throw error;
  if (!profile) throw ApiError.unauthorized("اسم المستخدم أو كلمة المرور غير صحيحة");
  if (profile.status !== "active") throw ApiError.forbidden("تم تعطيل هذا الحساب");

  const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: internalEmailFor(profile.id),
    password: input.password,
  });

  if (signInError || !session.session) {
    throw ApiError.unauthorized("اسم المستخدم أو كلمة المرور غير صحيحة");
  }

  return {
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
    expires_at: session.session.expires_at,
    user: profile,
  };
}

export interface CreateUserServiceInput {
  companyId: string;
  username: string;
  fullName: string;
  password: string;
  role: "admin" | "rep";
}

/** القسم 3: إدارة المستخدمين متاحة لـ Admin فقط (يُتحقق منه في الـ route) */
export async function createUserAccount(input: CreateUserServiceInput) {
  const id = randomUUID();
  const email = internalEmailFor(id);

  const { error: authError } = await supabaseAdmin.auth.admin.createUser({
    id,
    email,
    password: input.password,
    email_confirm: true,
  });
  if (authError) throw ApiError.badRequest(authError.message);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .insert({
      id,
      company_id: input.companyId,
      username: input.username,
      full_name: input.fullName,
      role: input.role,
      status: "active",
    })
    .select()
    .single();

  if (profileError || !profile) {
    await supabaseAdmin.auth.admin.deleteUser(id);
    if (profileError?.code === "23505") {
      throw ApiError.conflict("اسم المستخدم مستخدم بالفعل في هذه الشركة");
    }
    throw profileError ?? new Error("Failed to create user profile");
  }

  return profile;
}
