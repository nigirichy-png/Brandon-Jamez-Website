"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import styles from "./homepage-peek.module.css";

type PeekSide = "left" | "right";

const FIRST_PEEK_DELAY_MS = 5_000;
const PEEK_DURATION_MS = 4_200;
const MIN_PAUSE_MS = 12_000;
const RANDOM_PAUSE_MS = 14_000;

export function HomepagePeek() {
  const [visible, setVisible] = useState(false);
  const [side, setSide] = useState<PeekSide>("right");
  const lastSide = useRef<PeekSide>("right");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let timer: number | undefined;

    const schedulePeek = (delay: number) => {
      timer = window.setTimeout(() => {
        if (cancelled) return;

        const nextSide: PeekSide = Math.random() > .5 ? "left" : "right";
        const resolvedSide = nextSide === lastSide.current ? (nextSide === "left" ? "right" : "left") : nextSide;
        lastSide.current = resolvedSide;
        setSide(resolvedSide);
        setVisible(true);

        timer = window.setTimeout(() => {
          if (cancelled) return;
          setVisible(false);
          schedulePeek(MIN_PAUSE_MS + Math.random() * RANDOM_PAUSE_MS);
        }, PEEK_DURATION_MS);
      }, delay);
    };

    schedulePeek(FIRST_PEEK_DELAY_MS);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className={styles.peek} data-side={side} data-visible={visible ? "true" : "false"} aria-hidden="true">
      <Image src="/woman-peek.png" alt="" width={1254} height={1254} sizes="(max-width: 720px) 9rem, 13rem" className={styles.image} />
    </div>
  );
}
