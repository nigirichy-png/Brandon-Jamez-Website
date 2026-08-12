import type { Metadata } from "next";

import { GameCard } from "@/components/games/game-card";

import styles from "./games.module.css";

export const metadata: Metadata = {
  title: "Games | Brandon Jamez",
  description: "Play browser games from the Brandon Jamez arcade.",
};

export default function GamesPage() {
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <section className={styles.hero}>
        <p className={styles.kicker}>Brandon Jamez Arcade</p>
        <h1>Games</h1>
        <p className={styles.intro}>
          Pick your game, challenge Brandon and claim your spot. More battles are coming soon.
        </p>
      </section>

      <section className={styles.library} aria-labelledby="game-library-title">
        <div className={styles.libraryHeading}>
          <h2 id="game-library-title">Choose your battle</h2>
          <span>1 game available</span>
        </div>
        <div className={styles.grid}>
          <GameCard
            href="/games/connect-four"
            imageSrc="/games/connect-four/brandon-comic.png"
            imageAlt="Brandon als Comic-Gegner"
            players="1 player · vs Brandon"
            title="Connect Four vs Brandon"
            description="Drop your chips, connect four and outsmart Brandon across three difficulty levels."
          />
        </div>
      </section>
    </main>
  );
}
