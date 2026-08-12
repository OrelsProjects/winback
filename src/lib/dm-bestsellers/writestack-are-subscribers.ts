import { batch } from "@/lib/batch";
import { normalizeBestsellerHandle } from "@/lib/dm-bestsellers/are-subscribers";

const ARE_SUBSCRIBERS_BATCH_SIZE = 500;

export const getWriteStackAreSubscribersUrl = (): string => {
  if (process.env.NODE_ENV === "production") {
    return "https://writestack.io/api/dev/are-subscribers";
  }
  return "http://localhost:3000/api/dev/are-subscribers";
};

type AreSubscribersResponse = {
  subscribers: string[];
};

const queryWriteStackAreSubscribersBatch = async (
  handles: string[],
): Promise<string[]> => {
  const secret = process.env.MTM_SECRET?.trim();
  if (!secret) {
    throw new Error("MTM_SECRET is not configured");
  }

  const res = await fetch(getWriteStackAreSubscribersUrl(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ handles }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `WriteStack are-subscribers responded ${res.status}: ${await res.text()}`,
    );
  }

  const data = (await res.json()) as AreSubscribersResponse;
  return data.subscribers ?? [];
};

/** Server-only: returns lowercase handles that have (or had) a WriteStack note. */
export const queryWriteStackAreSubscribers = async (
  handles: string[],
): Promise<Set<string>> => {
  const unique = [
    ...new Set(
      handles
        .map((h) => normalizeBestsellerHandle(h))
        .filter((h): h is string => h != null),
    ),
  ];

  if (unique.length === 0) return new Set();

  const batches = batch(unique, ARE_SUBSCRIBERS_BATCH_SIZE);
  const subscriberHandles = new Set<string>();

  for (const handlesBatch of batches) {
    const found = await queryWriteStackAreSubscribersBatch(handlesBatch);
    for (const handle of found) {
      const normalized = normalizeBestsellerHandle(handle);
      if (normalized) subscriberHandles.add(normalized);
    }
  }

  return subscriberHandles;
};
