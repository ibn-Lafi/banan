import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

/**
 * عميل بصلاحيات Service Role — يتجاوز RLS بالكامل.
 * هذا العميل هو الوحيد المستخدم لتنفيذ Business Logic في Backend (القسم 21 من SPEC.md).
 * لا يُصدَّر أو يُستخدم هذا المفتاح في Frontend إطلاقاً (القسم 20).
 */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
