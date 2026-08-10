export type LivePlayerDrift = { behind: boolean; reliable: boolean; lagSeconds: number | null; liveEdgeConfirmed: boolean; syncState: "ready" | "behind" | "syncing" | "attention" | "paused" | "checking" };
export type LivePlayerSession = { destroy(): void; goLive(): boolean; recordUserInteraction(type: "keyboard-k" | "keyboard-space" | "mouse" | "pointer" | "touch"): boolean };
export function loadYouTubeIframeApi(): Promise<unknown>;
export function createYouTubePlayerSession(options: { YT: unknown; iframe: HTMLIFrameElement; onReadyChange?: (ready: boolean) => void; onDriftChange?: (drift: LivePlayerDrift) => void; controllerOptions?: { development?: boolean } }): LivePlayerSession;
