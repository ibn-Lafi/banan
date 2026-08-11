"use client";

import { clearSession, getSession } from "./session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Content-Type", "application/json");

  if (auth) {
    const session = getSession();
    if (session) {
      finalHeaders.set("Authorization", `Bearer ${session.access_token}`);
    }
  }

  const res = await fetch(`${API_URL}/api${path}`, { ...rest, headers: finalHeaders });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiRequestError(
      res.status,
      body?.error?.message ?? "حدث خطأ غير متوقع",
      body?.error?.code,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** لطلبات ترجع ملفاً ثنائياً (مثل PDF) بدل JSON — يحتاج نفس مصادقة apiFetch */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const session = getSession();
  const headers = new Headers();
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);

  const res = await fetch(`${API_URL}/api${path}`, { headers });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiRequestError(res.status, body?.error?.message ?? "تعذّر تحميل الملف", body?.error?.code);
  }

  return res.blob();
}
