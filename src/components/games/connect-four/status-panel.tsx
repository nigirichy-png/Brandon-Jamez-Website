import type { ReactNode } from "react";

import styles from "./connect-four.module.css";

type StatusPanelProps = {
  name: string;
  label: string;
  side: "playerSide" | "brandonSide";
  active: boolean;
  winner: boolean;
  avatar: ReactNode;
};

export function StatusPanel({ name, label, side, active, winner, avatar }: StatusPanelProps) {
  return (
    <aside
      className={`${styles.fighterPanel} ${styles[side]} ${active ? styles.activeFighter : ""} ${winner ? styles.matchWinner : ""}`}
      aria-label={`${name}${winner ? ", match winner" : active ? ", active player" : ""}`}
    >
      <div className={styles.fighterTopline}><span>{label}</span><b>{active ? "READY" : "WAIT"}</b></div>
      <div className={styles.avatarFrame}>{avatar}</div>
      <div className={styles.fighterInfo}>
        <h2>{name}</h2>
        <p>{winner ? "MATCH WINNER" : active ? "YOUR TURN" : "STANDING BY"}</p>
      </div>
    </aside>
  );
}
