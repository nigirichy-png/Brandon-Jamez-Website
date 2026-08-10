# Bunny Stream VOD

Large subscriber videos use Bunny Stream in addition to the existing private Supabase Storage media. Supabase Storage remains responsible for post images and MP4/WebM clips up to 10 MB. Large source files never pass through Next.js, Vercel, or Supabase.

## One-time Bunny dashboard setup

1. Create one **Stream Video Library** for website VOD. Adult content must remain lawful and compliant with Bunny's current Acceptable Use Policy.
2. In the library **Encoding** settings, enable the required HLS resolutions. Keep the original only if operationally required because it adds storage usage.
3. Optionally create one collection for subscriber VOD and copy its collection GUID.
4. In **Stream > Library > API**, copy the numeric Library ID, the write API key, and the Read-Only API key. The Read-Only API key signs webhooks; both keys are secrets.
5. Open the Pull Zone linked to the Stream library. Copy its default CDN hostname. Under **Security**, enable Advanced Token Authentication and copy the URL Token Authentication Key. Do not enable IP validation; it is unreliable for mobile networks and VPN changes.
6. In the Stream library security settings, allow the production website domains. Add localhost only for a local playback test if Bunny requires it. Do not include `https://` in Bunny's allowed-domain entries.
7. Configure the library webhook URL as `https://<production-domain>/api/webhooks/bunny/stream`. Localhost cannot receive Bunny webhooks; use an explicitly approved temporary HTTPS tunnel only for a controlled local webhook test.

Place the values only in `.env.local` and later in encrypted Vercel environment settings:

```dotenv
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=
BUNNY_STREAM_READ_ONLY_API_KEY=
BUNNY_STREAM_CDN_HOSTNAME=
BUNNY_STREAM_CDN_TOKEN_KEY=
BUNNY_STREAM_COLLECTION_ID=
BUNNY_STREAM_TUS_AUTH_TTL_SECONDS=86400
BUNNY_STREAM_PLAYBACK_TOKEN_TTL_SECONDS=7200
```

Never prefix these names with `NEXT_PUBLIC_`, store them in Supabase rows, paste them into CMS fields, or commit them.

## Request flow

1. An active administrator starts an upload from an existing subscriber post.
2. The website creates an empty Bunny video through the server-only Stream API, records only its opaque UUID through an admin-only audited RPC, and returns a video-scoped TUS signature.
3. `tus-js-client` uploads the file directly from the browser to Bunny in resumable 50 MB chunks.
4. Bunny sends signed processing-status webhooks. The route verifies the exact raw body with the library Read-Only API key before a service-role-only RPC updates local status.
5. Subscriber DTOs expose only `has_bunny_video`; they never contain the Bunny UUID, CDN hostname, token key, manifest URL, or upload signature.
6. The same-origin playback route repeats subscriber entitlement or active-admin preview authorization, resolves the Bunny UUID with a service-role-only RPC, and produces a path-scoped expiring HLS URL.
7. `hls.js` plays the manifest while Safari-compatible browsers may use native HLS. Segments go directly from Bunny CDN to the browser.

## Live-provider boundary

The Bunny configuration, token signer, and HLS player are isolated under `src/lib/bunny` and `src/components/video`. A future OBS/Streamlabs integration can add a Bunny live-input adapter that maps the existing provider-neutral `live_sessions.direct_playback_reference` to a signed HLS/LL-HLS descriptor. Stream keys must remain only in Bunny/OBS and must never be stored in `live_sessions` or sent to the browser.

Migration `202608070014_bunny_stream_vod.sql` is local only until explicitly reviewed and applied. It keeps provider references in a private table, enforces active-admin mutations, restricts status updates and playback resolution to `service_role`, preserves optimistic versions, and audits upload start/removal.
