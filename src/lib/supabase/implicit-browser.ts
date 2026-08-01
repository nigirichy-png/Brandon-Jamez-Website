"use client";

import { combineChunks, createChunks, isChunkLike, stringFromBase64URL, stringToBase64URL } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { requirePublicSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

const base64Prefix = "base64-";
const cookieMaxAge = 400 * 24 * 60 * 60;

function readCookies() {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      return separator < 0
        ? { name: part, value: "" }
        : { name: part.slice(0, separator), value: part.slice(separator + 1) };
    });
}

function writeCookie(name: string, value: string, maxAge: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

const cookieStorage = {
  isServer: false,
  async getItem(key: string) {
    const cookies = readCookies();
    const combined = await combineChunks(
      key,
      (name) => cookies.find((cookie) => cookie.name === name)?.value ?? null,
    );
    if (!combined) return null;
    return combined.startsWith(base64Prefix)
      ? stringFromBase64URL(combined.slice(base64Prefix.length))
      : combined;
  },
  async setItem(key: string, value: string) {
    const existing = readCookies()
      .map((cookie) => cookie.name)
      .filter((name) => isChunkLike(name, key));
    const chunks = createChunks(key, `${base64Prefix}${stringToBase64URL(value)}`);
    const currentNames = new Set(chunks.map((chunk) => chunk.name));

    existing.filter((name) => !currentNames.has(name)).forEach((name) => writeCookie(name, "", 0));
    chunks.forEach(({ name, value: chunkValue }) => writeCookie(name, chunkValue, cookieMaxAge));
  },
  async removeItem(key: string) {
    readCookies()
      .map((cookie) => cookie.name)
      .filter((name) => isChunkLike(name, key))
      .forEach((name) => writeCookie(name, "", 0));
  },
};

/**
 * The default hosted ConfirmationURL uses an implicit fragment. This client is
 * isolated to the completion page and stores the resulting SSR session in
 * cookies, never localStorage. Supabase Auth parses and validates the fragment.
 */
export function createImplicitConfirmationClient() {
  const { url, anonKey } = requirePublicSupabaseConfig("hosted email confirmation");

  return createClient<Database>(url, anonKey, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      storage: cookieStorage,
    },
  });
}
