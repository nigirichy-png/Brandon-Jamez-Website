"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/ui/brand-mark";
import { PattayaTime } from "@/components/ui/pattaya-time";
import { VideoPlatformIcon } from "@/components/video/video-platform-identity";
import { creatorSocialLinks } from "@/data/public-links";

import styles from "./footer.module.css";

const links = [{ href: "/", label: "Home", external: false }, { href: "/guide", label: "Pattaya Guide", external: false }, { href: "/videos", label: "Videos", external: false }, { href: "/account", label: "Account", external: false }] as const;

type SocialKey = (typeof creatorSocialLinks)[number]["key"];

function SocialIcon({ platform }: { platform: SocialKey }) {
  if (platform === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.4 8.4V6.9c0-.7.5-1.1 1.2-1.1h1.7V3h-2.5c-2.7 0-4.1 1.6-4.1 4v1.4H8.6v3h2.1V21h3.2v-9.6h2.6l.4-3h-3.1Z" /></svg>;
  if (platform === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><linearGradient id="footer-instagram-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse"><stop stopColor="#ffb13b" /><stop offset=".48" stopColor="#f72585" /><stop offset="1" stopColor="#7b47ff" /></linearGradient></defs><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="url(#footer-instagram-gradient)" strokeWidth="2.2" /><circle cx="12" cy="12" r="3.7" fill="none" stroke="url(#footer-instagram-gradient)" strokeWidth="2.2" /><circle cx="17.4" cy="6.7" r="1.2" fill="#f72585" /></svg>;
  return <VideoPlatformIcon platform={platform} />;
}

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/guide") return null;

  return <footer className={styles.footer}>
    <div className={styles.shell}>
      <div className={styles.topRow}>
        <div className={styles.intro}>
          <div className={styles.brandRow}><span className={styles.brand}><BrandMark /></span><span className={styles.location}><i aria-hidden="true" /><PattayaTime showUtcOffset /></span></div>
          <p>Livestreams, local perspective and real moments from Pattaya.</p>
        </div>
        <nav className={styles.navigation} aria-label="Footer navigation">{links.map((link) => link.external ? <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`}>{link.label}<span aria-hidden="true">↗</span></a> : <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      </div>

      <div className={styles.bottomRow}>
        <div className={styles.socials} aria-label="Brandon Jamez social media">{creatorSocialLinks.map((social) => <a key={social.key} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`} className={`${styles.socialLink} ${styles[social.key]}`}><span className={styles.socialIcon}><SocialIcon platform={social.key} /></span><span>{social.label}</span><b aria-hidden="true">↗</b></a>)}</div>
        <p className={styles.copyright}>© 2026 Brandon Jamez</p>
      </div>
    </div>
  </footer>;
}
