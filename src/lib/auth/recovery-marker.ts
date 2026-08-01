import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { requireServiceRoleSupabaseConfig } from "@/lib/supabase/server-config";

export const recoveryCookieName = "bj-password-recovery";
export const recoveryMarkerMaxAge = 10 * 60;

function signature(userId: string, expiresAt: number): string {
  const { serviceRoleKey } = requireServiceRoleSupabaseConfig();
  return createHmac("sha256", `brandon-jamez-recovery-v1\0${serviceRoleKey}`)
    .update(`${userId}\0${expiresAt}`)
    .digest("base64url");
}

export function createRecoveryMarker(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + recoveryMarkerMaxAge;
  return `${expiresAt}.${signature(userId, expiresAt)}`;
}

export function isValidRecoveryMarker(marker: string | undefined, userId: string): boolean {
  if (!marker || marker.length > 256) return false;
  const [rawExpiresAt, suppliedSignature, extra] = marker.split(".");
  if (extra || !/^\d{10}$/.test(rawExpiresAt) || !/^[A-Za-z0-9_-]{43}$/.test(suppliedSignature ?? "")) return false;
  const expiresAt = Number(rawExpiresAt);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now || expiresAt > now + recoveryMarkerMaxAge) return false;
  const expected = Buffer.from(signature(userId, expiresAt));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
