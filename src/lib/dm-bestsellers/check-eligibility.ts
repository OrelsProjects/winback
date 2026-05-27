import type { BestsellerDM } from "@/generated/client";
import { fetchProfileFeedEligibility } from "@/lib/substack/profile-feed";
import { prisma } from "@/lib/db/prisma";

export type EligibilityCheckResult = {
  authorId: number;
  noteCount: number;
  isSendingNotes: boolean;
  status: BestsellerDM;
};

export const checkAndSaveEligibility = async (
  authorId: number,
): Promise<EligibilityCheckResult> => {
  const { noteCount, eligible } = await fetchProfileFeedEligibility(authorId);
  const now = new Date();

  const status = await prisma.bestsellerDM.upsert({
    where: { authorId },
    update: {
      isSendingNotes: eligible,
      eligible,
      eligibleCheckedAt: now,
    },
    create: {
      authorId,
      isSendingNotes: eligible,
      eligible,
      eligibleCheckedAt: now,
      wasSent: false,
    },
  });

  return { authorId, noteCount, isSendingNotes: eligible, status };
};

export const checkAndSaveEligibilityBatch = async (
  authorIds: number[],
): Promise<EligibilityCheckResult[]> => {
  const uniqueIds = Array.from(new Set(authorIds)).filter((id) => id > 0);
  if (uniqueIds.length === 0) return [];

  return Promise.all(uniqueIds.map((authorId) => checkAndSaveEligibility(authorId)));
};
