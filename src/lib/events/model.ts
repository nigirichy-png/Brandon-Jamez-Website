export const eventStatuses = ["draft", "published", "archived"] as const;
export type CmsEventStatus = (typeof eventStatuses)[number];

export type CmsEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  status: CmsEventStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicCmsEvent = Omit<CmsEvent, "status" | "created_at">;
