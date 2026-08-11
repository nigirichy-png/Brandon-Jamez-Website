import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { filterGuideSpots, guideCategories, isSafeGuideUrl, normalizeGuideSpot, normalizeGuideSpots, parseGuideFavorites, toggleGuideFavorite, type GuideSpot } from "../src/components/guide/guide-model.ts";

const spots: GuideSpot[] = [
  normalizeGuideSpot({ id:"one",name:"Gold Bar",category:"Bars",area:"Central Pattaya",address:"Beach Road",lat:12.92,lng:100.88,description:"Live music and drinks",tags:["music"],image:"https://example.com/one.jpg",instagram:"javascript:alert(1)" })!,
  normalizeGuideSpot({ id:"two",name:"Thai Table",category:"Restaurants",area:"Naklua",lat:"12.94",lng:"100.89",tags:["food"] })!,
];

test("current spots.data JSON is normalized to the reduced public shape", () => {
  assert.equal(spots[0].name,"Gold Bar"); assert.equal(spots[0].instagram,""); assert.equal(spots[1].lat,12.94);
  const galleryOnly = normalizeGuideSpot({id:"gallery",name:"Gallery",lat:12.9,lng:100.8,images:["https://example.com/gallery-1.jpg","https://example.com/gallery-2.jpg"]})!;
  assert.equal(galleryOnly.image,"https://example.com/gallery-1.jpg"); assert.equal(galleryOnly.images.length,2);
  assert.equal(normalizeGuideSpot({id:"bad",name:"Bad",lat:"x",lng:100}),null);
  assert.deepEqual(normalizeGuideSpots([{...spots[0]},{...spots[0]}]).map((spot)=>spot.id),["one"]);
  assert.ok(guideCategories(spots).includes("Go-Go Bars")); assert.ok(guideCategories(spots).includes("Live Music"));
});

test("search, categories, and saved filters combine deterministically", () => {
  assert.deepEqual(filterGuideSpots(spots,"music","All").map((spot)=>spot.id),["one"]);
  assert.deepEqual(filterGuideSpots(spots,"","Restaurants").map((spot)=>spot.id),["two"]);
  assert.deepEqual(filterGuideSpots(spots,"naklua","Restaurants",["two"],true).map((spot)=>spot.id),["two"]);
  assert.deepEqual(filterGuideSpots([],"","All"),[]);
});

test("favorites are SSR-safe pure helpers and reject invalid stored entries", () => {
  assert.deepEqual(parseGuideFavorites('["one","one",7,"missing"]',new Set(["one"])),["one"]);
  assert.deepEqual(toggleGuideFavorite(["one"],"one"),[]); assert.deepEqual(toggleGuideFavorite([],"two"),["two"]); assert.deepEqual(parseGuideFavorites("bad"),[]);
});

test("guide URLs permit only HTTP and HTTPS", () => { assert.equal(isSafeGuideUrl("https://example.com"),true); assert.equal(isSafeGuideUrl("http://example.com",true),false); assert.equal(isSafeGuideUrl("javascript:alert(1)"),false); });

test("guide route is native, read-only, app-like on mobile, and builder-compatible", async () => {
  const [page,data,map,mapboxMap,guide,css,footer] = await Promise.all([readFile(new URL("../src/app/guide/page.tsx",import.meta.url),"utf8"),readFile(new URL("../src/components/guide/guide-data.ts",import.meta.url),"utf8"),readFile(new URL("../src/components/guide/guide-map.tsx",import.meta.url),"utf8"),readFile(new URL("../src/components/guide/guide-mapbox-map.tsx",import.meta.url),"utf8"),readFile(new URL("../src/components/guide/integrated-guide.tsx",import.meta.url),"utf8"),readFile(new URL("../src/components/guide/integrated-guide.module.css",import.meta.url),"utf8"),readFile(new URL("../src/components/layout/footer.tsx",import.meta.url),"utf8")]);
  assert.match(page,/IntegratedGuide/); assert.doesNotMatch(page,/<iframe|creatorLinks\.pattayaGuide|next\/image|platform-hero-grid|platform-image-frame/); assert.doesNotMatch(page,/styles\.pageIntro/); assert.doesNotMatch(page,/Header|Footer|<nav/);
  assert.match(data,/\.from\("spots"\)\.select\("id, data, updated_at"\)/); assert.doesNotMatch(data,/service.role|SUPABASE_SECRET|insert\(|update\(|delete\(/i);
  assert.match(map,/^"use client"/); assert.doesNotMatch(map,/guide-mobile-map/); assert.match(map,/import\("\.\/guide-mapbox-map"\)/); assert.match(mapboxMap,/ResizeObserver/); assert.match(mapboxMap,/mapboxgl\.supported\(\)/); assert.match(mapboxMap,/interactive map is unavailable/i); assert.match(mapboxMap,/streets-v12/); assert.match(mapboxMap,/cluster: true/); assert.match(mapboxMap,/guide-cluster-count/); assert.match(mapboxMap,/guide-point-icons/); assert.doesNotMatch(guide,/next\/dynamic/); assert.match(guide,/data-site-builder-kind="dynamic"/); assert.doesNotMatch(guide,/dangerouslySetInnerHTML/);
  assert.match(guide,/mobileGuideMenuButton/); assert.match(guide,/mobileGuideIntro/); assert.match(guide,/Brandon Jamez<br \/>Pattaya Guide/); assert.match(guide,/Nightlife · Food · Fun · Hidden Gems/); assert.match(guide,/mobileGuideActions/); assert.match(guide,/Show spots/); assert.match(guide,/Pattaya map/); assert.match(guide,/Favorites/); assert.match(guide,/brandonSocialLinks/); assert.match(guide,/Brandon social links/); assert.doesNotMatch(guide,/mobileNavigation/); assert.match(guide,/returnView/); assert.match(guide,/matches\) setView\("map"\)/);
  for (const control of ["places","saved","map"]) assert.match(guide,new RegExp(`"${control}"`));
  for (const action of ["Maps","Save","Share","Instagram","Facebook","Website"]) assert.match(guide,new RegExp(action));
  for (const icon of ["maps","share","instagram","facebook","website"]) assert.match(guide,new RegExp(`kind="${icon}"`));
  assert.match(guide,/styles\.selected/); assert.match(guide,/styles\.detail/); assert.match(guide,/styles\.mapColumn/); assert.match(guide,/styles\.appTitle/);
  assert.match(guide,/selectedImages\.map/); assert.match(guide,/Previous photo/); assert.match(guide,/Next photo/); assert.match(guide,/activeThumbnail/);
  assert.match(footer,/usePathname/); assert.match(footer,/pathname === "\/guide"/);
  assert.doesNotMatch(guide,/spot\.area \|\| spot\.address/); assert.doesNotMatch(guide,/<em>/); assert.match(guide,/spot\.description \|\| spot\.address/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/); assert.match(css,/\.actions \.primaryAction\{background:linear-gradient\(135deg,#ff2f7d,#8e3eff\)/); assert.match(css,/\.actions \.primaryAction\{grid-column:1\/-1/);
  assert.match(css,/grid-template-columns:392px/); assert.match(css,/\.guide\{[^}]*width:100%/); assert.doesNotMatch(css,/width:min\(100%,104rem\)/); assert.match(css,/\.appTitle\{position:absolute;left:50%/); assert.match(css,/transform:translate\(-50%,-50%\)/); assert.match(css,/@media\(max-width:1023px\)/); assert.match(css,/height:calc\(100dvh/); assert.match(css,/border-radius:1\.75rem 1\.75rem 0 0/);
  assert.match(css,/\.mobileGuideMenuButton\{position:absolute/); assert.match(css,/\.sidebar\.mobileMenuOpen/); assert.match(css,/overflow-y:auto;overscroll-behavior:contain/); assert.match(css,/\.sidebar\.mobileMenuOpen \.list\{min-height:0;overflow:visible/); assert.match(css,/\.mobileGuideIntro\{display:block/); assert.match(css,/\.categories\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/); assert.match(css,/\.detail\{position:fixed;z-index:1100;inset:0/); assert.match(css,/\.brandonSocialCard\{position:fixed;z-index:1100;inset:0/);
});
