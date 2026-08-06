import type { Prisma } from "@/generated-directory/client";
import {
  BESTSELLER_CATEGORY_SYNC_DELAY_MS,
  BESTSELLER_PAGE_SIZE,
} from "@/lib/dm-bestsellers/constants";
import {
  filterEligibleBestsellers,
  filterNonSubscriberBestsellers,
  rerankBestsellers,
  sortBestsellersByDmStatus,
  DEFAULT_BESTSELLER_SORT_ORDER,
} from "@/lib/dm-bestsellers/eligible-for-display";
import { delay } from "@/lib/batch";
import { directoryPrisma } from "@/lib/db/directory-prisma";
import { prisma } from "@/lib/db/prisma";
import {
  fetchAllBestsellersFromSubstack,
  isLeaderboardCategoryKey,
  LEADERBOARD_CATEGORY,
  type Bestseller,
  type DiscoverCategory,
} from "@/lib/substack/discover";

const publicationSelect = {
  substackPublicationId: true,
  name: true,
  subdomain: true,
  customDomain: true,
  logoUrl: true,
  bestsellerTier: true,
  substackAuthorId: true,
  authorName: true,
  authorHandle: true,
  authorPhotoUrl: true,
} satisfies Prisma.PublicationSelect;

type DirectoryPublication = Prisma.PublicationGetPayload<{
  select: typeof publicationSelect;
}>;

const parseSubstackCategoryId = (substackId: string): number | null => {
  const id = Number(substackId);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const mapDirectoryCategory = (row: {
  id: number;
  substackId: string;
  label: string;
  slug: string;
}): DiscoverCategory => ({
  categoryKey: row.slug,
  name: row.label,
  slug: row.slug,
  substackCategoryId: parseSubstackCategoryId(row.substackId),
  directoryCategoryId: row.id,
});

const buildPublicationUrl = (
  pub: Pick<DirectoryPublication, "subdomain" | "customDomain">,
) =>
  pub.customDomain
    ? `https://${pub.customDomain}`
    : `https://${pub.subdomain}.substack.com`;

const mapDirectoryPublication = (
  pub: DirectoryPublication,
  rank: number,
): Bestseller => ({
  rank,
  publicationId: Number(pub.substackPublicationId),
  publicationName: pub.name,
  publicationUrl: buildPublicationUrl(pub),
  subdomain: pub.subdomain,
  logoUrl: pub.logoUrl ?? null,
  bestsellerTier: pub.bestsellerTier ?? null,
  authorId:
    pub.substackAuthorId != null ? Number(pub.substackAuthorId) : null,
  authorName: pub.authorName ?? null,
  authorHandle: pub.authorHandle ?? null,
  authorPhotoUrl: pub.authorPhotoUrl ?? null,
});

const mapCachedEntry = (row: {
  rank: number;
  publicationId: number;
  publicationName: string;
  publicationUrl: string;
  subdomain: string;
  logoUrl: string | null;
  bestsellerTier: number | null;
  authorId: number | null;
  authorName: string | null;
  authorHandle: string | null;
  authorPhotoUrl: string | null;
}): Bestseller => ({
  rank: row.rank,
  publicationId: row.publicationId,
  publicationName: row.publicationName,
  publicationUrl: row.publicationUrl,
  subdomain: row.subdomain,
  logoUrl: row.logoUrl,
  bestsellerTier: row.bestsellerTier,
  authorId: row.authorId,
  authorName: row.authorName,
  authorHandle: row.authorHandle,
  authorPhotoUrl: row.authorPhotoUrl,
});

/** Load discover tabs from the directory DB (+ synthetic New Bestsellers tab). */
export const getDiscoverCategories = async (): Promise<DiscoverCategory[]> => {
  const rows = await directoryPrisma.category.findMany({
    orderBy: { label: "asc" },
  });

  return [LEADERBOARD_CATEGORY, ...rows.map(mapDirectoryCategory)];
};

export const resolveDiscoverCategory = async (
  categoryKey: string,
): Promise<DiscoverCategory> => {
  if (isLeaderboardCategoryKey(categoryKey)) {
    return LEADERBOARD_CATEGORY;
  }

  const row = await directoryPrisma.category.findUnique({
    where: { slug: categoryKey },
  });
  if (!row) {
    throw new Error(`Unknown category: ${categoryKey}`);
  }

  return mapDirectoryCategory(row);
};

const getPublicationWhere = async (
  categoryKey: string,
): Promise<Prisma.PublicationWhereInput> => {
  if (isLeaderboardCategoryKey(categoryKey)) {
    return {
      isListed: true,
      bestsellerTier: { gt: 0 },
    };
  }

  const category = await resolveDiscoverCategory(categoryKey);
  if (!category.directoryCategoryId) {
    throw new Error(`Unknown category: ${categoryKey}`);
  }

  return {
    isListed: true,
    categoryId: category.directoryCategoryId,
  };
};

const getPublicationOrderBy = (
  categoryKey: string,
): Prisma.PublicationOrderByWithRelationInput[] => {
  if (isLeaderboardCategoryKey(categoryKey)) {
    return [
      { categoryRank: "asc" },
      { paidSubscriberMagnitude: "desc" },
      { freeSubscriberCount: "desc" },
    ];
  }

  return [
    { categoryRank: "asc" },
    { freeSubscriberCount: "desc" },
  ];
};

const ensureBestsellerCategory = async (category: DiscoverCategory) => {
  await prisma.bestsellerCategory.upsert({
    where: { categoryKey: category.categoryKey },
    create: {
      categoryKey: category.categoryKey,
      name: category.name,
      slug: category.slug,
      emoji: category.emoji ?? null,
      substackCategoryId: category.substackCategoryId ?? null,
      leaderboardDescription: category.leaderboardDescription ?? null,
    },
    update: {
      name: category.name,
      slug: category.slug,
      emoji: category.emoji ?? null,
      substackCategoryId: category.substackCategoryId ?? null,
      leaderboardDescription: category.leaderboardDescription ?? null,
    },
  });
};

const saveBestsellersForCategory = async (
  categoryKey: string,
  bestsellers: Bestseller[],
) => {
  const now = new Date();
  await prisma.$transaction([
    prisma.bestsellerEntry.deleteMany({ where: { categoryKey } }),
    prisma.bestsellerEntry.createMany({
      data: bestsellers.map((b) => ({
        categoryKey,
        rank: b.rank,
        publicationId: b.publicationId,
        publicationName: b.publicationName,
        publicationUrl: b.publicationUrl,
        subdomain: b.subdomain,
        logoUrl: b.logoUrl,
        bestsellerTier: b.bestsellerTier,
        authorId: b.authorId,
        authorName: b.authorName,
        authorHandle: b.authorHandle,
        authorPhotoUrl: b.authorPhotoUrl,
      })),
    }),
    prisma.bestsellerCategory.update({
      where: { categoryKey },
      data: { fetchedAt: now },
    }),
  ]);
};

export type SyncCategoryResult = {
  categoryKey: string;
  name: string;
  count: number;
  ok: true;
} | {
  categoryKey: string;
  name: string;
  ok: false;
  error: string;
};

/** Fetch all Substack pages for one category and replace the local cache. */
export const syncBestsellersForCategory = async (
  category: DiscoverCategory,
): Promise<Extract<SyncCategoryResult, { ok: true }>> => {
  if (
    !isLeaderboardCategoryKey(category.categoryKey) &&
    category.substackCategoryId == null
  ) {
    throw new Error(`Missing substackCategoryId for ${category.categoryKey}`);
  }

  await ensureBestsellerCategory(category);
  const bestsellers = await fetchAllBestsellersFromSubstack({
    categoryKey: category.categoryKey,
    substackCategoryId: category.substackCategoryId,
  });
  await saveBestsellersForCategory(category.categoryKey, bestsellers);

  return {
    categoryKey: category.categoryKey,
    name: category.name,
    count: bestsellers.length,
    ok: true,
  };
};

/** Sync every discover category from Substack into the local cache. */
export const syncAllBestsellersFromSubstack = async (): Promise<{
  results: SyncCategoryResult[];
  syncedCount: number;
  failedCount: number;
  totalEntries: number;
}> => {
  const categories = await getDiscoverCategories();
  const results: SyncCategoryResult[] = [];

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i]!;
    try {
      results.push(await syncBestsellersForCategory(category));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        categoryKey: category.categoryKey,
        name: category.name,
        ok: false,
        error: message,
      });
    }

    if (i < categories.length - 1) {
      await delay(BESTSELLER_CATEGORY_SYNC_DELAY_MS);
    }
  }

  const synced = results.filter((r) => r.ok);
  return {
    results,
    syncedCount: synced.length,
    failedCount: results.length - synced.length,
    totalEntries: synced.reduce((sum, r) => sum + r.count, 0),
  };
};

/** Prefer Substack cache when present; otherwise null. */
const getCachedBestsellers = async (
  categoryKey: string,
): Promise<Bestseller[] | null> => {
  const category = await prisma.bestsellerCategory.findUnique({
    where: { categoryKey },
    select: { fetchedAt: true },
  });
  if (!category?.fetchedAt) return null;

  const rows = await prisma.bestsellerEntry.findMany({
    where: { categoryKey },
    orderBy: { rank: "asc" },
  });
  if (rows.length === 0) return null;

  return rows.map(mapCachedEntry);
};

const getDirectoryBestsellers = async (
  categoryKey: string,
): Promise<Bestseller[]> => {
  const where = await getPublicationWhere(categoryKey);
  const orderBy = getPublicationOrderBy(categoryKey);
  const rows = await directoryPrisma.publication.findMany({
    where,
    orderBy,
    select: publicationSelect,
  });
  return rows.map((row, index) => mapDirectoryPublication(row, index + 1));
};

const loadAllBestsellers = async (categoryKey: string): Promise<Bestseller[]> => {
  const cached = await getCachedBestsellers(categoryKey);
  if (cached) return cached;
  return getDirectoryBestsellers(categoryKey);
};

export type BestsellerPageResult = {
  bestsellers: Bestseller[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  more: boolean;
};

export const getBestsellersPage = async (params: {
  categoryKey: string;
  page?: number;
  pageSize?: number;
}): Promise<BestsellerPageResult> => {
  const pageSize = params.pageSize ?? BESTSELLER_PAGE_SIZE;
  const page = Math.max(0, params.page ?? 0);
  const all = await loadAllBestsellers(params.categoryKey);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const skip = page * pageSize;

  return {
    bestsellers: all.slice(skip, skip + pageSize),
    total,
    page,
    pageSize,
    totalPages,
    more: page + 1 < totalPages,
  };
};

/** Page DM bestsellers by note-eligibility priority, then rank. */
export const getDmBestsellersPage = async (params: {
  categoryKey: string;
  page?: number;
  pageSize?: number;
}): Promise<BestsellerPageResult> => {
  const pageSize = params.pageSize ?? BESTSELLER_PAGE_SIZE;
  const page = Math.max(0, params.page ?? 0);
  const allBestsellers = await loadAllBestsellers(params.categoryKey);

  const authorIds = allBestsellers
    .map((row) => row.authorId)
    .filter((id): id is number => id != null);

  const statuses =
    authorIds.length === 0
      ? []
      : await prisma.bestsellerDM.findMany({
          where: { authorId: { in: authorIds } },
        });

  const statusByAuthor = new Map(statuses.map((row) => [row.authorId, row]));
  const filtered = filterEligibleBestsellers(allBestsellers, statusByAuthor);
  const nonSubscribers = filterNonSubscriberBestsellers(
    filtered,
    statusByAuthor,
  );
  const sorted = sortBestsellersByDmStatus(
    nonSubscribers,
    statusByAuthor,
    DEFAULT_BESTSELLER_SORT_ORDER,
  );

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const skip = page * pageSize;
  const pageSlice = sorted.slice(skip, skip + pageSize);

  return {
    bestsellers: rerankBestsellers(pageSlice, skip),
    total,
    page,
    pageSize,
    totalPages,
    more: page + 1 < totalPages,
  };
};

/** @deprecated Use getDiscoverCategories */
export const syncDiscoverCategories = getDiscoverCategories;
