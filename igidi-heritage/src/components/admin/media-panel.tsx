import type { MediaFile } from "@prisma/client";
import { ActionForm, ConfirmActionButton, Field } from "@/components/forms";
import { MEDIA_KIND_LABELS } from "@/lib/labels";
import { updateMediaAction, deleteMediaAction } from "@/app/admin/_actions/catalog";
import { MediaUploader } from "./media-uploader";

export function MediaPanel({ media, target, canEdit, canDelete, defaultKind }: { media: MediaFile[]; target: Record<string, string>; canEdit: boolean; canDelete: boolean; defaultKind?: string }) {
  return (
    <div className="space-y-5">
      {canEdit ? <MediaUploader target={target} defaultKind={defaultKind} /> : null}
      {media.length === 0 ? <p className="text-sm text-muted">لا ملفات مرفقة.</p> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {media.map((m) => (
            <li key={m.id} className="rounded-lg border border-line bg-white p-3">
              <div className="flex gap-3">
                {m.mimeType.startsWith("image/") && m.mimeType !== "image/tiff" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- access-controlled route
                  <img src={`/api/media/${m.id}`} alt={m.title ?? ""} className="h-24 w-24 shrink-0 rounded object-cover" />
                ) : (
                  <a href={`/api/media/${m.id}`} target="_blank" rel="noopener" className="grid h-24 w-24 shrink-0 place-items-center rounded bg-parchment text-xs text-green">فتح الملف</a>
                )}
                <div className="min-w-0 text-xs text-muted">
                  <p className="font-semibold text-ink">{MEDIA_KIND_LABELS[m.kind]} · {m.isPublic ? "عام" : "داخلي"}</p>
                  <p className="truncate">{m.originalName}</p>
                  <p>{(m.sizeBytes / 1024).toFixed(0)} ك.ب · {m.mimeType}</p>
                  <a href={`/api/media/${m.id}?download=1`} className="link">تنزيل</a>
                </div>
              </div>
              {canEdit ? (
                <ActionForm action={updateMediaAction} submitLabel="حفظ البيانات" submitClassName="btn btn-ghost btn-sm" className="mt-2">
                  <input type="hidden" name="id" value={m.id} />
                  <div className="grid gap-2">
                    <Field label="العنوان" name="title"><input name="title" defaultValue={m.title ?? ""} className="input" /></Field>
                    <Field label="التعليق" name="caption"><input name="caption" defaultValue={m.caption ?? ""} className="input" /></Field>
                    <Field label="المصوّر/المالك" name="credit"><input name="credit" defaultValue={m.credit ?? ""} className="input" /></Field>
                    <Field label="حقوق النشر" name="rights"><input name="rights" defaultValue={m.rights ?? ""} className="input" /></Field>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked={m.isPublic} /> يُعرض للعامة</label>
                  </div>
                </ActionForm>
              ) : null}
              {canDelete ? <div className="mt-2"><ConfirmActionButton action={deleteMediaAction} label="حذف الملف" confirmText="حذف الملف؟ (يُنقل إلى سلة المهملات على الخادم)" fields={{ id: m.id }} /></div> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
