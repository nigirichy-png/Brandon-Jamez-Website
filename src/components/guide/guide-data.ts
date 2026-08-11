import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { normalizeGuideSpots, type GuideSpot } from "./guide-model";

export type GuideLoadResult = { spots: GuideSpot[]; status: "ready" | "unconfigured" | "error" };
const loadCachedPublicGuideSpots = unstable_cache(async (): Promise<GuideLoadResult> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_GUIDE_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_GUIDE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return { spots: [], status: "unconfigured" };
  try {
    const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await client.from("spots").select("id, data, updated_at").order("updated_at", { ascending: false });
    if (error) throw error;
    return { spots: normalizeGuideSpots((data ?? []).map((row) => row.data)), status: "ready" };
  } catch { return { spots: [], status: "error" }; }
}, ["public-guide-spots-v1"], { revalidate: 300, tags: ["guide-spots"] });

export async function loadPublicGuideSpots(): Promise<GuideLoadResult> {
  return loadCachedPublicGuideSpots();
}
