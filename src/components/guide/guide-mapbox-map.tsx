"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { type GeoJSONSource, type Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GuideSpot } from "./guide-model";
import styles from "./integrated-guide.module.css";

const categoryColors: Record<string, string> = { Restaurants: "#ff6b35", Bars: "#fbbf24", "Go-Go": "#b14cff", "Gentlemen's Clubs": "#ff1744", Hotels: "#00b7ff", Clubs: "#94a3b8", "Live Music": "#38f58b", Attractions: "#a3e635" };
const categoryIcons: Record<string, string> = { Restaurants: "🍜", Bars: "🍸", "Go-Go": "💃", "Gentlemen's Clubs": "♥", Hotels: "🏨", Clubs: "🪩", "Live Music": "🎵", Attractions: "🌴" };
const iconId = (category: string) => `guide-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "other"}`;
const featuresFor = (spots: GuideSpot[]) => spots.map((spot) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [spot.lng, spot.lat] }, properties: { id: spot.id, name: spot.name, color: categoryColors[spot.category] ?? "#ff2f7d", iconImage: iconId(spot.category) } }));

function addCategoryIcons(map: MapboxMap) {
  for (const [category, icon] of Object.entries(categoryIcons)) {
    const id = iconId(category);
    if (map.hasImage(id)) continue;
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) continue;
    context.clearRect(0, 0, 96, 96);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "58px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif";
    context.fillText(icon, 48, 50);
    map.addImage(id, context.getImageData(0, 0, 96, 96), { pixelRatio: 1 });
  }
}

export default function GuideMap({ spots, selected, onSelect, visible }: { spots: GuideSpot[]; selected: GuideSpot | null; onSelect: (spot: GuideSpot) => void; visible: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const spotsRef = useRef(spots);
  const onSelectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const tokenConfigured = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

  useEffect(() => { spotsRef.current = spots; }, [spots]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => {
    const container = containerRef.current;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!container || !token) return;
    let disposed = false;
    let initializationFailed = false;

    const initializeMap = () => {
      if (disposed || initializationFailed || mapRef.current || container.clientWidth === 0 || container.clientHeight === 0) return;
      if (!mapboxgl.supported()) {
        initializationFailed = true;
        setMapError("The interactive map is unavailable in this browser. You can still use the place list and Google Maps links.");
        return;
      }
      try {
        mapboxgl.accessToken = token;
        const mobile = window.matchMedia("(max-width: 1023px)").matches;
        const map = new mapboxgl.Map({
        container,
        style: mobile ? "mapbox://styles/mapbox/streets-v12" : "mapbox://styles/mapbox/dark-v11",
        center: [100.883, 12.923],
        zoom: mobile ? 12.3 : 12.8,
        minZoom: 11.5,
        maxZoom: 18,
        maxBounds: [[100.75, 12.8], [101, 13.05]],
        attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
        if (disposed) return;
        addCategoryIcons(map);
        map.addSource("guide-spots", { type: "geojson", cluster: true, clusterMaxZoom: 14, clusterRadius: 48, data: { type: "FeatureCollection", features: featuresFor(spotsRef.current) } });
        map.addLayer({ id: "guide-clusters", type: "circle", source: "guide-spots", filter: ["has", "point_count"], paint: { "circle-color": ["step", ["get", "point_count"], "#ff2f7d", 5, "#b14cff", 15, "#14c8ff"], "circle-radius": ["step", ["get", "point_count"], 23, 5, 30, 15, 38], "circle-stroke-color": "#ffffff", "circle-stroke-width": 5, "circle-opacity": .96 } });
        map.addLayer({ id: "guide-cluster-count", type: "symbol", source: "guide-spots", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": ["step", ["get", "point_count"], 13, 5, 15, 15, 17] }, paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,.35)", "text-halo-width": 1 } });
        map.addLayer({ id: "guide-selected", type: "circle", source: "guide-spots", filter: ["==", ["get", "id"], "__none__"], paint: { "circle-color": "rgba(255,47,125,.16)", "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 24, 14, 30, 16, 36, 18, 42], "circle-stroke-color": "rgba(255,47,125,.85)", "circle-stroke-width": 4 } });
        map.addLayer({ id: "guide-points", type: "circle", source: "guide-spots", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 11, 13, 13, 14, 16, 15, 18, 17, 22], "circle-stroke-color": "#fff", "circle-stroke-width": 4, "circle-opacity": .96 } });
        map.addLayer({ id: "guide-point-icons", type: "symbol", source: "guide-spots", filter: ["!", ["has", "point_count"]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 12, .22, 14, .27, 16, .32, 18, .36], "icon-allow-overlap": true, "icon-ignore-placement": true } });
        map.on("click", "guide-clusters", (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["guide-clusters"] })[0] as unknown as { properties?: { cluster_id?: number }; geometry: { coordinates: [number, number] } } | undefined;
          const clusterId = feature?.properties?.cluster_id;
          const source = map.getSource("guide-spots") as GeoJSONSource;
          if (feature && clusterId !== undefined) source.getClusterExpansionZoom(clusterId, (error, zoom) => { if (!error && zoom !== null && zoom !== undefined) map.easeTo({ center: feature.geometry.coordinates, zoom }); });
        });
        const selectPoint = (event: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
          const feature = event.features?.[0] as unknown as { properties?: { id?: string } } | undefined;
          const spot = spotsRef.current.find((item) => item.id === feature?.properties?.id);
          if (spot) {
            map.flyTo({ center: [spot.lng, spot.lat], zoom: Math.max(map.getZoom(), 15.7), essential: false });
            onSelectRef.current(spot);
          }
        };
        map.on("click", "guide-points", selectPoint);
        map.on("click", "guide-point-icons", selectPoint);
        for (const layer of ["guide-clusters", "guide-points", "guide-point-icons"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }
          setMapReady(true);
        });
      } catch {
        initializationFailed = true;
        setMapError("The interactive map could not start. You can still use the place list and Google Maps links.");
      }
    };

    const observer = new ResizeObserver(() => {
      initializeMap();
      if (container.clientWidth > 0 && container.clientHeight > 0) mapRef.current?.resize();
    });
    observer.observe(container);
    initializeMap();
    return () => {
      disposed = true;
      observer.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const source = map.getSource("guide-spots") as GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features: featuresFor(spots) });
  }, [spots]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("guide-selected")) map.setFilter("guide-selected", ["==", ["get", "id"], selected?.id ?? "__none__"]);
    if (selected) map.flyTo({ center: [selected.lng, selected.lat], zoom: 15.4, essential: false });
  }, [selected]);
  useEffect(() => { if (visible) window.setTimeout(() => mapRef.current?.resize(), 0); }, [visible]);

  return <div className={styles.mapFrame} aria-label="Interactive Pattaya map">
    {!tokenConfigured ? <div className={styles.mapState} role="status">Map token is not configured.</div> : mapError ? <div className={styles.mapState} role="status">{mapError}</div> : !mapReady ? <div className={styles.mapState} role="status">Loading Pattaya mapâ€¦</div> : null}
    <div ref={containerRef} className={styles.map} />
  </div>;
}
