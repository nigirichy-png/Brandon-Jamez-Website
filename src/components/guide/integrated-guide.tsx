"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import GuideMap from "./guide-map";
import { filterGuideSpots, guideCategories, guideFavoriteStorageKey, guideMapsUrl, parseGuideFavorites, toggleGuideFavorite, type GuideSpot } from "./guide-model";
import styles from "./integrated-guide.module.css";
type View = "places" | "saved" | "map";
const brandonSocialLinks = [
  { key: "facebook", label: "Facebook", url: "https://www.facebook.com/profile.php?id=61577844596882" },
  { key: "instagram", label: "Instagram", url: "https://www.instagram.com/brandonjamezmakmak/" },
  { key: "youtube", label: "YouTube", url: "https://www.youtube.com/@BrandonJamezPattaya" },
  { key: "kick", label: "Kick", url: "https://kick.com/brandonjamezmakmak" },
  { key: "rumble", label: "Rumble", url: "https://rumble.com/user/BrandonJamezMakMakTV" },
] as const;

function categoryLabel(value: string): string { return value === "Go-Go" ? "Go-Go Bars" : value; }
function categoryIcon(value: string): string {
  return ({ Restaurants: "🍜", Bars: "🍸", "Go-Go": "💃", "Go-Go Bars": "💃", "Gentlemen's Clubs": "♥", Hotels: "🏨", Shopping: "🛍️", Attractions: "🌴", Clubs: "🪩" } as Record<string, string>)[value] || "•";
}

function ActionIcon({ kind }: { kind: "maps" | "share" | "instagram" | "facebook" | "website" }) {
  if (kind === "instagram") return <svg className={`${styles.actionIcon} ${styles.instagramIcon}`} viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.4" /><circle cx="16.8" cy="7.2" r="1" /></svg>;
  if (kind === "facebook") return <svg className={`${styles.actionIcon} ${styles.facebookIcon}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M14.4 8.4V6.9c0-.7.5-1.1 1.2-1.1h1.7V3h-2.5c-2.7 0-4.1 1.6-4.1 4v1.4H8.6v3h2.1V21h3.2v-9.6h2.6l.4-3h-3.1Z" /></svg>;
  if (kind === "website") return <svg className={`${styles.actionIcon} ${styles.websiteIcon}`} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
  if (kind === "share") return <svg className={styles.actionIcon} viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></svg>;
  return <svg className={`${styles.actionIcon} ${styles.mapsIcon}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}

function ActionLabel({ kind, children }: { kind: "maps" | "share" | "instagram" | "facebook" | "website"; children: string }) {
  return <span className={styles.actionLabel}><ActionIcon kind={kind} /><span>{children}</span></span>;
}

export function IntegratedGuide({ initialSpots, loadStatus }: { initialSpots: GuideSpot[]; loadStatus: "ready" | "unconfigured" | "error" }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState<View>("places");
  const [returnView, setReturnView] = useState<Exclude<View, "map">>("places");
  const [selected, setSelected] = useState<GuideSpot | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [socialLinksOpen, setSocialLinksOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.innerWidth <= 1023 || window.matchMedia("(max-width: 1023px)").matches) setView("map");
      try {
        setFavorites(parseGuideFavorites(localStorage.getItem(guideFavoriteStorageKey), new Set(initialSpots.map((spot) => spot.id))));
      } catch {
        setFavorites([]);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialSpots]);

  const categories = useMemo(() => guideCategories(initialSpots), [initialSpots]);
  const savedOnly = view === "saved" || (view === "map" && returnView === "saved");
  const filtered = useMemo(() => filterGuideSpots(initialSpots, query, category, favorites, savedOnly), [initialSpots, query, category, favorites, savedOnly]);
  const toggle = (id: string) => setFavorites((current) => {
    const next = toggleGuideFavorite(current, id);
    localStorage.setItem(guideFavoriteStorageKey, JSON.stringify(next));
    return next;
  });
  const share = async (spot: GuideSpot) => {
    const data = { title: spot.name, text: `${spot.name} · Pattaya`, url: guideMapsUrl(spot) };
    if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(data.url);
  };
  const selectSpot = (spot: GuideSpot) => {
    setImageIndex(0);
    setSelected(spot);
    setMobileMenuOpen(false);
    if (window.innerWidth <= 1023 || window.matchMedia("(max-width: 1023px)").matches) {
      if (view !== "map") setReturnView(view);
      setView("map");
    }
  };
  const changeView = (next: View) => {
    if (next !== "map") setReturnView(next);
    if (next === "map") setMobileMenuOpen(false);
    setView(next);
  };
  const selectedImages = selected ? [...new Set([selected.image, ...selected.images].filter(Boolean))] : [];
  const activeImage = selectedImages[imageIndex] || selected?.image || "";

  return <section id="pattaya-guide" data-site-builder-node="guide-native-slot" data-site-builder-label="Interactive Pattaya Guide" data-site-builder-kind="dynamic" className={styles.guide} aria-label="Interactive Pattaya Guide">
    <button type="button" className={`${styles.mobileGuideMenuButton} ${mobileMenuOpen ? styles.mobileGuideMenuButtonOpen : ""}`} aria-expanded={mobileMenuOpen} aria-controls="mobile-guide-panel" aria-label={mobileMenuOpen ? "Close Pattaya Guide menu" : "Open Pattaya Guide menu"} onClick={() => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        setView("map");
      } else {
        setView(returnView);
        setMobileMenuOpen(true);
      }
    }}>{mobileMenuOpen ? "×" : "☰"}</button>
    <div className={styles.appBar}>
      <nav className={styles.views} aria-label="Guide view">
        {(["places", "saved", "map"] as const).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => changeView(item)}>{item[0].toUpperCase() + item.slice(1)}{item === "saved" && hydrated ? ` ${favorites.length}` : ""}</button>)}
      </nav>
      <header data-site-builder-node="guide-intro" data-site-builder-label="Guide introduction" className={styles.appTitle}>
        <small>Brandon&apos;s Pattaya Guide</small>
        <h1>Find your <span className={styles.appTitleAccent}>Pattaya.</span></h1>
        <span>Places, food, nightlife and local picks from Brandon.</span>
      </header>
      <p><strong>{initialSpots.length}</strong> places <span>·</span> <strong>{favorites.length}</strong> saved</p>
    </div>

    {loadStatus !== "ready" ? <div className={styles.notice} role={loadStatus === "error" ? "alert" : "status"}>{loadStatus === "unconfigured" ? "The native guide data source is not configured yet." : "The guide could not be loaded. Please try again after a reload."}</div> : null}

    <div className={`${styles.workspace} ${view === "map" ? styles.mapOnly : ""}`}>
      <aside id="mobile-guide-panel" className={`${styles.sidebar} ${view === "map" ? styles.mobileHidden : ""} ${mobileMenuOpen ? styles.mobileMenuOpen : ""}`} aria-label={savedOnly ? "Saved Pattaya places" : "Pattaya places"}>
        <header className={styles.mobileGuideIntro}>
          <h1>Brandon Jamez<br />Pattaya Guide</h1>
          <p>Nightlife · Food · Fun · Hidden Gems</p>
          <div><span><strong>{initialSpots.length}</strong><small>Places</small></span><span><strong>{favorites.length}</strong><small>Saved</small></span></div>
        </header>
        <div className={styles.controls}>
          <button type="button" className={styles.mobileFollowBrandon} onClick={() => { setMobileMenuOpen(false); setSocialLinksOpen(true); }}><img src="/brandon-clean-portrait.png" alt="" /><span><strong>Follow Brandon</strong><small>Socials &amp; livestreams</small></span></button>
          <label className={styles.search}><span aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places…" aria-label="Search places" /></label>
          <p>Categories</p>
          <div className={styles.categories} aria-label="Guide categories">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}><span aria-hidden="true">{item === "All" ? "✨" : categoryIcon(item)}</span>{categoryLabel(item)}</button>)}</div>
          <div className={styles.mobileGuideActions}>
            <button type="button" className={styles.mobileGuidePrimaryAction} onClick={() => changeView("map")}><span aria-hidden="true">📍</span><strong>Show spots</strong></button>
            <button type="button" onClick={() => { setCategory("All"); setSelected(null); changeView("map"); }}><span aria-hidden="true">🌴</span><strong>Pattaya map</strong></button>
            <button type="button" aria-pressed={savedOnly} onClick={() => { setReturnView("saved"); setView("saved"); }}><span aria-hidden="true">♡</span><strong>Favorites</strong></button>
            <button type="button" onClick={() => { setQuery(""); setCategory("All"); setReturnView("places"); setView("places"); }}><span aria-hidden="true">↻</span><strong>Reset</strong></button>
          </div>
        </div>
        <div className={styles.listHeading}><strong>{savedOnly ? "Saved places" : "Places"}</strong><span>{filtered.length} shown</span></div>
        <div className={styles.list} aria-live="polite">
          {filtered.length ? filtered.map((spot) => <article key={spot.id} className={`${styles.card} ${selected?.id === spot.id ? styles.selected : ""}`}>
            <button type="button" className={styles.cardMain} onClick={() => selectSpot(spot)}>
              <span className={styles.cardImage}>{spot.image ? <img src={spot.image} alt="" loading="lazy" /> : <span className={styles.imageFallback}>BJ</span>}<i aria-hidden="true" /></span>
              <span className={styles.cardBody}><span className={styles.cardMeta}><small><span className={styles.categoryIcon} aria-hidden="true">{categoryIcon(spot.category)}</span>{categoryLabel(spot.category)}</small>{selected?.id === spot.id ? <b>Selected</b> : null}</span><strong>{spot.name}</strong><p>{spot.description || spot.address || "Pattaya place"}</p>{spot.tags.length ? <span className={styles.tags}>{spot.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</span> : null}</span>
            </button>
            <button type="button" className={`${styles.favorite} ${favorites.includes(spot.id) ? styles.saved : ""}`} aria-label={favorites.includes(spot.id) ? "Remove from saved places" : "Save this place"} onClick={() => toggle(spot.id)}>{favorites.includes(spot.id) ? "♥" : "♡"}</button>
          </article>) : <div className={styles.empty}><strong>No places found.</strong><p>Try another search or category.</p></div>}
        </div>
      </aside>

      <div className={`${styles.mapColumn} ${view !== "map" ? styles.desktopMap : ""}`}>
        <GuideMap spots={filtered} selected={selected} onSelect={(spot) => { setImageIndex(0); setSelected(spot); }} visible={view === "map" || view === "places"} />
        <span className={styles.mapStatus}>{filtered.length} places shown · {category}</span>
        {selected ? <aside className={styles.detail} aria-label={`${selected.name} details`}>
          <button type="button" className={styles.detailClose} onClick={() => setSelected(null)} aria-label="Close details">×</button>
          <div className={styles.detailImage}>{activeImage ? <img src={activeImage} alt={`${selected.name} photo ${imageIndex + 1}`} /> : <span className={styles.imageFallback}>BJ</span>}<i aria-hidden="true" /><span><small><span aria-hidden="true">{categoryIcon(selected.category)}</span> {categoryLabel(selected.category)}</small>{selected.area ? <small>{selected.area}</small> : null}</span>{selectedImages.length > 1 ? <div className={styles.galleryControls}><button type="button" onClick={() => setImageIndex((current) => current === 0 ? selectedImages.length - 1 : current - 1)} aria-label="Previous photo">‹</button><b>{imageIndex + 1}/{selectedImages.length}</b><button type="button" onClick={() => setImageIndex((current) => (current + 1) % selectedImages.length)} aria-label="Next photo">›</button></div> : null}</div>
          {selectedImages.length > 1 ? <div className={styles.galleryStrip}>{selectedImages.map((image, index) => <button key={image} type="button" className={index === imageIndex ? styles.activeThumbnail : ""} onClick={() => setImageIndex(index)} aria-label={`Show photo ${index + 1}`}><img src={image} alt="" loading="lazy" /></button>)}</div> : null}
          <div className={styles.detailBody}><h2>{selected.name}</h2>{selected.address ? <address><span aria-hidden="true">📍</span><span><strong>Address</strong>{selected.address}</span></address> : null}{selected.description ? <p>{selected.description}</p> : null}<div className={styles.actions}><a className={styles.primaryAction} href={guideMapsUrl(selected)} target="_blank" rel="noopener noreferrer"><ActionLabel kind="maps">Maps</ActionLabel></a><button type="button" className={favorites.includes(selected.id) ? styles.savedAction : ""} onClick={() => toggle(selected.id)}>{favorites.includes(selected.id) ? "♥ Saved" : "♡ Save"}</button><button type="button" onClick={() => void share(selected)}><ActionLabel kind="share">Share</ActionLabel></button>{selected.instagram ? <a href={selected.instagram} target="_blank" rel="noopener noreferrer"><ActionLabel kind="instagram">Instagram</ActionLabel></a> : null}{selected.facebook ? <a href={selected.facebook} target="_blank" rel="noopener noreferrer"><ActionLabel kind="facebook">Facebook</ActionLabel></a> : null}{selected.website ? <a href={selected.website} target="_blank" rel="noopener noreferrer"><ActionLabel kind="website">Website</ActionLabel></a> : null}</div></div>
        </aside> : null}
      </div>
    </div>
    {socialLinksOpen ? <aside className={styles.brandonSocialCard} aria-label="Brandon social links">
      <button type="button" className={styles.socialClose} onClick={() => setSocialLinksOpen(false)} aria-label="Close Brandon social links">×</button>
      <div className={styles.socialHero}><img src="/brandon-clean-portrait.png" alt="" /><span>Official links</span></div>
      <div className={styles.socialBody}><h2>Follow Brandon</h2><p>Latest Pattaya nightlife content, livestreams, and updates.</p><div className={styles.socialGrid}>{brandonSocialLinks.map((item) => <a key={item.key} className={styles[`social-${item.key}`]} href={item.url} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">{item.key === "facebook" ? "f" : item.key === "instagram" ? "◎" : item.key === "youtube" ? "▶" : item.key === "kick" ? "K" : "R"}</span><strong>{item.label}</strong></a>)}</div></div>
    </aside> : null}
  </section>;
}
