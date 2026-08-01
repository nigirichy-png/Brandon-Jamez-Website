import type {
  Event,
  LiveStatus,
  PublicVideo,
  SocialLink,
  SubscriberVideo,
} from "@/types";

/** Development-only mock content. Replace through reviewed server-side integrations. */
export const publicVideos: PublicVideo[] = [
  {
    id: "public-001",
    title: "Neon Nights: City Walk",
    description: "A fast-cut concept clip built to preview the future public video library.",
    category: "City Life",
    duration: "08:42",
    publishedAt: "July 18, 2026",
    thumbnailVariant: "magenta",
    accessLevel: "public",
  },
  {
    id: "public-002",
    title: "Behind the Weekend",
    description: "A development-only episode card for future behind-the-scenes stories.",
    category: "Behind the Scenes",
    duration: "12:15",
    publishedAt: "July 10, 2026",
    thumbnailVariant: "cyan",
    accessLevel: "public",
  },
  {
    id: "public-003",
    title: "One Minute in Pattaya",
    description: "A short-form placeholder celebrating pace, color, and local atmosphere.",
    category: "Shorts",
    duration: "01:00",
    publishedAt: "June 29, 2026",
    thumbnailVariant: "amber",
    accessLevel: "public",
  },
  {
    id: "public-004",
    title: "Studio Notes: Episode Zero",
    description: "A mock preview of the conversations and creative updates planned here.",
    category: "Updates",
    duration: "06:28",
    publishedAt: "June 14, 2026",
    thumbnailVariant: "violet",
    accessLevel: "public",
  },
];

/** Metadata only: no files, playback URLs, provider IDs, credentials, or tokens. */
export const subscriberVideos: SubscriberVideo[] = [
  {
    id: "subscriber-concept-001",
    title: "Subscriber Story: Concept One",
    description: "Metadata reserved for future professionally protected subscriber playback.",
    category: "Subscriber Preview",
    duration: "TBD",
    thumbnailVariant: "violet",
    accessLevel: "subscriber",
    availability: "development-metadata-only",
  },
  {
    id: "subscriber-concept-002",
    title: "Extended Cut: Concept Two",
    description: "A second metadata-only record with no underlying media attached.",
    category: "Extended Cut",
    duration: "TBD",
    thumbnailVariant: "magenta",
    accessLevel: "subscriber",
    availability: "development-metadata-only",
  },
];

export const upcomingEvents: Event[] = [
  {
    id: "event-001",
    title: "Brandon Jamez Live Q&A",
    description: "A mock event listing for a future public conversation and project update.",
    date: "August 22, 2026",
    time: "8:00 PM ICT",
    location: "Online — platform to be announced",
    status: "announced",
  },
  {
    id: "event-002",
    title: "Pattaya Creator Meetup",
    description: "A placeholder event concept. Details and venue are not confirmed.",
    date: "September 12, 2026",
    time: "6:30 PM ICT",
    location: "Pattaya — venue to be announced",
    status: "coming-soon",
  },
  {
    id: "event-003",
    title: "Season Preview Night",
    description: "A development-only preview card for the future events calendar.",
    date: "October 3, 2026",
    time: "7:00 PM ICT",
    location: "Online — platform to be announced",
    status: "limited",
  },
];

export const socialLinks: SocialLink[] = [
  { id: "social-youtube", label: "YouTube", handle: "Channel coming soon", href: null, status: "placeholder" },
  { id: "social-instagram", label: "Instagram", handle: "Profile coming soon", href: null, status: "placeholder" },
  { id: "social-tiktok", label: "TikTok", handle: "Profile coming soon", href: null, status: "placeholder" },
  { id: "social-x", label: "X", handle: "Profile coming soon", href: null, status: "placeholder" },
];

export const liveStatus: LiveStatus = {
  status: "scheduled",
  title: "The next live session is being planned",
  message: "Live streaming is not connected. Check back for an intentionally configured public destination.",
  updatedAt: "Development preview",
  scheduledFor: "Date to be announced",
  destinationConfigured: false,
};
