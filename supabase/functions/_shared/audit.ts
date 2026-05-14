import { createClient } from "jsr:@supabase/supabase-js@2";

export interface AuditEntry {
  actor_id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  ip: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAudit(
  supabase: ReturnType<typeof createClient>,
  entry: AuditEntry,
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: entry.actor_id,
    actor_email: entry.actor_email,
    action: entry.action,
    target_type: entry.target_type,
    target_id: entry.target_id,
    ip: entry.ip,
    metadata: entry.metadata ?? null,
  });
  if (error) {
    console.error("[audit] insert failed:", error.message);
  }
}
