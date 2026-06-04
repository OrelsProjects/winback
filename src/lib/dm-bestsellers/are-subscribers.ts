import type { BestsellerDM } from "@/generated/client";
import type { Bestseller } from "@/lib/substack/discover";
import { isPersistedWriteStackSubscriber } from "@/lib/dm-bestsellers/write-stack-subscriber-status";

export const normalizeBestsellerHandle = (
  handle: string | null | undefined,
): string | null => {
  const trimmed = handle?.trim().toLowerCase();
  return trimmed || null;
};

export const isWriteStackSubscriber = (
  bestseller: Bestseller,
  statusByAuthor: ReadonlyMap<number, BestsellerDM>,
): boolean => {
  if (bestseller.authorId == null) return false;
  return isPersistedWriteStackSubscriber(
    statusByAuthor.get(bestseller.authorId),
  );
};
