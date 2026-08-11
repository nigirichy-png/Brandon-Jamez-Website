import type { Metadata } from "next";

import { IntegratedGuide } from "@/components/guide/integrated-guide";
import { loadPublicGuideSpots } from "@/components/guide/guide-data";
import styles from "@/components/guide/integrated-guide.module.css";

export const metadata: Metadata = { title: "Pattaya Guide" };

export default async function GuidePage() {
  const guide = await loadPublicGuideSpots();
  return <main id="main-content" className={styles.page}>
    <IntegratedGuide initialSpots={guide.spots} loadStatus={guide.status} />
  </main>;
}
