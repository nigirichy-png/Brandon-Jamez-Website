export type Role =
  | "visitor"
  | "subscriber"
  | "moderator"
  | "content_manager"
  | "admin";

export type AccessState = {
  authenticated: boolean;
  ageVerified: boolean;
  subscriptionActive: boolean;
  accountBlocked: boolean;
  roles: Role[];
};

export type VideoAccessLevel = "public" | "subscriber";
export type ThumbnailVariant = "magenta" | "cyan" | "amber" | "violet";

export type PublicVideo = {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  publishedAt: string;
  thumbnailVariant: ThumbnailVariant;
  accessLevel: "public";
};

export type SubscriberVideo = {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  thumbnailVariant: ThumbnailVariant;
  accessLevel: "subscriber";
  availability: "development-metadata-only";
};

export type EventStatus = "announced" | "limited" | "coming-soon";

export type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  status: EventStatus;
};

export type SocialLink = {
  id: string;
  label: string;
  handle: string;
  href: string | null;
  status: "placeholder";
};

export type LiveStatus = {
  status: "live" | "offline" | "scheduled";
  title: string;
  message: string;
  updatedAt: string;
  scheduledFor?: string;
  destinationConfigured: boolean;
};
