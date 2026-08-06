"use client";

import { useEffect, useState } from "react";

const pattayaTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function PattayaTime({ showUtcOffset = false }: { showUtcOffset?: boolean }) {
  const [instant, setInstant] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setInstant(Date.now());
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const time = instant === null ? "--:--" : pattayaTimeFormatter.format(new Date(instant));
  return <time dateTime={instant === null ? undefined : new Date(instant).toISOString()} aria-label={`Current time in Pattaya: ${time} Indochina Time`}>Pattaya · <strong>{time}</strong> ICT{showUtcOffset ? <small> (UTC+7)</small> : null}</time>;
}
