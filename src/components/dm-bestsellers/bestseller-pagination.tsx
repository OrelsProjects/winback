"use client";

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
  pageSize: number;
  onPageChange: (page: number) => void;
};

export const BestsellerPagination = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: Props) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  const handlePageClick = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    onPageChange(p);
  };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <p className="text-sm text-muted-foreground">
        {total} total · page {page + 1} of {totalPages} · {pageSize} per page
      </p>
      <Pagination>
        <PaginationContent>
          {page > 0 && (
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={handlePageClick(page - 1)}
              />
            </PaginationItem>
          )}
          {visible.map((p, i) => {
            const prev = visible[i - 1];
            const showEllipsis = prev !== undefined && p - prev > 1;
            const pageIndex = p - 1;
            return (
              <span key={p} className="contents">
                {showEllipsis ? (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : null}
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    isActive={pageIndex === page}
                    onClick={handlePageClick(pageIndex)}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              </span>
            );
          })}
          {page + 1 < totalPages && (
            <PaginationItem>
              <PaginationNext href="#" onClick={handlePageClick(page + 1)} />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    </div>
  );
};
