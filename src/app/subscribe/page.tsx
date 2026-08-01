import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button-link";
import { PageHero } from "@/components/ui/page-hero";
import { VideoCard } from "@/components/ui/video-card";
import { subscriberVideos } from "@/data/mock-data";

export const metadata: Metadata = { title: "Subscribe" };

const accessRequirements = [
  { number: "01", title: "User account", detail: "A securely authenticated account with a server-validated session." },
  { number: "02", title: "Age verified", detail: "Successful verification by a professional external provider." },
  { number: "03", title: "Subscription active", detail: "Status updated by verified, signed server-to-server payment webhooks." },
  { number: "04", title: "Account in good standing", detail: "The account must not be blocked when access and playback are requested." },
];

export default function SubscribePage() {
  return (
    <main id="main-content" className="flex-1">
      <PageHero eyebrow="Future subscriber access" title="The next layer, built responsibly." description="Subscriptions are not active. No checkout, payment form, or subscriber playback is connected on this development site.">
        <ButtonLink href="/login">View sign-in placeholder</ButtonLink>
        <ButtonLink href="/member?demo=active_subscriber" variant="secondary">Preview active member</ButtonLink>
      </PageHero>

      <section className="page-shell section-space">
        <div className="grid gap-8 lg:grid-cols-[.55fr_1fr] lg:gap-16">
          <div>
            <p className="eyebrow text-cyan-300">Access sequence</p>
            <h2 className="font-display mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">Four checks. No shortcuts.</h2>
            <p className="mt-4 leading-7 text-zinc-400">Each condition will be evaluated on the server. Passing a visual frontend check will never be enough.</p>
          </div>
          <ol className="border-t border-white/10">
            {accessRequirements.map((requirement) => (
              <li key={requirement.number} className="grid gap-3 border-b border-white/10 py-6 min-[430px]:grid-cols-[3rem_1fr]">
                <span className="font-display text-xl font-bold text-fuchsia-300">{requirement.number}</span>
                <div><h3 className="font-display text-xl font-bold text-white">{requirement.title}</h3><p className="mt-2 leading-6 text-zinc-400">{requirement.detail}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[var(--page-deep)]">
        <div className="page-shell section-space">
          <div className="mb-9 max-w-2xl">
            <p className="eyebrow text-fuchsia-300">Metadata-only previews</p>
            <h2 className="font-display mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">A glimpse, without private media.</h2>
            <p className="mt-4 leading-7 text-zinc-400">These promotional records contain mock titles and descriptions only. No video files, playback URLs, real provider identifiers, or tokens exist.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">{subscriberVideos.slice(0, 2).map((video) => <VideoCard key={video.id} video={video} />)}</div>
        </div>
      </section>

      <section className="page-shell section-space">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-cyan-300/20 bg-cyan-300/[0.045] p-7 sm:p-10 lg:p-14">
          <div className="absolute -right-20 -top-24 size-64 rounded-full border-[40px] border-cyan-300/[0.06]" aria-hidden="true" />
          <p className="eyebrow relative text-cyan-300">Planned playback boundary</p>
          <h2 className="font-display relative mt-4 max-w-3xl text-[clamp(2.25rem,7vw,4.5rem)] font-bold leading-none tracking-[-0.055em] text-white">Temporary authorization, every time.</h2>
          <p className="relative mt-5 max-w-3xl leading-8 text-zinc-300">Before playback, the future server will repeat all entitlement checks and request a short-lived signed URL or token from a professional streaming provider. The browser will receive temporary playback authorization only—never provider secrets or permanent private media links.</p>
        </div>
      </section>
    </main>
  );
}
