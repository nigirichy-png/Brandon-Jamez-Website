import type { LiveSession } from "./model";

export type DirectPlaybackDescriptor = { provider: string; reference: string };

/** Provider-neutral boundary. A future adapter turns this descriptor into a direct CDN player URL. */
export function getDirectPlaybackDescriptor(session: LiveSession): DirectPlaybackDescriptor | null {
  if (session.source !== "direct" || !session.directPlaybackProvider || !session.directPlaybackReference) return null;
  return { provider: session.directPlaybackProvider, reference: session.directPlaybackReference };
}

