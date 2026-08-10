import type { ReactNode } from "react";
import styles from "./moderation-hub-shell.module.css";

export function ModerationHubShell({ operatorName, accessLabel, publicPreview = false, settings, settingsLabel = "Hub tools", children }: { operatorName: string; accessLabel: string; publicPreview?: boolean; settings?: ReactNode; settingsLabel?: string; children: ReactNode }) {
  return <main id="main-content" className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.brand}><span className={styles.brandMark} aria-hidden="true"><span /></span><div><p className={styles.eyebrow}>Moderation workspace</p><h1>Brandon Moderation Hub</h1></div></div>
      <div className={styles.headerStatus} aria-label="Hub status">
        <span className={styles.pill} data-tone="youtube"><span className={styles.pillDot} aria-hidden="true" />YouTube · Connected</span>
        <span className={styles.pill} data-recorder="true">Recorder: Independent</span>
        {publicPreview ? <span className={`${styles.pill} ${styles.previewBadge}`}>Public read-only preview</span> : null}
        <span className={styles.profile}><span className={styles.avatar} aria-hidden="true">{publicPreview ? "PV" : "YT"}</span><span className={styles.profileCopy}><small>{accessLabel}</small><strong>{operatorName}</strong></span></span>
        {settings ? <details className={styles.settings}><summary>{settingsLabel}</summary><div className={styles.settingsPanel}>{settings}</div></details> : null}
      </div>
    </header>
    <div className={styles.workspaceSlot}>{children}</div>
  </main>;
}
