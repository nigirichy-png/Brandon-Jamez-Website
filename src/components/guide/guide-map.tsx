"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { type GeoJSONSource, type Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GuideSpot } from "./guide-model";
import styles from "./integrated-guide.module.css";

const categoryColors: Record<string, string> = { Restaurants: "#ff6b35", Bars: "#fbbf24", "Go-Go": "#b14cff", "Gentlemen's Clubs": "#ff1744", Hotels: "#00b7ff", Clubs: "#94a3b8", "Live Music": "#38f58b", Attractions: "#a3e635" };
const featuresFor = (spots: GuideSpot[]) => spots.map((spot) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [spot.lng, spot.lat] }, properties: { id: spot.id, name: spot.name, color: categoryColors[spot.category] ?? "#ff2f7d" } }));

export default function GuideMap({ spots, selected, onSelect, visible }: { spots: GuideSpot[]; selected: GuideSpot | null; onSelect: (spot: GuideSpot) => void; visible: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null); const mapRef = useRef<MapboxMap | null>(null); const spotsRef = useRef(spots); const onSelectRef = useRef(onSelect); const tokenConfigured = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  useEffect(() => { spotsRef.current = spots; }, [spots]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return; const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({ container: containerRef.current, style: "mapbox://styles/mapbox/dark-v11", center: [100.883,12.923], zoom: 12.8, minZoom: 11.5, maxZoom: 18, maxBounds: [[100.75,12.8],[101,13.05]], attributionControl: true });
    mapRef.current = map; map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("guide-spots", { type:"geojson", cluster:true, clusterMaxZoom:14, clusterRadius:48, data:{ type:"FeatureCollection", features:featuresFor(spotsRef.current) } });
      map.addLayer({ id:"guide-clusters", type:"circle", source:"guide-spots", filter:["has","point_count"], paint:{ "circle-color":["step",["get","point_count"],"#ff2f7d",5,"#9b5cff",15,"#28d7ff"], "circle-radius":["step",["get","point_count"],20,5,27,15,34], "circle-stroke-color":"#ffffff", "circle-stroke-width":3, "circle-opacity":.96 } });
      map.addLayer({ id:"guide-cluster-count", type:"symbol", source:"guide-spots", filter:["has","point_count"], layout:{ "text-field":["get","point_count_abbreviated"], "text-size":12 }, paint:{ "text-color":"#fff", "text-halo-color":"rgba(0,0,0,.35)", "text-halo-width":1 } });
      map.addLayer({ id:"guide-points", type:"circle", source:"guide-spots", filter:["!",["has","point_count"]], paint:{ "circle-color":["get","color"], "circle-radius":9, "circle-stroke-color":"#fff", "circle-stroke-width":3 } });
      map.addLayer({ id:"guide-selected", type:"circle", source:"guide-spots", filter:["==",["get","id"],"__none__"], paint:{ "circle-color":"rgba(255,47,125,.16)", "circle-radius":18, "circle-stroke-color":"#ff2f7d", "circle-stroke-width":4 } });
      map.on("click","guide-clusters",(event) => { const feature=map.queryRenderedFeatures(event.point,{layers:["guide-clusters"]})[0] as unknown as { properties?: { cluster_id?: number }; geometry: { coordinates: [number,number] } } | undefined; const clusterId=feature?.properties?.cluster_id; const source=map.getSource("guide-spots") as GeoJSONSource; if (feature && clusterId !== undefined) source.getClusterExpansionZoom(clusterId,(error,zoom)=>{if(!error&&zoom!==null&&zoom!==undefined)map.easeTo({center:feature.geometry.coordinates,zoom});}); });
      map.on("click","guide-points",(event) => { const feature=event.features?.[0] as unknown as { properties?: { id?: string } } | undefined; const id=feature?.properties?.id; const spot=spotsRef.current.find((item)=>item.id===id); if(spot) onSelectRef.current(spot); });
      for (const layer of ["guide-clusters", "guide-points"]) { map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; }); map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; }); }
    });
    return () => { map.remove(); mapRef.current=null; };
  }, []);
  useEffect(() => { const map=mapRef.current; if(!map?.isStyleLoaded()) return; const source=map.getSource("guide-spots") as GeoJSONSource | undefined; source?.setData({type:"FeatureCollection",features:featuresFor(spots)}); },[spots]);
  useEffect(() => { const map=mapRef.current; if(!map) return; if(map.getLayer("guide-selected"))map.setFilter("guide-selected",["==",["get","id"],selected?.id ?? "__none__"]); if(selected)map.flyTo({center:[selected.lng,selected.lat],zoom:15.4,essential:true}); },[selected]);
  useEffect(() => { if(visible) window.setTimeout(()=>mapRef.current?.resize(),0); },[visible]);
  return <div className={styles.mapFrame} aria-label="Interactive Pattaya map">{!tokenConfigured ? <div className={styles.mapState} role="status">Map token is not configured.</div> : null}<div ref={containerRef} className={styles.map} /></div>;
}
