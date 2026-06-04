import type { BestsellerDM } from "@/generated/client";
import { normalizeBestsellerHandle } from "@/lib/dm-bestsellers/are-subscribers";
import type { WriteStackAuthorRef } from "@/lib/dm-bestsellers/write-stack-subscriber-status";
import { runInBatches } from "@/lib/batch";
import { prisma } from "@/lib/db/prisma";

export type { WriteStackAuthorRef } from "@/lib/dm-bestsellers/write-stack-subscriber-status";

const UPSERT_BATCH_SIZE = 25;

export const saveWriteStackSubscriberStatuses = async (
  authors: WriteStackAuthorRef[],
  subscriberHandles: ReadonlySet<string>,
): Promise<BestsellerDM[]> => {
  if (authors.length === 0) return [];

  const now = new Date();

  const results = await runInBatches(
    authors,
    UPSERT_BATCH_SIZE,
    async (author) => {
      const handle = normalizeBestsellerHandle(author.handle);
      const isSubscriber = handle ? subscriberHandles.has(handle) : false;

      return prisma.bestsellerDM.upsert({
        where: { authorId: author.authorId },
        update: {
          handle: author.handle ?? undefined,
          name: author.name ?? undefined,
          isWriteStackSubscriber: isSubscriber,
          writeStackCheckedAt: now,
        },
        create: {
          authorId: author.authorId,
          handle: author.handle,
          name: author.name,
          isWriteStackSubscriber: isSubscriber,
          writeStackCheckedAt: now,
          wasSent: false,
        },
      });
    },
  );

  return results ?? [];
};
