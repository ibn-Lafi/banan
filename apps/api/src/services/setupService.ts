import type { BootstrapSetupInput } from "@banan/validation";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";
import { createUserAccount } from "./authService.js";
import { env } from "../config/env.js";

/**
 * صفحة /setup: إعداد أولي لمرة واحدة فقط — تُنشئ أول شركة وأول مستخدم Admin
 * بدون الحاجة لـ SQL يدوي. بعد نجاح أول استدعاء، تُقفل تلقائياً (companies count > 0)،
 * حتى لا يستطيع أي شخص آخر يعرف الرابط إنشاء شركة موازية أو الاستيلاء على الإعداد.
 */
export async function isSetupNeeded(): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("companies")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) === 0;
}

export async function bootstrapSetup(input: BootstrapSetupInput) {
  if (input.setup_token !== env.setupToken) {
    throw ApiError.unauthorized("رمز الإعداد (SETUP_TOKEN) غير صحيح");
  }

  const needsSetup = await isSetupNeeded();
  if (!needsSetup) {
    throw ApiError.conflict("تم إعداد النظام بالفعل — استخدم شاشة تسجيل الدخول");
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .insert(input.company)
    .select()
    .single();
  if (companyError || !company) throw companyError ?? new Error("Failed to create company");

  try {
    const admin = await createUserAccount({
      companyId: company.id,
      username: input.admin.username,
      fullName: input.admin.full_name,
      password: input.admin.password,
      role: "admin",
    });
    return { company, admin };
  } catch (err) {
    // فشل إنشاء الـ Admin بعد إنشاء الشركة => تراجع لإبقاء /setup قابلة لإعادة المحاولة
    await supabaseAdmin.from("companies").delete().eq("id", company.id);
    throw err;
  }
}
