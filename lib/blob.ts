import { put, list, del } from "@vercel/blob";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";

const PREFIX = "iram/";
const DATA_DIR = join(process.cwd(), "data");
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

function localPath(key: string): string {
  return join(DATA_DIR, key.replace(PREFIX, ""));
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const fullKey = key.startsWith(PREFIX) ? key : PREFIX + key;
  if (!useBlob) {
    try {
      const p = localPath(fullKey);
      if (!existsSync(p)) return fallback;
      return JSON.parse(readFileSync(p, "utf-8")) as T;
    } catch {
      return fallback;
    }
  }
  try {
    const { blobs } = await list({ prefix: fullKey, limit: 1 });
    const match = blobs.find((b) => b.pathname === fullKey);
    if (!match) return fallback;
    const res = await fetch(`${match.url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return JSON.parse(await res.text()) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, data: T): Promise<void> {
  const fullKey = key.startsWith(PREFIX) ? key : PREFIX + key;
  if (!useBlob) {
    const p = localPath(fullKey);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(data, null, 2));
    return;
  }
  await put(fullKey, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function deleteBlob(key: string): Promise<void> {
  const fullKey = key.startsWith(PREFIX) ? key : PREFIX + key;
  if (!useBlob) {
    try {
      const p = localPath(fullKey);
      if (existsSync(p)) unlinkSync(p);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    const { blobs } = await list({ prefix: fullKey, limit: 1 });
    const match = blobs.find((b) => b.pathname === fullKey);
    if (match) await del(match.url);
  } catch {
    /* ignore */
  }
}

export async function writeBlob(
  key: string,
  data: Buffer | string,
  contentType: string
): Promise<string> {
  const fullKey = key.startsWith(PREFIX) ? key : PREFIX + key;
  if (!useBlob) {
    const p = localPath(fullKey);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, data);
    return `/data/${fullKey.replace(PREFIX, "")}`;
  }
  const blob = await put(fullKey, data, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
  return blob.url;
}
