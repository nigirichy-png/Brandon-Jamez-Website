import { Hero } from "@/components/home/hero";
import { LiveStatus } from "@/components/home/live-status";
import { SocialStage } from "@/components/home/social-stage";
import { ButtonLink } from "@/components/ui/button-link";
import { EventCard } from "@/components/ui/event-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { VideoCard } from "@/components/ui/video-card";
import { publicVideos, upcomingEvents } from "@/data/mock-data";

export default function Home() {
  return (
    <main id="main-content" className="flex-1">
      <Hero />
      <LiveStatus />

      <section className="page-shell section-space">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="Fresh from the feed" title="Public stories, cut with intent." description="A development preview of the clips and updates that will live here. No external video service is connected." />
          <ButtonLink href="/videos" variant="secondary" className="w-fit shrink-0">Browse the library <span className="ml-2" aria-hidden="true">→</span></ButtonLink>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          <VideoCard video={publicVideos[0]} href={`/videos#${publicVideos[0].id}`} featured className="lg:col-span-7 lg:row-span-2" />
          <VideoCard video={publicVideos[1]} href={`/videos#${publicVideos[1].id}`} className="lg:col-span-5" />
          <VideoCard video={publicVideos[2]} href={`/videos#${publicVideos[2].id}`} className="lg:col-span-5" />
        </div>
      </section>

      <section className="border-y border-white/10 bg-[var(--page-deep)]">
        <div className="page-shell section-space grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading eyebrow="Up next" title="Plans worth showing up for." description="Mock dates demonstrate how public appearances, online sessions, and special announcements will be presented." />
            <ButtonLink href="/events" variant="quiet" className="mt-5 px-0">See the full calendar <span className="ml-2" aria-hidden="true">→</span></ButtonLink>
          </div>
          <div>{upcomingEvents.slice(0, 2).map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</div>
        </div>
      </section>

      <section className="page-shell section-space">
        <div className="mb-9 grid gap-6 lg:grid-cols-[1fr_.75fr] lg:items-end">
          <SectionHeading eyebrow="Find the signal" title="Every platform. One point of view." />
          <p className="max-w-xl leading-7 text-zinc-400 lg:justify-self-end">Official destinations will be added only when intentionally configured. For now, each channel remains a clearly labeled placeholder.</p>
        </div>
        <SocialStage />
      </section>

      <section className="page-shell pb-[var(--section-space)]">
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-white/10">
          <article className="relative grid gap-8 bg-cyan-300/[0.055] p-7 sm:p-10 lg:grid-cols-[1fr_.7fr] lg:items-end lg:p-14">
            <div className="absolute -right-16 -top-20 size-56 rounded-full border-[34px] border-cyan-300/[0.07]" aria-hidden="true" />
            <div className="relative">
              <p className="eyebrow text-cyan-300">Pattaya Guide</p>
              <h2 className="font-display mt-4 max-w-2xl text-[clamp(2.25rem,7vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.055em] text-white">Local perspective. Its own destination.</h2>
            </div>
            <div className="relative lg:pb-1">
              <p className="leading-7 text-zinc-300">The existing Guide stays independent while this site prepares a deliberate public handoff.</p>
              <ButtonLink href="/guide" variant="secondary" className="mt-6">Explore the guide plan</ButtonLink>
            </div>
          </article>
          <article className="relative grid gap-8 border-t border-white/10 bg-gradient-to-br from-fuchsia-500/14 via-violet-500/[0.06] to-transparent p-7 sm:p-10 lg:grid-cols-[.7fr_1fr] lg:items-center lg:p-14">
            <div className="lg:order-2">
              <p className="eyebrow text-fuchsia-300">Future membership</p>
              <h2 className="font-display mt-4 max-w-2xl text-[clamp(2.25rem,7vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.055em] text-white">More access. Real safeguards.</h2>
            </div>
            <div className="lg:order-1">
              <p className="max-w-md leading-7 text-zinc-300">See the planned subscriber experience and the checks required before it can safely launch.</p>
              <ButtonLink href="/subscribe" className="mt-6">See what is planned</ButtonLink>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
