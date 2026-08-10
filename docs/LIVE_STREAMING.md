# Live streaming boundary

`/live` never accepts, stores, or proxies video bytes. YouTube playback uses a direct `youtube-nocookie.com` iframe. A future OBS/Streamlabs path must use an external streaming provider for ingest, transcoding, origin, and CDN delivery. The website stores only a provider key and opaque playback reference.

The provider adapter must turn that reference into direct HLS/LL-HLS/WebRTC playback in the browser. Ingest credentials, signed manifests, and provider API tokens must remain server-side and must not be stored in `live_sessions`.

The Bunny Stream VOD foundation in `docs/BUNNY_STREAM.md` provides a reusable server-only configuration boundary, HLS token signer, and `hls.js` player. It does not create a Bunny live input or OBS stream key. A later live adapter may reuse those playback pieces while keeping live ingest credentials outside Supabase and the browser.

Website chat uses one bounded initial RPC read and Supabase Realtime fan-out. It does not poll per viewer. The public Realtime row contains an opaque author key rather than an auth user ID. Authenticated, unblocked accounts can write only while the current session is live; database-enforced flood limits and staff restrictions apply.

YouTube moderation uses the tested Moderation Hub `streamList` gRPC manager as a separate long-running Node service (`services/youtube-live`). The Next.js route authenticates every request with the website's Supabase session and forwards only signed, short-lived service requests. The service maintains one shared upstream stream per active YouTube chat, while moderator browsers read its bounded cache. It includes the Hub's reconnect, continuation, circuit-breaker, rate-limit and quota-backoff behavior. Do not deploy this process as a request-scoped Vercel Function.

For local development, the service first reads the Website `.env.local`. If no explicit YouTube refresh token is present, it loads the sibling Moderation Hub `.env` and decrypts its existing `.local/oauth-auth.json` read-only with the Hub's tested AES-GCM routine. It never copies, prints, rewrites, or deletes that token store. Run `npm run check:youtube-live` before starting both processes.

Local start order:

1. Run `npm run check:youtube-live`. In development, both processes share a generated secret from the Git-ignored `.local/youtube-live-service.key`. An explicit `LIVE_MODERATION_SERVICE_SECRET` overrides it and remains mandatory in production.
2. Ensure migration 013 is present in the configured Supabase project and configure a current YouTube session as an administrator.
3. Run `npm run dev:youtube-live` in one terminal.
4. Run `npm run dev` in a second terminal.

If `npm run check:youtube-live` reports that the Google OAuth refresh grant is unavailable, start the original Moderation Hub and reconnect Google there. The Website service will use the refreshed encrypted store on its next start.

## Temporary public Hub preview

`/moderation-hub` reproduces the Moderation Hub workspace as a public pre-launch preview. Anonymous visitors receive the read-only player/chat path. An authenticated active administrator is upgraded to the existing staff HMAC endpoint with YouTube chat send and moderation; an authenticated active moderator receives moderation but not send. Both staff roles may locally load another YouTube URL or video ID for monitoring without changing `live_sessions` or the public website source. It is enabled automatically only in local development. A hosted preview requires `MODERATION_HUB_PUBLIC_PREVIEW_ENABLED=true`; remove or set that value to `false` for launch. The anonymous API exposes only `GET /api/live/youtube`, accepts only the YouTube video configured as the current Supabase live session, and has no send, moderation, configuration, or release endpoint. `/mod/live` remains the authenticated staff workspace.

Before production:

- choose a legal adult-content-compatible live provider and obtain explicit approval for the intended material;
- implement its direct player adapter and, if required, a short-lived playback-token endpoint that returns credentials but never media;
- configure OBS/Streamlabs ingest directly against that provider;
- size/test the Supabase Realtime plan and database connection limits with at least 200 subscribed clients;
- configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `YOUTUBE_MODERATION_REFRESH_TOKEN` with `youtube.force-ssl` for the shared channel moderation identity;
- deploy `npm run start:youtube-live` on a long-running Node runtime and configure the same strong `LIVE_MODERATION_SERVICE_SECRET` there and in the website; use `LIVE_MODERATION_HOST=0.0.0.0` only when the hosting platform requires a public bind and terminate access through HTTPS/firewall rules;
- apply and review migration 013 in the intended Supabase environment.
