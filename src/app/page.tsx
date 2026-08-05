import { HomepageEditableImage, HomepageEditableLink, HomepageEditableMedia, HomepageEditableProviderBadge, HomepageEditableSection, HomepageEditableText, HomepageEditor, HomepageLayoutItem } from "@/components/home/homepage-editor";
import type { HomepageEditorDefaults } from "@/components/home/homepage-editor-model";
import { videoPlatformIdentities } from "@/components/video/video-platform-identity";
import { creatorLinks } from "@/data/public-links";
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
  const pattayaTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Bangkok" }).format(new Date());
  const isLive = false;
  const staffState = await resolveStaffAccessState(undefined);
  const canEditHomepage = !staffState.developmentPreview && evaluateAdminAccess(staffState).allowed;
  const latestUrl = latestVideo?.video_url ?? "/videos";
  const latestProvider = identity?.label ?? "Video";
  const latestWatchLabel = identity?.watchLabel ?? "Open videos";
  const latestDisplayTitle = videoLoadFailed ? "Video feed unavailable" : latestTitle;
  const editorDefaults: HomepageEditorDefaults = {
    "hero-eyebrow": { text: "Live creator · Pattaya" }, "hero-heading": { text: "Brandon" }, "hero-heading-accent": { text: "Jamez" }, "hero-body": { text: "Livestreams, local perspective and unfiltered moments from life in Pattaya." },
    "hero-youtube": { text: "Watch on YouTube ↗", url: creatorLinks.youtube }, "hero-guide": { text: "Explore Pattaya ↗", url: creatorLinks.pattayaGuide },
    "portrait-image": { imageSrc: "/brandon-clean-portrait.png", alt: "Brandon Jamez wearing a white cap" }, "portrait-badge": { text: "BJ · Pattaya" },
    "latest-label": { text: "Latest drop" }, "latest-date": { text: latestVideo ? formatPublishedDate(latestVideo.published_at) : "Soon" }, "latest-media": { url: latestUrl }, "latest-provider": { text: latestProvider }, "latest-title": { text: latestDisplayTitle }, "latest-watch": { text: `${latestWatchLabel} ↗`, url: latestUrl },
    "status-label": { text: isLive ? "Live now" : "Off air" }, "status-time": { text: `${pattayaTime} ICT` }, "status-link": { text: "Open channel ↗", url: creatorLinks.youtube },
    "quick-guide": { text: "Pattaya Guide", description: "Places, food and nightlife", url: "/guide" }, "quick-videos": { text: "Videos", description: "Livestreams and highlights", url: "/videos" }, "quick-subscriber": { text: "Subscriber", description: "Private posts and media", url: "/subscriber" },
    "start-eyebrow": { text: "Start here" }, "start-heading": { text: "Watch. Explore. Get closer." }, "start-body": { text: "Three direct ways into Brandon's Pattaya—without making you hunt through the site." },
    "start-watch": { text: latestTitle, description: "Watch", url: "/videos" }, "start-guide": { text: "Brandon's Pattaya picks", description: "Explore", url: "/guide" }, "start-subscriber": { text: "Private posts and selected media", description: "Access", url: "/subscriber" },
    "guide-image": { imageSrc: "/brandon-throne.png", alt: "Brandon Jamez in Pattaya" }, "guide-kicker": { text: "Local guide" }, "guide-heading": { text: "Places worth knowing." }, "guide-body": { text: "Bars, restaurants, nightlife and local stops Brandon actually recommends." }, "guide-link": { text: "Open the guide ↗", url: "/guide" },
    "subscriber-kicker": { text: "Subscribers" }, "subscriber-heading": { text: "Private posts. Selected media." }, "subscriber-body": { text: "More from Brandon for active subscribers, kept simple and easy to access." }, "subscriber-link": { text: "Enter subscriber area", url: "/subscriber" },
  };

  return <HomepageEditor canEdit={canEditHomepage} defaults={editorDefaults}>
    <section className={styles.stage} aria-labelledby="homepage-title">
      <div className={styles.shell}><div className={styles.stageGrid}>
        <HomepageEditableSection id="hero-introduction">
        <div className={styles.identityBlock}>
          <HomepageLayoutItem id="hero-eyebrow"><p className={styles.eyebrow}><span aria-hidden="true" /><HomepageEditableText id="hero-eyebrow" defaultValue="Live creator · Pattaya" /></p></HomepageLayoutItem>
          <HomepageLayoutItem id="hero-heading"><h1 id="homepage-title" className={styles.identityTitle}><HomepageEditableText id="hero-heading" defaultValue="Brandon" /> <HomepageEditableText id="hero-heading-accent" as="strong" defaultValue="Jamez" /></h1></HomepageLayoutItem>
          <HomepageLayoutItem id="hero-body"><HomepageEditableText id="hero-body" as="p" className={styles.identityIntro} defaultValue="Livestreams, local perspective and unfiltered moments from life in Pattaya." /></HomepageLayoutItem>
          <div className={styles.primaryActions}>
            <HomepageLayoutItem id="hero-youtube"><HomepageEditableLink id="hero-youtube" defaultText="Watch on YouTube ↗" defaultUrl={creatorLinks.youtube} external className={styles.primaryAction} /></HomepageLayoutItem>
            <HomepageLayoutItem id="hero-guide"><HomepageEditableLink id="hero-guide" defaultText="Explore Pattaya ↗" defaultUrl={creatorLinks.pattayaGuide} external className={styles.secondaryAction} /></HomepageLayoutItem>
          </div>
        </div>
        </HomepageEditableSection>

        <HomepageEditableSection id="portrait">
        <div className={styles.portraitBlock}><div className={styles.portraitFrame}>
          <HomepageEditableImage id="portrait-image" defaultSrc="/brandon-clean-portrait.png" defaultAlt="Brandon Jamez wearing a white cap" priority sizes="(max-width: 720px) 62vw, 16rem" className={styles.portraitImage} />
          <HomepageEditableText id="portrait-badge" defaultValue="BJ · Pattaya" className={styles.portraitBadge} />
        </div></div>
        </HomepageEditableSection>

        <HomepageEditableSection id="latest-drop">
        <article className={styles.videoBlock} aria-labelledby="stage-latest-title">
          <div className={styles.videoTopline}><HomepageLayoutItem id="latest-label" className={styles.videoTopline}><HomepageEditableText id="latest-label" defaultValue="Latest drop" /></HomepageLayoutItem><HomepageLayoutItem id="latest-date" className={styles.videoTopline}><HomepageEditableText id="latest-date" defaultValue={latestVideo ? formatPublishedDate(latestVideo.published_at) : "Soon"} /></HomepageLayoutItem></div>
          {latestVideo && identity ? <>
            <HomepageLayoutItem id="latest-media"><HomepageEditableMedia id="latest-media" title={latestTitle} platform={latestVideo.platform} defaultUrl={latestVideo.video_url} sizes="(max-width: 720px) 100vw, 22rem" className={styles.stageVideoMedia} /></HomepageLayoutItem>
            <div className={styles.stageVideoCopy}><HomepageLayoutItem id="latest-provider" className={styles.stageVideoCopy}><HomepageEditableProviderBadge id="latest-provider" platform={latestVideo.platform} defaultLabel={identity.label} /></HomepageLayoutItem><HomepageLayoutItem id="latest-title" className={styles.stageVideoCopy}><HomepageEditableText id="latest-title" as="h2" defaultValue={latestTitle} /></HomepageLayoutItem><HomepageLayoutItem id="latest-watch" className={styles.stageVideoCopy}><HomepageEditableLink id="latest-watch" defaultText={`${identity.watchLabel} ↗`} defaultUrl={latestVideo.video_url} external platform={latestVideo.platform} className={styles.textAction} /></HomepageLayoutItem></div>
          </> : <div className={styles.stageVideoEmpty} role={videoLoadFailed ? "alert" : undefined}><HomepageLayoutItem id="latest-title" className={styles.stageVideoEmpty}><HomepageEditableText id="latest-title" as="h2" defaultValue={latestDisplayTitle} /></HomepageLayoutItem><HomepageLayoutItem id="latest-watch" className={styles.stageVideoEmpty}><HomepageEditableLink id="latest-watch" defaultText="Open videos ↗" defaultUrl="/videos" className={styles.textAction} /></HomepageLayoutItem></div>}
        </article>
        </HomepageEditableSection>

        <HomepageEditableSection id="live-status">
        <div className={styles.statusBlock} aria-label="Channel status"><HomepageLayoutItem id="status-label" className={styles.statusBlock}><div><span className={`${styles.statusDot} ${isLive ? styles.statusDotLive : ""}`} aria-hidden="true" /><HomepageEditableText id="status-label" as="strong" defaultValue={isLive ? "Live now" : "Off air"} /></div></HomepageLayoutItem><HomepageLayoutItem id="status-time" className={styles.statusBlock}><HomepageEditableText id="status-time" as="p" defaultValue={`${pattayaTime} ICT`} /></HomepageLayoutItem><HomepageLayoutItem id="status-link" className={styles.statusBlock}><HomepageEditableLink id="status-link" defaultText="Open channel ↗" defaultUrl={creatorLinks.youtube} external /></HomepageLayoutItem></div>
        </HomepageEditableSection>

        <HomepageEditableSection id="quick-navigation">
        <nav className={styles.platformLinks} aria-label="Explore Brandon Jamez">
          <HomepageLayoutItem id="quick-guide" className={styles.platformLinks}><HomepageEditableLink id="quick-guide" variant="quick" index="01" defaultText="Pattaya Guide" defaultDescription="Places, food and nightlife" defaultUrl="/guide" /></HomepageLayoutItem>
          <HomepageLayoutItem id="quick-videos" className={styles.platformLinks}><HomepageEditableLink id="quick-videos" variant="quick" index="02" defaultText="Videos" defaultDescription="Livestreams and highlights" defaultUrl="/videos" /></HomepageLayoutItem>
          <HomepageLayoutItem id="quick-subscriber" className={styles.platformLinks}><HomepageEditableLink id="quick-subscriber" variant="quick" index="03" defaultText="Subscriber" defaultDescription="Private posts and media" defaultUrl="/subscriber" /></HomepageLayoutItem>
        </nav>
        </HomepageEditableSection>
      </div></div>
    </section>

    <section className={styles.contentBand} aria-labelledby="home-now-title"><div className={`${styles.shell} ${styles.nowLayout}`}>
      <HomepageEditableSection id="start-introduction">
      <div className={styles.nowHeading}><HomepageLayoutItem id="start-eyebrow" className={styles.nowHeading}><p className={styles.eyebrow}><span aria-hidden="true" /><HomepageEditableText id="start-eyebrow" defaultValue="Start here" /></p></HomepageLayoutItem><HomepageLayoutItem id="start-heading" className={styles.nowHeading}><HomepageEditableText id="start-heading" as="h2" defaultValue="Watch. Explore. Get closer." /></HomepageLayoutItem><HomepageLayoutItem id="start-body" className={styles.nowHeading}><HomepageEditableText id="start-body" as="p" defaultValue="Three direct ways into Brandon's Pattaya—without making you hunt through the site." /></HomepageLayoutItem></div>
      </HomepageEditableSection>
      <HomepageEditableSection id="start-links">
      <div className={styles.nowRail}>
        <HomepageLayoutItem id="start-watch"><HomepageEditableLink id="start-watch" variant="rail" index="01" kicker="Watch" numberClass={styles.railNumber} defaultText={latestTitle} defaultDescription="Watch" defaultUrl="/videos" className={styles.railItem} /></HomepageLayoutItem>
        <HomepageLayoutItem id="start-guide"><HomepageEditableLink id="start-guide" variant="rail" index="02" kicker="Explore" numberClass={styles.railNumber} defaultText="Brandon's Pattaya picks" defaultDescription="Explore" defaultUrl="/guide" className={styles.railItem} /></HomepageLayoutItem>
        <HomepageLayoutItem id="start-subscriber"><HomepageEditableLink id="start-subscriber" variant="rail" index="03" kicker="Access" numberClass={styles.railNumber} defaultText="Private posts and selected media" defaultDescription="Access" defaultUrl="/subscriber" className={styles.railItem} /></HomepageLayoutItem>
      </div>
      </HomepageEditableSection>
    </div></section>

    <HomepageEditableSection id="featured-content">
    <section className={styles.featureSplit}><div className={`${styles.shell} ${styles.featureGrid}`}>
      <article className={styles.guideFeature}><div className={styles.featureImageWrap}><HomepageEditableImage id="guide-image" defaultSrc="/brandon-throne.png" defaultAlt="Brandon Jamez in Pattaya" sizes="(max-width: 720px) 100vw, 32rem" className={styles.featureImage} /><span>Central Pattaya</span></div><div className={styles.featureCopy}><HomepageLayoutItem id="guide-kicker"><HomepageEditableText id="guide-kicker" as="p" className={styles.featureKicker} defaultValue="Local guide" /></HomepageLayoutItem><HomepageLayoutItem id="guide-heading"><HomepageEditableText id="guide-heading" as="h2" defaultValue="Places worth knowing." /></HomepageLayoutItem><HomepageLayoutItem id="guide-body"><HomepageEditableText id="guide-body" as="p" defaultValue="Bars, restaurants, nightlife and local stops Brandon actually recommends." /></HomepageLayoutItem><HomepageLayoutItem id="guide-link"><HomepageEditableLink id="guide-link" defaultText="Open the guide ↗" defaultUrl="/guide" className={styles.textAction} /></HomepageLayoutItem></div></article>
      <aside className={styles.memberFeature} aria-labelledby="member-feature-title"><HomepageLayoutItem id="subscriber-kicker"><HomepageEditableText id="subscriber-kicker" as="p" className={styles.featureKicker} defaultValue="Subscribers" /></HomepageLayoutItem><HomepageLayoutItem id="subscriber-heading"><HomepageEditableText id="subscriber-heading" as="h2" defaultValue="Private posts. Selected media." defaultChildren={<>Private posts.<br />Selected media.</>} /></HomepageLayoutItem><HomepageLayoutItem id="subscriber-body"><HomepageEditableText id="subscriber-body" as="p" defaultValue="More from Brandon for active subscribers, kept simple and easy to access." /></HomepageLayoutItem><div className={styles.memberMeta}><span>Posts</span><span>Images</span><span>Media</span></div><HomepageLayoutItem id="subscriber-link"><HomepageEditableLink id="subscriber-link" defaultText="Enter subscriber area" defaultUrl="/subscriber" className={styles.primaryAction} /></HomepageLayoutItem></aside>
    </div></section>
    </HomepageEditableSection>
  </HomepageEditor>;
}
