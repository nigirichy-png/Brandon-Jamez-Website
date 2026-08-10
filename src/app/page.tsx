import Image from "next/image";

import { HomepageEditableImage, HomepageEditableLink, HomepageEditableMedia, HomepageEditableProviderBadge, HomepageEditableSection, HomepageEditableText, HomepageEditor, HomepageLayoutItem } from "@/components/home/homepage-editor";
import type { HomepageEditorDefaults } from "@/components/home/homepage-editor-model";
import { videoPlatformIdentities } from "@/components/video/video-platform-identity";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { selectHomepageVideo } from "@/lib/cms/homepage-video";
import type { PublicCmsVideo } from "@/lib/cms/video-model";
import { listPublishedCmsVideos } from "@/lib/cms/videos";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";

import styles from "@/components/home/public-home.module.css";

export const dynamic = "force-dynamic";

function formatPublishedDate(value: string | null): string {
  if (!value) return "New release";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export default async function Home() {
  let videos: PublicCmsVideo[] = [];
  let videoLoadFailed = false;
  try { videos = await listPublishedCmsVideos(); } catch { videoLoadFailed = true; }

  const latestVideo = selectHomepageVideo(videos);
  const identity = latestVideo ? videoPlatformIdentities[latestVideo.platform] : null;
  const latestTitle = latestVideo?.title.trim() || "The next Brandon drop is coming soon";
  const staffState = await resolveStaffAccessState(undefined);
  const canEditHomepage = !staffState.developmentPreview && evaluateAdminAccess(staffState).allowed;
  const latestUrl = latestVideo?.video_url ?? "/videos";
  const latestProvider = identity?.label ?? "Video";
  const latestWatchLabel = identity?.watchLabel ?? "Open videos";
  const latestDisplayTitle = videoLoadFailed ? "Video feed unavailable" : latestTitle;
  const editorDefaults: HomepageEditorDefaults = {
    "hero-eyebrow": { text: "Live creator · Pattaya" }, "hero-heading": { text: "Brandon" }, "hero-heading-accent": { text: "Jamez" }, "hero-body": { text: "Livestreams, local perspective and unfiltered moments from life in Pattaya." },
    "portrait-image": { imageSrc: "/brandon-nightlife-hero-v3.png", alt: "Brandon Jamez in the Pattaya nightlife" }, "portrait-badge": { text: "BJ · Pattaya" },
    "latest-label": { text: "Latest drop" }, "latest-date": { text: latestVideo ? formatPublishedDate(latestVideo.published_at) : "Soon" }, "latest-media": { url: latestUrl }, "latest-provider": { text: latestProvider }, "latest-title": { text: latestDisplayTitle }, "latest-intro": { text: "Find Brandon's newest videos, livestream highlights and fresh stories from Pattaya." }, "latest-watch": { text: `${latestWatchLabel} ↗`, url: latestUrl }, "latest-all": { text: "Browse all videos ↗", url: "/videos" },
    "guide-image": { imageSrc: "/pattaya-guide-map.png", alt: "Illustrated nightlife guide map of Pattaya" }, "guide-kicker": { text: "Pattaya guide" }, "guide-heading": { text: "Places worth knowing." }, "guide-body": { text: "Bars, restaurants, nightlife and local stops Brandon actually recommends." }, "guide-link": { text: "Open the guide ↗", url: "/guide" },
    "subscriber-kicker": { text: "Member area" }, "subscriber-heading": { text: "Raw. Unfiltered. After dark." }, "subscriber-body": { text: "Paid access to private videos, selected images, special events and exclusive Pattaya moments." }, "subscriber-link": { text: "Unlock member access", url: "/subscriber" },
  };

  return <HomepageEditor canEdit={canEditHomepage} defaults={editorDefaults}>
    <div className={styles.nightBackdrop}>
    <section className={styles.stage} aria-labelledby="homepage-title">
      <div className={styles.shell}><div className={styles.stageGrid}>
        <HomepageEditableSection id="hero-introduction">
        <div className={styles.identityBlock}>
          <HomepageLayoutItem id="hero-eyebrow"><p className={styles.eyebrow}><span aria-hidden="true" /><HomepageEditableText id="hero-eyebrow" defaultValue="Live creator · Pattaya" /></p></HomepageLayoutItem>
          <HomepageLayoutItem id="hero-heading"><div className={styles.identityLockup}>
            <div className={styles.heroEmblem} role="img" aria-label="Number one Boom Boom, all Pattaya">
              <span className={styles.heroEmblemInner} aria-hidden="true"><strong>#1</strong><b>Boom<br />Boom</b><small>All Pattaya</small></span>
            </div>
            <h1 id="homepage-title" className={styles.identityTitle}><HomepageEditableText id="hero-heading" defaultValue="Brandon" /> <HomepageEditableText id="hero-heading-accent" as="strong" defaultValue="Jamez" /></h1>
          </div></HomepageLayoutItem>
          <HomepageLayoutItem id="hero-body"><HomepageEditableText id="hero-body" as="p" className={styles.identityIntro} defaultValue="Livestreams, local perspective and unfiltered moments from life in Pattaya." /></HomepageLayoutItem>
        </div>
        </HomepageEditableSection>

        <HomepageEditableSection id="portrait">
        <div className={styles.portraitBlock}><div className={styles.portraitFrame}>
          <HomepageEditableImage id="portrait-image" defaultSrc="/brandon-nightlife-hero-v3.png" defaultAlt="Brandon Jamez in the Pattaya nightlife" priority sizes="100vw" className={styles.portraitImage} />
          <HomepageEditableText id="portrait-badge" defaultValue="BJ · Pattaya" className={styles.portraitBadge} />
        </div></div>
        </HomepageEditableSection>

      </div></div>
    </section>

    <HomepageEditableSection id="latest-drop">
    <section className={styles.latestSection} aria-label="Latest drop">
      <div className={styles.latestAtmosphere} aria-hidden="true"><Image src="/latest-drop-media-wall-bg.png" alt="" fill sizes="100vw" className={styles.latestAtmosphereImage} /></div>
      <div className={styles.shell}>
      <article className={styles.videoBlock} aria-labelledby="stage-latest-title">
        <div className={styles.videoTopline}><HomepageLayoutItem id="latest-label" className={styles.videoTopline}><HomepageEditableText id="latest-label" defaultValue="Latest drop" /></HomepageLayoutItem><HomepageLayoutItem id="latest-date" className={styles.videoTopline}><HomepageEditableText id="latest-date" defaultValue={latestVideo ? formatPublishedDate(latestVideo.published_at) : "Soon"} /></HomepageLayoutItem></div>
        {latestVideo && identity ? <>
          <HomepageLayoutItem id="latest-media"><HomepageEditableMedia id="latest-media" title={latestTitle} platform={latestVideo.platform} defaultUrl={latestVideo.video_url} sizes="(max-width: 720px) 100vw, 34rem" className={styles.stageVideoMedia} /></HomepageLayoutItem>
          <div className={styles.stageVideoCopy}><HomepageLayoutItem id="latest-provider" className={styles.stageVideoCopy}><HomepageEditableProviderBadge id="latest-provider" platform={latestVideo.platform} defaultLabel={identity.label} /></HomepageLayoutItem><HomepageLayoutItem id="latest-title" className={styles.stageVideoCopy}><HomepageEditableText id="latest-title" as="h2" defaultValue={latestTitle} /></HomepageLayoutItem><HomepageLayoutItem id="latest-intro"><HomepageEditableText id="latest-intro" as="p" className={styles.latestDescription} defaultValue="Find Brandon's newest videos, livestream highlights and fresh stories from Pattaya." /></HomepageLayoutItem><div className={styles.latestLinks}><HomepageLayoutItem id="latest-watch"><HomepageEditableLink id="latest-watch" defaultText={`${identity.watchLabel} ↗`} defaultUrl={latestVideo.video_url} external platform={latestVideo.platform} className={styles.textAction} /></HomepageLayoutItem><HomepageLayoutItem id="latest-all"><HomepageEditableLink id="latest-all" defaultText="Browse all videos ↗" defaultUrl="/videos" className={styles.allVideosLink} /></HomepageLayoutItem></div></div>
        </> : <div className={styles.stageVideoEmpty} role={videoLoadFailed ? "alert" : undefined}><HomepageLayoutItem id="latest-title" className={styles.stageVideoEmpty}><HomepageEditableText id="latest-title" as="h2" defaultValue={latestDisplayTitle} /></HomepageLayoutItem><HomepageLayoutItem id="latest-watch" className={styles.stageVideoEmpty}><HomepageEditableLink id="latest-watch" defaultText="Open videos ↗" defaultUrl="/videos" className={styles.textAction} /></HomepageLayoutItem></div>}
      </article>
      </div>
    </section>
    </HomepageEditableSection>
    </div>

    <HomepageEditableSection id="featured-content">
    <section className={styles.featureSplit}><div className={`${styles.shell} ${styles.featureGrid}`}>
      <article className={styles.guideFeature}><div className={styles.featureImageWrap}><HomepageEditableImage id="guide-image" defaultSrc="/pattaya-guide-map.png" defaultAlt="Illustrated nightlife guide map of Pattaya" sizes="(max-width: 720px) 100vw, 44rem" className={styles.featureImage} /><span>Pattaya map</span></div><div className={styles.featureCopy}><HomepageLayoutItem id="guide-kicker"><HomepageEditableText id="guide-kicker" as="p" className={styles.featureKicker} defaultValue="Pattaya guide" /></HomepageLayoutItem><HomepageLayoutItem id="guide-heading"><HomepageEditableText id="guide-heading" as="h2" defaultValue="Places worth knowing." /></HomepageLayoutItem><HomepageLayoutItem id="guide-body"><HomepageEditableText id="guide-body" as="p" defaultValue="Bars, restaurants, nightlife and local stops Brandon actually recommends." /></HomepageLayoutItem><HomepageLayoutItem id="guide-link"><HomepageEditableLink id="guide-link" defaultText="Open the guide ↗" defaultUrl="/guide" className={styles.textAction} /></HomepageLayoutItem></div></article>
      <aside className={styles.memberFeature} aria-labelledby="member-feature-title"><span className={styles.ageBadge} aria-label="Adults only">18+</span><HomepageLayoutItem id="subscriber-kicker"><HomepageEditableText id="subscriber-kicker" as="p" className={styles.featureKicker} defaultValue="Member area" /></HomepageLayoutItem><HomepageLayoutItem id="subscriber-heading"><HomepageEditableText id="subscriber-heading" as="h2" defaultValue="Raw. Unfiltered. After dark." defaultChildren={<>Raw.<br />Unfiltered.<br />After dark.</>} /></HomepageLayoutItem><HomepageLayoutItem id="subscriber-body"><HomepageEditableText id="subscriber-body" as="p" defaultValue="Paid access to private videos, selected images, special events and exclusive Pattaya moments." /></HomepageLayoutItem><div className={styles.memberMeta}><span>Raw video</span><span>Private images</span><span>Special events</span></div><HomepageLayoutItem id="subscriber-link"><HomepageEditableLink id="subscriber-link" defaultText="Unlock member access" defaultUrl="/subscriber" className={styles.primaryAction} /></HomepageLayoutItem><p className={styles.memberAccessNote}>Paid membership · Age verification required</p></aside>
    </div></section>
    </HomepageEditableSection>
  </HomepageEditor>;
}
