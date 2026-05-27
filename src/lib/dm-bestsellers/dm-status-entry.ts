/** Payload for POST /api/dm-bestsellers/dm-status */
export type DmStatusUpsertEntry = {
  authorId: number;
  handle: string | null;
  name: string | null;
  wasSent: boolean;
  sentAt: string | null;
  lastReplyAt: string | null;
  /** Null when the extension did not report DM availability yet. */
  canSendDm: boolean | null;
};

/** Map extension didSendADM result to a storable canSendDm value. */
export const canSendDmFromExtensionResult = (result: {
  canSendDM?: boolean;
}): boolean | null =>
  typeof result.canSendDM === "boolean" ? result.canSendDM : null;

/** Coerce extension/API date strings to ISO or null (invalid → null). */
export const parseDmStatusDate = (value: unknown): Date | null => {
  if (value == null || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

export const normalizeDmStatusEntry = (
  entry: DmStatusUpsertEntry,
): DmStatusUpsertEntry => {
  const sentAt = parseDmStatusDate(entry.sentAt);
  const lastReplyAt = parseDmStatusDate(entry.lastReplyAt);
  return {
    ...entry,
    sentAt: sentAt?.toISOString() ?? null,
    lastReplyAt: lastReplyAt?.toISOString() ?? null,
  };
};
