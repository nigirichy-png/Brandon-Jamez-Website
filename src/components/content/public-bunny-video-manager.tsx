"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";

import { BUNNY_MAX_UPLOAD_BYTES, BUNNY_VIDEO_MIME_TYPES } from "@/lib/bunny/validation";
import type { AdminPublicBunnyVideo } from "@/lib/public-bunny-video/model";

type UploadCredentials = { endpoint: string; videoId: string; libraryId: string; authorizationExpire: number; authorizationSignature: string };
const field = "mt-1.5 min-h-10 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:font-bold file:text-black";

function formatBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB"]; let amount = value; let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) { amount /= 1024; unit += 1; }
  return `${amount.toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`;
}

function validCredentials(value: unknown): value is UploadCredentials {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return item.endpoint === "https://video.bunnycdn.com/tusupload" && typeof item.videoId === "string"
    && typeof item.libraryId === "string" && typeof item.authorizationExpire === "number" && typeof item.authorizationSignature === "string";
}

export function PublicBunnyVideoManager({ videos }: { videos: AdminPublicBunnyVideo[] }) {
  const router = useRouter();
  const uploadRef = useRef<tus.Upload | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [canResume, setCanResume] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function startUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("bunnyVideo");
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    setMessage(""); setError("");
    if (!(file instanceof File) || !BUNNY_VIDEO_MIME_TYPES.has(file.type) || file.size < 1 || file.size > BUNNY_MAX_UPLOAD_BYTES) {
      setError("Choose a supported video file no larger than 30 GB."); return;
    }
    if (!title || title.length > 120 || description.length > 500 || category.length > 60) {
      setError("Enter a title up to 120 characters and keep the description/category within their limits."); return;
    }
    setBusy(true); setCanResume(false); setProgress(0);
    try {
      const response = await fetch("/api/content/bunny/videos/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, fileName: file.name, fileSize: file.size, mimeType: file.type }),
      });
      const credentials: unknown = await response.json().catch(() => null);
      if (!response.ok || !validCredentials(credentials)) throw new Error("Bunny upload could not be started.");
      const upload = new tus.Upload(file, {
        endpoint: credentials.endpoint,
        chunkSize: 50 * 1024 * 1024,
        retryDelays: [0, 3_000, 5_000, 10_000, 20_000, 60_000],
        headers: { AuthorizationSignature: credentials.authorizationSignature, AuthorizationExpire: String(credentials.authorizationExpire), VideoId: credentials.videoId, LibraryId: credentials.libraryId },
        metadata: { filetype: file.type, title },
        onProgress: (uploaded, total) => setProgress(total > 0 ? Math.round((uploaded / total) * 100) : 0),
        onError: () => { setBusy(false); setCanResume(true); setError("Upload interrupted. Resume it here or select the same file after reloading."); },
        onSuccess: () => { setBusy(false); setCanResume(false); setProgress(100); setMessage("Upload complete. Bunny is now processing the streaming versions."); router.refresh(); },
      });
      uploadRef.current = upload;
      const previous = await upload.findPreviousUploads();
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    } catch (uploadError) {
      setBusy(false);
      setError(uploadError instanceof Error ? uploadError.message : "Bunny upload could not be started.");
    }
  }

  async function updateVideo(event: React.FormEvent<HTMLFormElement>, video: AdminPublicBunnyVideo) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    const form = new FormData(event.currentTarget);
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const intent = submitter instanceof HTMLButtonElement ? submitter.value : "keep";
    const publish = intent === "publish" || (intent === "keep" && video.publication_status === "published");
    try {
      const response = await fetch(`/api/content/bunny/videos/${video.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: video.updated_at, title: String(form.get("title") ?? ""), description: String(form.get("description") ?? ""), category: String(form.get("category") ?? ""), publish }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error === "public_bunny_video_not_ready" ? "Bunny has not finished processing this video yet." : response.status === 409 ? "This video changed. Refresh and try again." : "The video could not be saved.");
      setMessage(intent === "keep" ? "Video changes saved." : publish ? "Video saved and published publicly." : "Video returned to draft.");
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "The video could not be saved.");
    } finally { setBusy(false); }
  }

  async function removeVideo(video: AdminPublicBunnyVideo) {
    if (!window.confirm(`Permanently remove “${video.title}” from Bunny and the public website?`)) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/content/bunny/videos/${video.id}?version=${encodeURIComponent(video.updated_at)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(response.status === 409 ? "This video changed. Refresh before removing it." : "The Bunny video could not be removed safely.");
      setMessage("Public Bunny video removed."); router.refresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "The Bunny video could not be removed safely.");
    } finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.025] p-5 sm:p-6" aria-labelledby="public-bunny-video-title">
    <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-300">Direct upload</p><h2 id="public-bunny-video-title" className="font-display mt-2 text-2xl font-bold text-white">Upload a public video to Bunny</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">The file uploads directly to Bunny and starts as a draft. Publish it after Bunny reports that streaming versions are ready.</p></div>
    <form className="mt-5 grid gap-3" onSubmit={startUpload}>
      <label className="text-sm font-bold text-zinc-200">Title<input className={field} name="title" required maxLength={120} /></label>
      <label className="text-sm font-bold text-zinc-200">Short description (optional)<textarea className={field} name="description" maxLength={500} rows={2} /></label>
      <label className="text-sm font-bold text-zinc-200">Category (optional)<input className={field} name="category" maxLength={60} placeholder="Videos, Shorts or Clips" /></label>
      <label className="text-sm font-bold text-zinc-200">Video file<input className={field} name="bunnyVideo" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,video/mpeg,video/mp2t" required disabled={busy} /></label>
      <p className="text-xs leading-5 text-zinc-500">Up to 30 GB. The resumable upload goes from this browser directly to Bunny.</p>
      <div className="flex flex-wrap gap-2.5"><button disabled={busy} className="min-h-11 rounded-xl border border-cyan-300/30 px-4 text-sm font-extrabold text-cyan-100 disabled:opacity-40">{busy ? `Uploading ${progress}%` : "Upload to Bunny"}</button>{busy ? <button type="button" onClick={() => void uploadRef.current?.abort().then(() => { setBusy(false); setCanResume(true); })} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-extrabold text-white">Pause upload</button> : null}</div>
      {busy ? <progress className="w-full" max={100} value={progress}>{progress}%</progress> : null}
      {!busy && canResume && progress < 100 ? <button type="button" onClick={() => { setBusy(true); setCanResume(false); uploadRef.current?.start(); }} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-extrabold text-white">Resume upload</button> : null}
    </form>
    <div className="mt-6 grid gap-3" aria-label="Public Bunny videos">{videos.length ? videos.map((video) => <article key={video.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
      <form onSubmit={(event) => void updateVideo(event, video)} className="grid gap-3">
        <div className="text-sm text-zinc-400"><strong className="text-zinc-200">{video.file_name}</strong> · {formatBytes(video.file_size)} · Bunny: {video.status} · Website: {video.publication_status}</div>
        <label className="text-sm font-bold text-zinc-200">Title<input className={field} name="title" defaultValue={video.title} required maxLength={120} /></label>
        <label className="text-sm font-bold text-zinc-200">Short description<textarea className={field} name="description" defaultValue={video.short_description ?? ""} maxLength={500} rows={2} /></label>
        <label className="text-sm font-bold text-zinc-200">Category<input className={field} name="category" defaultValue={video.category ?? ""} maxLength={60} /></label>
        <div className="flex flex-wrap gap-2.5"><button name="publication" value="keep" disabled={busy} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-extrabold text-white disabled:opacity-40">Save changes</button><button name="publication" value={video.publication_status === "published" ? "draft" : "publish"} disabled={busy || (video.status !== "ready" && video.publication_status !== "published")} className="min-h-11 rounded-xl border border-fuchsia-300/30 px-4 text-sm font-extrabold text-fuchsia-100 disabled:opacity-40">{video.publication_status === "published" ? "Return to draft" : "Publish publicly"}</button><button type="button" disabled={busy} onClick={() => void removeVideo(video)} className="min-h-11 rounded-xl border border-rose-300/30 px-4 text-sm font-extrabold text-rose-100 disabled:opacity-40">Remove video</button></div>
      </form>
    </article>) : <p className="text-sm text-zinc-500">No public Bunny uploads yet.</p>}</div>
    {message ? <p role="status" className="mt-3 text-sm text-emerald-200">{message}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p> : null}
  </section>;
}
