import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  function hrefFor(p: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-line text-[12px] text-ink-soft">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`h-7 w-7 flex items-center justify-center border border-line-strong rounded-[3px] ${
            page <= 1 ? "opacity-40 pointer-events-none" : "hover:border-black"
          }`}
        >
          <ChevronLeft size={14} />
        </Link>
        <span className="px-2">
          Page {page} of {totalPages}
        </span>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`h-7 w-7 flex items-center justify-center border border-line-strong rounded-[3px] ${
            page >= totalPages ? "opacity-40 pointer-events-none" : "hover:border-black"
          }`}
        >
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
