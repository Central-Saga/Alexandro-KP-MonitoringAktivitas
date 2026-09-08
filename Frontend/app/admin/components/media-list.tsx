import { formatFileSize } from "../../lib/format-file-size";
import { getApiUrl } from "../../lib/auth";
import type { MediaItem } from "../../types/media";

export default function MediaList({ items }: { items: MediaItem[] }) {
  if (!items.length) return null;

  return (
    <ul className="mt-2 space-y-2" aria-label={`${items.length} lampiran aktivitas`}>
      {items.map((item) => {
        const url = resolveMediaUrl(item.url);
        const isImage = item.mime_type.startsWith("image/");

        return (
          <li key={item.id} className="flex max-w-md items-center gap-2 rounded-lg bg-[#f8fafc] p-2 text-xs">
            {/* Preview hanya diberikan untuk MIME image agar browser tidak
                mencoba merender dokumen atau binary sebagai gambar. */}
            {isImage && url ? (
              <span role="img" aria-label={`Preview ${item.file_name}`} style={{ backgroundImage: `url("${url}")` }} className="h-9 w-9 shrink-0 rounded-md bg-slate-200 bg-cover bg-center" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-200 font-semibold text-[#60738f]">FILE</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[#172b4d]">{item.file_name}</span>
              <span className="block truncate text-[#71829a]">{item.mime_type || "Tipe tidak diketahui"} · {formatFileSize(item.size)}</span>
            </span>
            {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-semibold text-[#168c44] hover:underline">Lihat</a> : <span className="shrink-0 text-[#91a0b3]">URL tidak valid</span>}
          </li>
        );
      })}
    </ul>
  );
}

function resolveMediaUrl(value: string): string | null {
  if (/^https?:\/\//i.test(value)) return value;

  // URL relatif tetap diarahkan ke origin API. Path file tidak dibentuk
  // ulang karena backend Media Library adalah source of truth URL media.
  if (value.startsWith("/")) return getApiUrl(value);

  return null;
}
