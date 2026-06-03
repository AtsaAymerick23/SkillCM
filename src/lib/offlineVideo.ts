import { get, set, del, keys } from "idb-keyval";

const KEY = (lessonId: string) => `video:${lessonId}`;
const META_KEY = "videoMeta:v1";

export type VideoMeta = Record<string, { size: number; savedAt: number; mime: string }>;

const getMeta = async (): Promise<VideoMeta> => (await get(META_KEY)) ?? {};
const setMeta = async (m: VideoMeta) => set(META_KEY, m);

export async function isVideoCached(lessonId: string) {
  const m = await getMeta();
  return !!m[lessonId];
}

export async function getCachedVideoUrl(lessonId: string): Promise<string | null> {
  const blob = (await get(KEY(lessonId))) as Blob | undefined;
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function downloadVideo(
  lessonId: string,
  url: string,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const resp = await fetch(url, { mode: "cors" });
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const total = Number(resp.headers.get("content-length") || 0);
  if (!resp.body || !total) {
    const blob = await resp.blob();
    onProgress?.(100);
    await persist(lessonId, blob);
    return blob;
  }
  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress?.(Math.round((received / total) * 100));
    }
  }
  const blob = new Blob(chunks as BlobPart[], {
    type: resp.headers.get("content-type") || "video/mp4",
  });
  await persist(lessonId, blob);
  return blob;
}

async function persist(lessonId: string, blob: Blob) {
  await set(KEY(lessonId), blob);
  const meta = await getMeta();
  meta[lessonId] = { size: blob.size, savedAt: Date.now(), mime: blob.type };
  await setMeta(meta);
}

export async function removeCachedVideo(lessonId: string) {
  await del(KEY(lessonId));
  const m = await getMeta();
  delete m[lessonId];
  await setMeta(m);
}

export async function listCachedVideos() {
  return await getMeta();
}

export async function totalCachedSize() {
  const m = await getMeta();
  return Object.values(m).reduce((s, v) => s + (v.size || 0), 0);
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

// Cleanup orphans (best-effort)
export async function cleanupOrphans() {
  const meta = await getMeta();
  const allKeys = await keys();
  for (const k of allKeys) {
    if (typeof k === "string" && k.startsWith("video:")) {
      const lessonId = k.slice("video:".length);
      if (!meta[lessonId]) await del(k);
    }
  }
}
