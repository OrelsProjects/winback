/** A DM-status row is considered "fresh" if checked within this many days. */
export const DM_FRESHNESS_DAYS = 3;

export const DM_FRESHNESS_MS = DM_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;

/** Synthetic category key for Substack "New Bestsellers" trending list. */
export const LEADERBOARD_CATEGORY_KEY = "leaderboard";

/** Default category tab on the DM bestsellers page. */
export const DEFAULT_CATEGORY_SLUG = "business";

/** UI / API page size when serving cached bestseller lists. */
export const BESTSELLER_PAGE_SIZE = 150;

/** Extension DM checks per batch when verifying a page. */
export const DM_VERIFY_BATCH_SIZE = 5;

/** Pause between DM verify batches (ms). */
export const DM_VERIFY_BATCH_DELAY_MS = 3000;

/** Eligibility checks per batch when eligiblizing a page. */
export const DM_ELIGIBILITY_BATCH_SIZE = 3;

/** Pause between eligibility check batches (ms). */
export const DM_ELIGIBILITY_BATCH_DELAY_MS = 3000;

/** Wait before retrying an eligibility batch after a 429 rate limit. */
export const DM_ELIGIBILITY_RATE_LIMIT_RETRY_MS = 15_000;

/** How many calendar days of note history to inspect for eligibility. */
export const DM_ELIGIBILITY_LOOKBACK_DAYS = 10;

/** Must average more than this many notes per day over the lookback window. */
export const DM_ELIGIBILITY_MIN_NOTES_PER_DAY = 1;

/** Substack returns 25 publications per API page (limit param is ignored). */
export const SUBSTACK_API_PAGE_SIZE = 25;

/**
 * Returns true when we already verified DM-status recently enough to skip
 * the extension lookup. Anything older (or never checked) needs a re-check.
 */
export const isDmStatusFresh = (
  lastCheckedAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!lastCheckedAt) return false;
  const ts =
    typeof lastCheckedAt === "string"
      ? new Date(lastCheckedAt).getTime()
      : lastCheckedAt.getTime();
  if (!Number.isFinite(ts)) return false;
  return now.getTime() - ts < DM_FRESHNESS_MS;
};
