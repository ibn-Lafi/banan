"use client";

import type { UserRole } from "@banan/types";

export interface SessionUser {
  id: string;
  company_id: string;
  username: string;
  full_name: string;
  role: UserRole;
  status: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  user: SessionUser;
}

const STORAGE_KEY = "banan_session";

/**
 * ملاحظة: الـ API والـ Frontend يعملان على نطاقين مختلفين في Railway،
 * لذا نخزّن الـ access_token في localStorage بدل HttpOnly cookie (القسم 20).
 * الـ token قصير الأجل (JWT من Supabase)، ويجب استبداله لاحقاً بآلية refresh تلقائية.
 */
export function saveSession(session: Session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
