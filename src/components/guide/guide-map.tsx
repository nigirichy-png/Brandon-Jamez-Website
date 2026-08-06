"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { GuideSpot } from "./guide-model";
import styles from "./integrated-guide.module.css";

type GuideMapProps = { spots: GuideSpot[]; selected: GuideSpot | null; onSelect: (spot: GuideSpot) => void; visible: boolean };

export default function GuideMap(props: GuideMapProps) {
  const [MapComponent, setMapComponent] = useState<ComponentType<GuideMapProps> | null>(null);
  useEffect(() => {
    let active = true;
    void import("./guide-mapbox-map").then((mapModule) => {
      if (active) setMapComponent(() => mapModule.default);
    });
    return () => { active = false; };
  }, []);
  if (!MapComponent) return <div className={styles.mapState}>Loading Pattaya map…</div>;
  return <MapComponent {...props} />;
}
