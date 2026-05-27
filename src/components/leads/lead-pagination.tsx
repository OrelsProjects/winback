"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Props = {
  page: number;
  totalPages: number;
  total: number;
};

export const LeadPagination = ({ page, totalPages, total }: Props) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const buildHref = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {total} total leads · page {page} of {totalPages}
      </p>
      <Pagination>
        <PaginationContent>
          {page > 1 && (
            <PaginationItem>
              <PaginationPrevious href={buildHref(page - 1)} />
            </PaginationItem>
          )}
          {visible.map((p, i) => {
            const prev = visible[i - 1];
            const showEllipsis = prev !== undefined && p - prev > 1;
            return (
              <>
                {showEllipsis && (
                  <PaginationItem key={`ellipsis-${p}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem key={p}>
                  <PaginationLink href={buildHref(p)} isActive={p === page}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              </>
            );
          })}
          {page < totalPages && (
            <PaginationItem>
              <PaginationNext href={buildHref(page + 1)} />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    </div>
  );
};
