import type { Event } from "@/types";

const statusStyles: Record<Event["status"], string> = {
  announced: "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-200",
  limited: "border-amber-300/25 bg-amber-300/[0.08] text-amber-200",
  "coming-soon": "border-fuchsia-300/25 bg-fuchsia-300/[0.08] text-fuchsia-200",
};

export function EventCard({ event, index }: { event: Event; index: number }) {
  const [month, day] = event.date.split(" ");

  return (
    <article className="group grid gap-5 border-t border-white/10 py-7 last:border-b sm:grid-cols-[5.5rem_1fr_auto] sm:items-start sm:gap-7 lg:py-8">
      <div className="flex items-baseline gap-2 sm:block">
        <span className="eyebrow text-fuchsia-300">{month.slice(0, 3)}</span>
        <span className="font-display block text-4xl font-bold leading-none text-white sm:mt-1 sm:text-5xl">{day?.replace(",", "")}</span>
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-500">{String(index + 1).padStart(2, "0")}</span>
          <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] ${statusStyles[event.status]}`}>{event.status.replace("-", " ")}</span>
        </div>
        <h3 className="font-display mt-3 text-2xl font-bold tracking-tight text-white transition-colors group-hover:text-cyan-200 sm:text-3xl">{event.title}</h3>
        <p className="mt-2 max-w-2xl leading-7 text-zinc-400">{event.description}</p>
      </div>
      <dl className="grid gap-2 text-sm sm:min-w-48 sm:text-right">
        <div><dt className="sr-only">Time</dt><dd className="font-extrabold text-zinc-200">{event.time}</dd></div>
        <div><dt className="sr-only">Location</dt><dd className="max-w-xs leading-5 text-zinc-500 sm:max-w-52">{event.location}</dd></div>
      </dl>
    </article>
  );
}
