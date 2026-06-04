import type { BestsellerDM } from "@/generated/browser";

export type WriteStackAuthorRef = {
  authorId: number;
  handle: string | null;
  name: string | null;
};

export const hasWriteStackSubscriberCheck = (
  status: BestsellerDM | undefined,
): boolean => status?.writeStackCheckedAt != null;

export const isPersistedWriteStackSubscriber = (
  status: BestsellerDM | undefined,
): boolean => status?.isWriteStackSubscriber === true;
