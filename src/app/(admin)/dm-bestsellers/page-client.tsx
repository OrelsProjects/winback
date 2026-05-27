"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, NotepadText, RefreshCw, AlertTriangle } from "lucide-react";
import type { BestsellerDM } from "@/generated/browser";
import type { Bestseller, DiscoverCategory } from "@/lib/substack/discover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryTabs } from "@/components/dm-bestsellers/category-tabs";
import { BestsellerList } from "@/components/dm-bestsellers/bestseller-list";
import { BestsellerPagination } from "@/components/dm-bestsellers/bestseller-pagination";
import { SendDmDialog } from "@/components/dm-bestsellers/send-dm-dialog";
import type {
  DmActionState,
  VerifyActionState,
  VerifyEligibleActionState,
} from "@/components/dm-bestsellers/dm-action-button";
import { useExtension } from "@/lib/hooks/use-extension";
import {
  isDmStatusFresh,
  DM_FRESHNESS_DAYS,
  BESTSELLER_PAGE_SIZE,
  DM_ELIGIBILITY_BATCH_DELAY_MS,
  DM_ELIGIBILITY_BATCH_SIZE,
  DM_ELIGIBILITY_RATE_LIMIT_RETRY_MS,
  DM_VERIFY_BATCH_DELAY_MS,
  DM_VERIFY_BATCH_SIZE,
  DEFAULT_CATEGORY_SLUG,
} from "@/lib/dm-bestsellers/constants";
import { batch, delay } from "@/lib/batch";
import {
  normalizeDmStatusEntry,
  canSendDmFromExtensionResult,
  type DmStatusUpsertEntry,
} from "@/lib/dm-bestsellers/dm-status-entry";
import {
  applyOptimisticDismiss,
  filterEligibleBestsellers,
  rerankBestsellers,
  sortBestsellersByDmStatus,
  type BestsellerSortOrder,
  DEFAULT_BESTSELLER_SORT_ORDER,
} from "@/lib/dm-bestsellers/eligible-for-display";

type Props = {
  categories: DiscoverCategory[];
};

type DmStatusMap = Map<number, BestsellerDM>;

type FetchListResult = {
  bestsellers: Bestseller[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  more: boolean;
};

const getActionStateForBestseller = (
  bestseller: Bestseller,
  statusByAuthor: DmStatusMap,
  sendingAuthorIds: Set<number>,
): DmActionState => {
  if (!bestseller.authorId) return "disabled";
  if (sendingAuthorIds.has(bestseller.authorId)) return "loading";
  const status = statusByAuthor.get(bestseller.authorId);
  if (status?.canSendDm === false) return "disabled";
  if (status?.wasSent && status.sentAt) return "sent";
  if (!status?.isSendingNotes) return "disabled";
  if (status?.lastCheckedAt) return "not-sent";
  return "idle";
};

const getVerifyStateForBestseller = (
  bestseller: Bestseller,
  inFlightByAuthor: Set<number>,
  extensionReady: boolean,
): VerifyActionState => {
  if (!bestseller.authorId) return "disabled";
  if (!extensionReady) return "disabled";
  if (inFlightByAuthor.has(bestseller.authorId)) return "loading";
  return "idle";
};

const getVerifyEligibleStateForBestseller = (
  bestseller: Bestseller,
  statusByAuthor: DmStatusMap,
  eligibilityCheckingAuthorIds: Set<number>,
): VerifyEligibleActionState => {
  if (!bestseller.authorId) return "disabled";
  if (eligibilityCheckingAuthorIds.has(bestseller.authorId)) return "loading";
  const status = statusByAuthor.get(bestseller.authorId);
  if (status?.wasSent && status.sentAt) return "disabled";
  if (status?.isSendingNotes === true) return "eligible";
  if (status?.isSendingNotes === false) return "disabled";
  return "idle";
};

const needsExtensionCheck = (
  bestseller: Bestseller,
  statusByAuthor: DmStatusMap,
  now: Date,
): boolean => {
  if (!bestseller.authorId) return false;
  const status = statusByAuthor.get(bestseller.authorId);
  if (!status) return true;
  if (status.wasSent && status.sentAt) return false;
  return !isDmStatusFresh(status.lastCheckedAt, now);
};

const needsEligibilityCheck = (
  bestseller: Bestseller,
  statusByAuthor: DmStatusMap,
): boolean => {
  if (!bestseller.authorId) return false;
  const status = statusByAuthor.get(bestseller.authorId);
  if (status?.wasSent && status.sentAt) return false;
  return !status?.eligibleCheckedAt;
};

const isEligibilityRateLimitError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  return /\b429\b/.test(err.message);
};

export const DmBestsellersPageClient = ({ categories }: Props) => {
  const defaultCategoryKey =
    categories.find((c) => c.slug === DEFAULT_CATEGORY_SLUG)?.categoryKey ??
    categories[0]?.categoryKey ??
    null;

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(
    defaultCategoryKey,
  );
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [bestsellers, setBestsellers] = useState<Bestseller[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [statusByAuthor, setStatusByAuthor] = useState<DmStatusMap>(new Map());
  const [inFlightByAuthor, setInFlightByAuthor] = useState<Set<number>>(
    new Set(),
  );
  const [sendingAuthorIds, setSendingAuthorIds] = useState<Set<number>>(
    new Set(),
  );
  const [eligibilityCheckingAuthorIds, setEligibilityCheckingAuthorIds] =
    useState<Set<number>>(new Set());
  const [sendTarget, setSendTarget] = useState<Bestseller | null>(null);
  const [sortOrder, setSortOrder] = useState<BestsellerSortOrder>(
    DEFAULT_BESTSELLER_SORT_ORDER,
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEligiblizing, setIsEligiblizing] = useState(false);

  const {
    isAvailable: extensionReady,
    availability,
    unavailableReason,
    extensionId,
    refresh: refreshExtension,
    call: callExtension,
  } = useExtension();

  const selectedCategory = useMemo(
    () => categories.find((c) => c.categoryKey === selectedCategoryKey) ?? null,
    [categories, selectedCategoryKey],
  );

  const fetchBestsellers = useCallback(
    async (categoryKey: string, pageIndex: number) => {
      setIsLoadingList(true);
      setListError(null);
      try {
        const params = new URLSearchParams({
          categoryKey,
          page: String(pageIndex),
          pageSize: String(BESTSELLER_PAGE_SIZE),
        });
        const res = await fetch(`/api/dm-bestsellers?${params.toString()}`);
        const data = (await res.json()) as FetchListResult & { error?: string };
        if (!res.ok || data.error) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        setBestsellers(data.bestsellers);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(data.page);
        return data.bestsellers;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load";
        setListError(message);
        setBestsellers([]);
        setTotal(0);
        setTotalPages(1);
        return [];
      } finally {
        setIsLoadingList(false);
      }
    },
    [],
  );

  const persistDmStatuses = useCallback(
    async (entries: DmStatusUpsertEntry[]) => {
      if (entries.length === 0) return [];
      const normalized = entries.map(normalizeDmStatusEntry);
      const res = await fetch("/api/dm-bestsellers/dm-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: normalized }),
      });
      const data = (await res.json()) as {
        statuses: BestsellerDM[];
        error?: string;
      };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setStatusByAuthor((prev) => {
        const next = new Map(prev);
        for (const row of data.statuses) next.set(row.authorId, row);
        return next;
      });
      return data.statuses;
    },
    [],
  );

  const checkEligibility = useCallback(async (authorIds: number[]) => {
    if (authorIds.length === 0) return [];
    const res = await fetch("/api/dm-bestsellers/eligibility", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ authorIds }),
    });
    const data = (await res.json()) as {
      statuses: BestsellerDM[];
      error?: string;
    };
    if (!res.ok || data.error) {
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
    setStatusByAuthor((prev) => {
      const next = new Map(prev);
      for (const row of data.statuses) next.set(row.authorId, row);
      return next;
    });
    return data.statuses;
  }, []);

  const fetchDmStatuses = useCallback(async (authorIds: number[]) => {
    if (authorIds.length === 0) {
      setStatusByAuthor(new Map());
      return new Map<number, BestsellerDM>();
    }
    const res = await fetch(
      `/api/dm-bestsellers/dm-status?authorIds=${authorIds.join(",")}`,
    );
    const data = (await res.json()) as {
      statuses: BestsellerDM[];
      error?: string;
    };
    if (!res.ok || data.error) {
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
    const map = new Map<number, BestsellerDM>();
    for (const row of data.statuses) map.set(row.authorId, row);
    setStatusByAuthor(map);
    return map;
  }, []);

  const handleDismiss = useCallback(async (bestseller: Bestseller) => {
    if (!bestseller.authorId) return;
    const authorId = bestseller.authorId;
    const handle = bestseller.authorHandle;
    const name = bestseller.authorName ?? bestseller.publicationName;

    let previousStatus: BestsellerDM | undefined;
    setStatusByAuthor((prev) => {
      previousStatus = prev.get(authorId);
      const next = new Map(prev);
      next.set(
        authorId,
        applyOptimisticDismiss(previousStatus, authorId, handle, name),
      );
      return next;
    });

    try {
      const res = await fetch("/api/dm-bestsellers/dismiss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authorId, handle, name }),
      });
      const data = (await res.json()) as {
        status: BestsellerDM;
        error?: string;
      };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setStatusByAuthor((prev) => {
        const next = new Map(prev);
        next.set(authorId, data.status);
        return next;
      });
    } catch (err) {
      setStatusByAuthor((prev) => {
        const next = new Map(prev);
        if (previousStatus) next.set(authorId, previousStatus);
        else next.delete(authorId);
        return next;
      });
      const message = err instanceof Error ? err.message : "Dismiss failed";
      toast.error(`Remove failed: ${message}`);
    }
  }, []);

  const handleCategorySelect = useCallback((categoryKey: string) => {
    setSelectedCategoryKey(categoryKey);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  useEffect(() => {
    if (selectedCategoryKey == null) return;
    let cancelled = false;
    (async () => {
      const list = await fetchBestsellers(selectedCategoryKey, page);
      if (cancelled) return;
      const authorIds = list
        .map((b) => b.authorId)
        .filter((id): id is number => id != null);
      try {
        await fetchDmStatuses(authorIds);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Status fetch failed";
        toast.error(`DM status load failed: ${message}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryKey, page, fetchBestsellers, fetchDmStatuses]);

  const handleVerifySingle = useCallback(
    async (bestseller: Bestseller) => {
      if (!bestseller.authorId) return;
      if (!extensionReady) {
        toast.error("Chrome extension is not reachable");
        return;
      }
      const authorId = bestseller.authorId;
      setInFlightByAuthor((prev) => new Set(prev).add(authorId));
      try {
        const result = await callExtension("didSendADM", [authorId]);
        const sentAtIso = result.didSendDm
          ? (result.lastReplyAt ?? new Date().toISOString())
          : null;
        await persistDmStatuses([
          {
            authorId,
            handle: bestseller.authorHandle,
            name: bestseller.authorName ?? bestseller.publicationName,
            wasSent: result.didSendDm,
            sentAt: sentAtIso,
            lastReplyAt: result.lastReplyAt,
            canSendDm: canSendDmFromExtensionResult(result),
          },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Verify failed";
        toast.error(`Verify failed: ${message}`);
      } finally {
        setInFlightByAuthor((prev) => {
          const next = new Set(prev);
          next.delete(authorId);
          return next;
        });
      }
    },
    [extensionReady, callExtension, persistDmStatuses],
  );

  const handleVerifyEligible = useCallback(
    async (bestseller: Bestseller) => {
      if (!bestseller.authorId) return;
      const authorId = bestseller.authorId;
      const status = statusByAuthor.get(authorId);
      if (status?.isSendingNotes === true) return;
      if (eligibilityCheckingAuthorIds.has(authorId)) return;

      setEligibilityCheckingAuthorIds((prev) => new Set(prev).add(authorId));
      try {
        const statuses = await checkEligibility([authorId]);
        const updated = statuses.find((row) => row.authorId === authorId);
        if (!updated?.isSendingNotes) {
          toast.info("User doesn't put out notes");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Eligibility check failed";
        toast.error(`Eligibility check failed: ${message}`);
      } finally {
        setEligibilityCheckingAuthorIds((prev) => {
          const next = new Set(prev);
          next.delete(authorId);
          return next;
        });
      }
    },
    [statusByAuthor, eligibilityCheckingAuthorIds, checkEligibility],
  );

  const handleSendClick = useCallback(
    (bestseller: Bestseller) => {
      if (!bestseller.authorId) return;
      if (!extensionReady) {
        toast.error("Chrome extension is not reachable");
        return;
      }
      const authorId = bestseller.authorId;
      const status = statusByAuthor.get(authorId);
      if (status?.wasSent && status.sentAt) return;
      if (status?.canSendDm === false) {
        toast.error("This author does not accept DMs");
        return;
      }
      if (status?.isSendingNotes !== true) {
        toast.error("Verify note eligibility before sending");
        return;
      }
      setSendTarget(bestseller);
    },
    [extensionReady, statusByAuthor],
  );

  const handleSendConfirm = useCallback(
    async (body: string) => {
      if (!sendTarget?.authorId) return;
      const authorId = sendTarget.authorId;
      setSendingAuthorIds((prev) => new Set(prev).add(authorId));
      try {
        const result = await callExtension("sendDM", [authorId, body]);
        if (!result.clientId || !result.threadId) {
          if (result.didExceedRateLimit) {
            toast.error("Rate limit exceeded");
            return;
          }
          toast.error("Failed to send DM");
          return;
        }
        const res = await fetch("/api/dm-bestsellers/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            authorId,
            handle: sendTarget.authorHandle,
            name: sendTarget.authorName ?? sendTarget.publicationName,
            clientId: result.clientId,
            threadId: result.threadId,
          }),
        });
        const data = (await res.json()) as {
          status: BestsellerDM;
          error?: string;
        };
        if (!res.ok || data.error) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        setStatusByAuthor((prev) => {
          const next = new Map(prev);
          next.set(authorId, data.status);
          return next;
        });
        setSendTarget(null);
        const threadId = result.threadId;
        toast.success(
          `DM sent to ${sendTarget.authorName ?? sendTarget.publicationName}`,
          {
            action: {
              label: "See DM",
              onClick: () => {
                window.open(
                  `https://substack.com/chat/${threadId}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              },
            },
          },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Send failed";
        toast.error(`Send failed: ${message}`);
      } finally {
        setSendingAuthorIds((prev) => {
          const next = new Set(prev);
          next.delete(authorId);
          return next;
        });
      }
    },
    [sendTarget, callExtension],
  );

  const visibleBestsellers = useMemo(() => {
    const filtered = filterEligibleBestsellers(bestsellers, statusByAuthor);
    const sorted = sortBestsellersByDmStatus(filtered, statusByAuthor, sortOrder);
    return rerankBestsellers(sorted, page * BESTSELLER_PAGE_SIZE);
  }, [bestsellers, statusByAuthor, page, sortOrder]);

  const handleVerifyAll = useCallback(async () => {
    if (!extensionReady) {
      toast.error("Chrome extension is not reachable");
      return;
    }
    const now = new Date();
    const toCheck = visibleBestsellers;
    // .filter((b) =>
    //   needsExtensionCheck(b, statusByAuthor, now),
    // );
    if (toCheck.length === 0) {
      toast.success("Everything is fresh — no checks needed.");
      return;
    }

    setIsVerifying(true);

    let success = 0;
    let failed = 0;
    let saveFailed = 0;

    const batches = batch(toCheck, DM_VERIFY_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batchItems = batches[i]!;
      const batchAuthorIds = batchItems
        .map((item) => item.authorId)
        .filter((id): id is number => id != null);

      setInFlightByAuthor((prev) => new Set([...prev, ...batchAuthorIds]));

      const batchUpserts: DmStatusUpsertEntry[] = [];

      await Promise.all(
        batchItems.map(async (b) => {
          const authorId = b.authorId;
          if (authorId == null) return;
          try {
            const result = await callExtension("didSendADM", [authorId]);
            batchUpserts.push({
              authorId,
              handle: b.authorHandle,
              name: b.authorName ?? b.publicationName,
              wasSent: result.didSendDm,
              sentAt: result.didSendDm
                ? (result.lastReplyAt ?? new Date().toISOString())
                : null,
              lastReplyAt: result.lastReplyAt,
              canSendDm: canSendDmFromExtensionResult(result),
            });
            success += 1;
          } catch (err) {
            console.error("didSendADM failed", err);
            failed += 1;
          }
        }),
      );

      if (batchUpserts.length > 0) {
        try {
          await persistDmStatuses(batchUpserts);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Save failed";
          console.error("DM-status batch save failed", err);
          toast.error(`DM-status save failed: ${message}`);
          saveFailed += batchUpserts.length;
        }
      }

      setInFlightByAuthor((prev) => {
        const next = new Set(prev);
        for (const id of batchAuthorIds) next.delete(id);
        return next;
      });

      if (i < batches.length - 1) {
        await delay(DM_VERIFY_BATCH_DELAY_MS);
      }
    }

    setIsVerifying(false);
    if (failed > 0 || saveFailed > 0) {
      toast.warning(
        `Verified ${success}, ${failed} check failed, ${saveFailed} save failed`,
      );
    } else {
      toast.success(`Verified ${success} authors`);
    }
  }, [
    visibleBestsellers,
    extensionReady,
    callExtension,
    persistDmStatuses,
  ]);

  const handleEligiblizeAll = useCallback(async () => {
    const toCheck = visibleBestsellers.filter((b) =>
      needsEligibilityCheck(b, statusByAuthor),
    );
    if (toCheck.length === 0) {
      toast.success("All eligibility checked — nothing to do.");
      return;
    }

    setIsEligiblizing(true);

    let success = 0;
    let failed = 0;

    const batches = batch(toCheck, DM_ELIGIBILITY_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batchItems = batches[i]!;
      const batchAuthorIds = batchItems
        .map((item) => item.authorId)
        .filter((id): id is number => id != null);

      setEligibilityCheckingAuthorIds((prev) =>
        new Set([...prev, ...batchAuthorIds]),
      );

      const runBatch = async () => checkEligibility(batchAuthorIds);

      try {
        await runBatch();
        success += batchAuthorIds.length;
      } catch (err) {
        if (isEligibilityRateLimitError(err)) {
          toast.info("Rate limited — waiting 15s before retry…");
          await delay(DM_ELIGIBILITY_RATE_LIMIT_RETRY_MS);
          try {
            await runBatch();
            success += batchAuthorIds.length;
          } catch (retryErr) {
            console.error("Eligibility batch retry failed", retryErr);
            failed += batchAuthorIds.length;
            const message =
              retryErr instanceof Error
                ? retryErr.message
                : "Eligibility check failed";
            toast.error(`Eligibility check failed after retry: ${message}`);
          }
        } else {
          console.error("Eligibility batch check failed", err);
          failed += batchAuthorIds.length;
          const message =
            err instanceof Error ? err.message : "Eligibility check failed";
          toast.error(`Eligibility check failed: ${message}`);
        }
      }

      setEligibilityCheckingAuthorIds((prev) => {
        const next = new Set(prev);
        for (const id of batchAuthorIds) next.delete(id);
        return next;
      });

      if (i < batches.length - 1) {
        await delay(DM_ELIGIBILITY_BATCH_DELAY_MS);
      }
    }

    setIsEligiblizing(false);
    if (failed > 0) {
      toast.warning(`Checked ${success} authors, ${failed} failed`);
    } else {
      toast.success(`Checked eligibility for ${success} authors`);
    }
  }, [visibleBestsellers, statusByAuthor, checkEligibility]);

  const actionStateByAuthorId = useMemo(() => {
    const map = new Map<number, DmActionState>();
    for (const b of visibleBestsellers) {
      if (b.authorId == null) continue;
      map.set(
        b.authorId,
        getActionStateForBestseller(b, statusByAuthor, sendingAuthorIds),
      );
    }
    return map;
  }, [visibleBestsellers, statusByAuthor, sendingAuthorIds]);

  const verifyEligibleStateByAuthorId = useMemo(() => {
    const map = new Map<number, VerifyEligibleActionState>();
    for (const b of visibleBestsellers) {
      if (b.authorId == null) continue;
      map.set(
        b.authorId,
        getVerifyEligibleStateForBestseller(
          b,
          statusByAuthor,
          eligibilityCheckingAuthorIds,
        ),
      );
    }
    return map;
  }, [visibleBestsellers, statusByAuthor, eligibilityCheckingAuthorIds]);

  const verifyStateByAuthorId = useMemo(() => {
    const map = new Map<number, VerifyActionState>();
    for (const b of visibleBestsellers) {
      if (b.authorId == null) continue;
      map.set(
        b.authorId,
        getVerifyStateForBestseller(b, inFlightByAuthor, extensionReady),
      );
    }
    return map;
  }, [visibleBestsellers, inFlightByAuthor, extensionReady]);

  const pendingCount = useMemo(() => {
    const now = new Date();
    return visibleBestsellers.filter((b) =>
      needsExtensionCheck(b, statusByAuthor, now),
    ).length;
  }, [visibleBestsellers, statusByAuthor]);

  const pendingEligibilityCount = useMemo(
    () =>
      visibleBestsellers.filter((b) =>
        needsEligibilityCheck(b, statusByAuthor),
      ).length,
    [visibleBestsellers, statusByAuthor],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">DM Bestsellers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Substack bestsellers across categories, loaded from the directory
            database.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleVerifyAll}
            disabled={
              !extensionReady ||
              isVerifying ||
              pendingCount === 0 ||
              isLoadingList
            }
            aria-label="Verify DM status for all bestsellers on this page via extension"
          >
            {isVerifying ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-2" />
            )}
            {isVerifying
              ? "Verifying…"
              : pendingCount === 0
                ? "All fresh"
                : `Verify ${pendingCount} on page`}
          </Button>
          <Button
            variant="outline"
            onClick={handleEligiblizeAll}
            disabled={
              isEligiblizing ||
              pendingEligibilityCount === 0 ||
              isLoadingList
            }
            aria-label="Check note eligibility for all unchecked bestsellers on this page"
          >
            {isEligiblizing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <NotepadText className="h-4 w-4 mr-2" />
            )}
            {isEligiblizing
              ? "Checking…"
              : pendingEligibilityCount === 0
                ? "All checked"
                : `Eligiblize ${pendingEligibilityCount} on page`}
          </Button>
        </div>
      </div>

      {availability === "unavailable" ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium">Chrome extension not detected</div>
              <div className="text-xs mt-1 space-y-1">
                {unavailableReason ? (
                  <p>
                    <span className="font-medium">Reason:</span>{" "}
                    {unavailableReason}
                  </p>
                ) : null}
                {extensionId ? (
                  <p>
                    <span className="font-medium">Configured ID:</span>{" "}
                    <code className="text-[11px]">{extensionId}</code>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshExtension()}
            className="shrink-0 border-amber-400 bg-white hover:bg-amber-100"
            aria-label="Retry extension detection"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Retry
          </Button>
        </div>
      ) : null}

      <CategoryTabs
        categories={categories}
        selectedKey={selectedCategoryKey}
        onSelect={handleCategorySelect}
      />

      {listError ? (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 text-red-900 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>Failed to load bestsellers: {listError}</div>
        </div>
      ) : null}

      <div className="space-y-3">
        {selectedCategory ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {isLoadingList ? (
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Loading bestsellers…
                </span>
              ) : (
                <>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {selectedCategory.name}
                  </span>
                  {total > 0 ? ` · ${total} total` : null} — DM status fresh for{" "}
                  {DM_FRESHNESS_DAYS} days.
                </>
              )}
            </div>
            <Select
              value={sortOrder}
              onValueChange={(value) =>
                setSortOrder(value as BestsellerSortOrder)
              }
            >
              <SelectTrigger
                className="w-[180px] h-9"
                aria-label="Order bestsellers by DM status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="already-sent">Already sent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <BestsellerList
          isLoading={isLoadingList}
          bestsellers={visibleBestsellers}
          actionStateByAuthorId={actionStateByAuthorId}
          verifyStateByAuthorId={verifyStateByAuthorId}
          verifyEligibleStateByAuthorId={verifyEligibleStateByAuthorId}
          onVerify={handleVerifySingle}
          onVerifyEligible={handleVerifyEligible}
          onSend={handleSendClick}
          onDismiss={handleDismiss}
        />

        <SendDmDialog
          open={sendTarget != null}
          onOpenChange={(open) => {
            if (!open) setSendTarget(null);
          }}
          bestseller={sendTarget}
          isSending={
            sendTarget?.authorId != null &&
            sendingAuthorIds.has(sendTarget.authorId)
          }
          onConfirm={handleSendConfirm}
        />

        <BestsellerPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={BESTSELLER_PAGE_SIZE}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};
