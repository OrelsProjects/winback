import { queryWriteStackAreSubscribers } from "@/lib/dm-bestsellers/writestack-are-subscribers";
import { saveWriteStackSubscriberStatuses } from "@/lib/dm-bestsellers/save-write-stack-subscriber-status";
import type { WriteStackAuthorRef } from "@/lib/dm-bestsellers/write-stack-subscriber-status";

export const checkAreSubscribers = async (authors: WriteStackAuthorRef[]) => {
  const handles = authors
    .map((a) => a.handle)
    .filter((h): h is string => h != null && h.trim() !== "");

  const subscriberHandles = await queryWriteStackAreSubscribers(handles);
  const statuses = await saveWriteStackSubscriberStatuses(
    authors,
    subscriberHandles,
  );

  return {
    subscribers: [...subscriberHandles],
    statuses,
  };
};
