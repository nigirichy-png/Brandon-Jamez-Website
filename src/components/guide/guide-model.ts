export const guideFavoriteStorageKey = "brandon-pattaya-favorites-v20";

export type GuideSpot = {
  id: string; name: string; category: string; area: string; address: string;
  lat: number; lng: number; description: string; image: string; images: string[];
  tags: string[]; website: string; facebook: string; instagram: string; tiktok: string; googleMaps: string;
  recommended: boolean; trending: boolean;
};

const text = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
export function isSafeGuideUrl(value: unknown, httpsOnly = false): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try { const url = new URL(value.trim()); return httpsOnly ? url.protocol === "https:" : url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}
const url = (value: unknown, httpsOnly = false) => isSafeGuideUrl(value, httpsOnly) ? value.trim() : "";
const coordinate = (value: unknown, min: number, max: number) => { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : Number.NaN; };

export function normalizeGuideSpot(value: unknown): GuideSpot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>; const id = text(raw.id, 120); const name = text(raw.name, 200);
  const lat = coordinate(raw.lat, -90, 90); const lng = coordinate(raw.lng, -180, 180);
  if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const images = (Array.isArray(raw.images) ? raw.images : []).map((item) => url(item, true)).filter(Boolean).slice(0, 12);
  const primaryImage = url(raw.image, true); if (primaryImage && !images.includes(primaryImage)) images.unshift(primaryImage);
  const image = primaryImage || images[0] || "";
  return { id, name, lat, lng, category: text(raw.category, 80) || "Other", area: text(raw.area, 120), address: text(raw.address, 300), description: text(raw.description, 1200), image, images, tags: (Array.isArray(raw.tags) ? raw.tags : []).map((item) => text(item, 60)).filter(Boolean).slice(0, 12), website: url(raw.website), facebook: url(raw.facebook), instagram: url(raw.instagram), tiktok: url(raw.tiktok), googleMaps: url(raw.googleMaps), recommended: raw.recommended === true, trending: raw.trending === true };
}

export function normalizeGuideSpots(values: unknown): GuideSpot[] {
  if (!Array.isArray(values)) return [];
  const unique = new Map<string, GuideSpot>(); for (const value of values) { const spot = normalizeGuideSpot(value); if (spot && !unique.has(spot.id)) unique.set(spot.id, spot); }
  return [...unique.values()];
}

export function guideCategories(spots: readonly GuideSpot[]): string[] {
  const preferred = ["Bars", "Restaurants", "Go-Go Bars", "Live Music", "Hotels", "Gentlemen's Clubs", "Clubs"];
  const actual = spots.map((spot) => spot.category === "Go-Go" ? "Go-Go Bars" : spot.category);
  return ["All", ...new Set([...preferred, ...actual.filter(Boolean)])];
}

export function filterGuideSpots(spots: readonly GuideSpot[], query: string, category: string, favorites: readonly string[] = [], savedOnly = false): GuideSpot[] {
  const needle = query.trim().toLocaleLowerCase(); const favoriteSet = new Set(favorites);
  return spots.filter((spot) => {
    const normalizedCategory = spot.category === "Go-Go" ? "Go-Go Bars" : spot.category;
    const matchesCategory = category === "All" || normalizedCategory === category;
    const haystack = [spot.name, spot.category, spot.area, spot.address, spot.description, ...spot.tags].join(" ").toLocaleLowerCase();
    return matchesCategory && (!needle || haystack.includes(needle)) && (!savedOnly || favoriteSet.has(spot.id));
  });
}

export function parseGuideFavorites(value: string | null, validIds?: ReadonlySet<string>): string[] {
  if (!value) return []; try { const parsed: unknown = JSON.parse(value); if (!Array.isArray(parsed)) return []; return [...new Set(parsed.filter((item): item is string => typeof item === "string" && (!validIds || validIds.has(item))))].slice(0, 500); } catch { return []; }
}
export function toggleGuideFavorite(favorites: readonly string[], id: string): string[] { return favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]; }
export function guideMapsUrl(spot: GuideSpot): string { return spot.googleMaps || `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`; }
