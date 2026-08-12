import Image from "next/image";
import Link from "next/link";

import styles from "./game-card.module.css";

type GameCardProps = {
  description: string;
  href: string;
  imageAlt: string;
  imageSrc: string;
  players: string;
  status?: string;
  title: string;
};

export function GameCard({
  description,
  href,
  imageAlt,
  imageSrc,
  players,
  status = "Play now",
  title,
}: GameCardProps) {
  return (
    <article className={styles.card}>
      <Link href={href} className={styles.link} aria-label={`${title} spielen`}>
        <div className={styles.visual}>
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(max-width: 48rem) 100vw, 42rem"
            className={styles.image}
          />
          <div className={styles.scrim} aria-hidden="true" />
          <div className={styles.board} aria-hidden="true">
            {Array.from({ length: 24 }, (_, index) => (
              <span
                key={index}
                className={
                  index === 17 || index === 21
                    ? styles.redPiece
                    : index === 16 || index === 22 || index === 23
                      ? styles.goldPiece
                      : undefined
                }
              />
            ))}
          </div>
          <span className={styles.status}>{status}</span>
        </div>

        <div className={styles.content}>
          <p className={styles.eyebrow}>{players}</p>
          <h2>{title}</h2>
          <p className={styles.description}>{description}</p>
          <span className={styles.action}>
            Game starten
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
