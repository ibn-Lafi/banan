import { supabaseAdmin } from "../lib/supabase.js";

export interface WriteAuditLogInput {
  companyId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}

/** القسم 16: كل حركة مهمة تُسجَّل في audit_logs مركزي */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    company_id: input.companyId,
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    // Audit logging failures must not silently corrupt the primary flow's error handling,
    // but must never be swallowed either.
    // eslint-disable-next-line no-console
    console.error("Failed to write audit log", error);
  }
}
