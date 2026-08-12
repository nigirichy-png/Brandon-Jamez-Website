import Image from "next/image";

import styles from "./connect-four.module.css";

export type BrandonAvatarState = "neutral" | "thinking" | "winning" | "losing";

type BrandonAvatarProps = {
  state?: BrandonAvatarState;
};

export function BrandonAvatar({ state = "neutral" }: BrandonAvatarProps) {
  return (
    <div className={`${styles.brandonAvatar} ${styles[`avatarState${state}`]}`}>
      <Image
        src="/games/connect-four/brandon-comic.png"
        alt="Comic portrait of Brandon pointing toward the player"
        fill
        priority
        sizes="(max-width: 620px) 48vw, (max-width: 900px) 30vw, 220px"
        className={styles.avatarImage}
      />
      <span className={styles.avatarRim} aria-hidden="true" />
      <span className={styles.avatarStateLabel} aria-hidden="true">
        {state === "thinking" ? "CALCULATING" : state === "winning" ? "ON FIRE" : state === "losing" ? "PRESSURED" : "LOCKED IN"}
      </span>
    </div>
  );
}
