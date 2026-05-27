import type { BestsellerDM } from "@/generated/client";
import type { Bestseller } from "@/lib/substack/discover";

export type BestsellerSortOrder = "new" | "already-sent";

export const DEFAULT_BESTSELLER_SORT_ORDER: BestsellerSortOrder = "new";

export const wasAlreadyDmSent = (
  status: BestsellerDM | undefined,
): boolean => Boolean(status?.wasSent && status.sentAt);

/** Hide authors who were dismissed or cannot receive DMs. */
export const isAuthorEligibleForDisplay = (
  status: BestsellerDM | undefined,
): boolean => {
  if (status?.isDeleted) return false;
  if (status?.canSendDm === false) return false;
  return true;
};

/** Lower number = higher priority when paging DM bestsellers. */
export const getBestsellerDmFetchPriority = (
  status: BestsellerDM | undefined,
): number => {
  if (status?.isSendingNotes === true && !wasAlreadyDmSent(status)) return 0;
  if (status?.isSendingNotes === false) return 1;
  return 2;
};

export const filterEligibleBestsellers = (
  bestsellers: Bestseller[],
  statusByAuthor: ReadonlyMap<number, BestsellerDM>,
): Bestseller[] =>
  bestsellers.filter((b) => {
    if (b.authorId == null) return true;
    return isAuthorEligibleForDisplay(statusByAuthor.get(b.authorId));
  });

/** Build a status row that hides the author immediately while dismiss saves. */
export const applyOptimisticDismiss = (
  existing: BestsellerDM | undefined,
  authorId: number,
  handle: string | null,
  name: string | null,
): BestsellerDM =>
  existing
    ? { ...existing, isDeleted: true }
    : {
        id: `optimistic-${authorId}`,
        authorId,
        handle,
        name,
        threadId: null,
        clientId: null,
        wasSent: false,
        sentAt: null,
        lastReplyAt: null,
        lastCheckedAt: null,
        eligible: false,
        eligibleCheckedAt: null,
        isSendingNotes: null,
        canSendDm: null,
        isDeleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

export const rerankBestsellers = (
  bestsellers: Bestseller[],
  startRank: number,
): Bestseller[] =>
  bestsellers.map((b, index) => ({ ...b, rank: startRank + index + 1 }));

export const sortBestsellersByDmStatus = (
  bestsellers: Bestseller[],
  statusByAuthor: ReadonlyMap<number, BestsellerDM>,
  order: BestsellerSortOrder,
): Bestseller[] =>
  [...bestsellers].sort((a, b) => {
    const aStatus =
      a.authorId != null ? statusByAuthor.get(a.authorId) : undefined;
    const bStatus =
      b.authorId != null ? statusByAuthor.get(b.authorId) : undefined;
    const aPriority = getBestsellerDmFetchPriority(aStatus);
    const bPriority = getBestsellerDmFetchPriority(bStatus);
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aSent = a.authorId != null && wasAlreadyDmSent(aStatus);
    const bSent = b.authorId != null && wasAlreadyDmSent(bStatus);

    if (aSent !== bSent) {
      if (order === "new") return aSent ? 1 : -1;
      return aSent ? -1 : 1;
    }

    return a.rank - b.rank;
  });
