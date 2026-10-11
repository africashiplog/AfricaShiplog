import { createHash, randomBytes } from "crypto";
import { mkdir, readFile, rename, writeFile, stat } from "fs/promises";
import path from "path";

export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./storage/uploads");
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? "25") * 1024 * 1024;

export interface SniffedType {
  mime: string;
  ext: string;
}

/**
 * Detects the real file type from its magic bytes — the browser-supplied
 * MIME type and file extension are never trusted. Only a fixed allow-list of
 * formats useful for the archive is accepted (no SVG/HTML: they can carry
 * scripts).
 */
export function sniffFileType(buf: Uint8Array): SniffedType | null {
  const b = buf;
  const at = (i: number, bytes: number[]) => bytes.every((v, k) => b[i + k] === v);
  const ascii = (i: number, s: string) => at(i, Array.from(s, (c) => c.charCodeAt(0)));
  if (b.length < 12) return null;
  if (at(0, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return { mime: "image/webp", ext: "webp" };
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return { mime: "image/gif", ext: "gif" };
  if (at(0, [0x49, 0x49, 0x2a, 0x00]) || at(0, [0x4d, 0x4d, 0x00, 0x2a])) return { mime: "image/tiff", ext: "tif" };
  if (ascii(0, "%PDF-")) return { mime: "application/pdf", ext: "pdf" };
  if (ascii(0, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { mime: "audio/mpeg", ext: "mp3" };
  if (ascii(0, "OggS")) return { mime: "audio/ogg", ext: "ogg" };
  if (ascii(0, "RIFF") && ascii(8, "WAVE")) return { mime: "audio/wav", ext: "wav" };
  if (ascii(4, "ftyp") && (ascii(8, "M4A ") || ascii(8, "M4B "))) return { mime: "audio/mp4", ext: "m4a" };
  return null;
}

export async function storeFile(buf: Buffer, type: SniffedType): Promise<{ storedName: string; sha256: string }> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const storedName = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${type.ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, storedName), buf, { mode: 0o640 });
  return { storedName, sha256 };
}

function safePath(storedName: string): string {
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/.test(storedName)) throw new Error("invalid stored name");
  return path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, storedName);
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  return readFile(safePath(storedName));
}

/** Files are never destroyed outright: they move to a trash folder so a deletion can be undone by an admin. */
export async function deleteStoredFile(storedName: string) {
  const trash = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, ".trash");
  await mkdir(trash, { recursive: true });
  const from = safePath(storedName);
  try {
    await stat(from);
    await rename(from, path.join(/*turbopackIgnore: true*/ trash, storedName));
  } catch {
    /* already gone */
  }
}
