import type { MediaFile } from "@prisma/client";
import { MEDIA_KIND_LABELS } from "@/lib/labels";

export function MediaGallery({ media }: { media: MediaFile[] }) {
  if (!media.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {media.map((m) => (
        <figure key={m.id} className="card overflow-hidden">
          {m.mimeType.startsWith("image/") && m.mimeType !== "image/tiff" ? (
            <a href={`/api/media/${m.id}`} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element -- access-controlled API route, not a static asset */}
              <img src={`/api/media/${m.id}`} alt={m.title ?? m.caption ?? MEDIA_KIND_LABELS[m.kind]} className="h-40 w-full object-cover" loading="lazy" />
            </a>
          ) : m.mimeType.startsWith("audio/") ? (
            <audio controls src={`/api/media/${m.id}`} className="w-full p-2" preload="none" />
          ) : (
            <a href={`/api/media/${m.id}`} target="_blank" rel="noopener" className="grid h-40 place-items-center bg-parchment text-green">
              📄 {MEDIA_KIND_LABELS[m.kind]}
            </a>
          )}
          <figcaption className="p-2 text-xs">
            <span className="font-semibold">{m.title ?? MEDIA_KIND_LABELS[m.kind]}</span>
            {m.caption ? <p className="text-muted">{m.caption}</p> : null}
            {m.credit || m.rights ? <p className="mt-1 text-[11px] text-muted">{[m.credit, m.rights].filter(Boolean).join(" — ")}</p> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
