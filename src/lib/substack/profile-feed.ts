import {
  DM_ELIGIBILITY_LOOKBACK_DAYS,
  DM_ELIGIBILITY_MIN_NOTES_PER_DAY,
} from "@/lib/dm-bestsellers/constants";

const SUBSTACK_BASE = "https://substack.com/api/v1";
const MAX_PROFILE_FEED_PAGES = 20;

const COMMON_HEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
  Origin: "https://substack.com",
  Referer: "https://substack.com/",
};

type ProfileFeedItem = {
  type?: string;
  context?: {
    timestamp?: string;
  };
};

type ProfileFeedResponse = {
  items?: ProfileFeedItem[];
  nextCursor?: string | null;
};

export type ProfileFeedEligibility = {
  authorId: number;
  noteCount: number;
  notesByDay: Record<string, number>;
  eligible: boolean;
};

const NOTE_ITEM_TYPE = "comment";

const utcDayKey = (date: Date): string => date.toISOString().slice(0, 10);

const getLookbackWindowStart = (
  now: Date,
  lookbackDays: number,
): Date => {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (lookbackDays - 1));
  return start;
};

const getLookbackDayKeys = (now: Date, lookbackDays: number): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < lookbackDays; i++) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - i);
    keys.push(utcDayKey(day));
  }
  return keys;
};

export const countNotesByDay = (
  noteTimestamps: Date[],
  dayKeys: string[],
): Record<string, number> => {
  const counts = Object.fromEntries(dayKeys.map((key) => [key, 0]));
  for (const timestamp of noteTimestamps) {
    const key = utcDayKey(timestamp);
    if (key in counts) counts[key] += 1;
  }
  return counts;
};

/** More than one note per day on average over the lookback window. */
export const isEligibleFromNotesByDay = (
  notesByDay: Record<string, number>,
  lookbackDays: number = DM_ELIGIBILITY_LOOKBACK_DAYS,
  minNotesPerDay: number = DM_ELIGIBILITY_MIN_NOTES_PER_DAY,
): boolean => {
  const totalNotes = Object.values(notesByDay).reduce((sum, count) => sum + count, 0);
  return totalNotes > lookbackDays * minNotesPerDay;
};

const fetchProfileFeedPage = async (
  authorId: number,
  cursor?: string,
): Promise<ProfileFeedResponse> => {
  const url = new URL(`${SUBSTACK_BASE}/reader/feed/profile/${authorId}`);
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    headers: COMMON_HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Substack profile feed ${res.status} for author ${authorId}: ${await res.text()}`,
    );
  }

  return (await res.json()) as ProfileFeedResponse;
};

const collectNoteTimestampsInWindow = async (
  authorId: number,
  windowStart: Date,
): Promise<Date[]> => {
  const noteTimestamps: Date[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  while (pageCount < MAX_PROFILE_FEED_PAGES) {
    const page = await fetchProfileFeedPage(authorId, cursor);
    const items = page.items ?? [];
    let reachedBeforeWindow = false;

    for (const item of items) {
      if (item.type !== NOTE_ITEM_TYPE) continue;
      const timestamp = item.context?.timestamp;
      if (!timestamp) continue;

      const publishedAt = new Date(timestamp);
      if (Number.isNaN(publishedAt.getTime())) continue;

      if (publishedAt < windowStart) {
        reachedBeforeWindow = true;
        continue;
      }

      noteTimestamps.push(publishedAt);
    }

    pageCount += 1;
    cursor = page.nextCursor ?? undefined;

    if (reachedBeforeWindow || !cursor) break;
  }

  return noteTimestamps;
};

/** Fetch profile feed pages and derive DM eligibility from recent note volume. */
export const fetchProfileFeedEligibility = async (
  authorId: number,
  now: Date = new Date(),
): Promise<ProfileFeedEligibility> => {
  const dayKeys = getLookbackDayKeys(now, DM_ELIGIBILITY_LOOKBACK_DAYS);
  const windowStart = getLookbackWindowStart(now, DM_ELIGIBILITY_LOOKBACK_DAYS);
  const noteTimestamps = await collectNoteTimestampsInWindow(authorId, windowStart);
  const notesByDay = countNotesByDay(noteTimestamps, dayKeys);
  const noteCount = noteTimestamps.length;

  return {
    authorId,
    noteCount,
    notesByDay,
    eligible: isEligibleFromNotesByDay(notesByDay),
  };
};
