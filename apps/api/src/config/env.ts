import "dotenv/config";

// القيم المنسوخة يدوياً من واجهات مختلفة (Railway/Supabase) أحياناً تحمل مسافة
// أو سطر جديد خفي في البداية/النهاية — trim() يمنع فشل مطابقة CORS الصامت بسببها.
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").trim().replace(/\/$/, ""),
  // يحمي صفحة الإعداد الأولي (/setup) من استخدامها من أي شخص غير مالك المشروع
  // قبل أن يُكمل هو نفسه إنشاء أول شركة ومستخدم Admin.
  setupToken: required("SETUP_TOKEN"),
};
