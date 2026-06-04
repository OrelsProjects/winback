import type { Prisma } from "@/generated-directory/client";
import {
  BESTSELLER_PAGE_SIZE,
} from "@/lib/dm-bestsellers/constants";
import {
  filterEligibleBestsellers,
  filterNonSubscriberBestsellers,
  rerankBestsellers,
  sortBestsellersByDmStatus,
  DEFAULT_BESTSELLER_SORT_ORDER,
} from "@/lib/dm-bestsellers/eligible-for-display";
import { directoryPrisma } from "@/lib/db/directory-prisma";
import { prisma } from "@/lib/db/prisma";
import {
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
    // { paidSubscriberMagnitude: "desc" },
    { categoryRank: "asc" },
    { freeSubscriberCount: "desc" },
  ];
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
  const where = await getPublicationWhere(params.categoryKey);
  const orderBy = getPublicationOrderBy(params.categoryKey);
  const skip = page * pageSize;

  const [total, rows] = await Promise.all([
    directoryPrisma.publication.count({ where }),
    directoryPrisma.publication.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: publicationSelect,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    bestsellers: rows.map((row, index) =>
      mapDirectoryPublication(row, skip + index + 1),
    ),
    total,
    page,
    pageSize,
    totalPages,
    more: page + 1 < totalPages,
  };
};

/** Page DM bestsellers by note-eligibility priority, then directory rank. */
export const getDmBestsellersPage = async (params: {
  categoryKey: string;
  page?: number;
  pageSize?: number;
}): Promise<BestsellerPageResult> => {
  const pageSize = params.pageSize ?? BESTSELLER_PAGE_SIZE;
  const page = Math.max(0, params.page ?? 0);
  const where = await getPublicationWhere(params.categoryKey);
  const orderBy = getPublicationOrderBy(params.categoryKey);

  const rows = await directoryPrisma.publication.findMany({
    where,
    orderBy,
    select: publicationSelect,
  });

  const authorIds = rows
    .map((row) => row.substackAuthorId)
    .filter((id): id is NonNullable<typeof id> => id != null)
    .map((id) => Number(id));

  const statuses =
    authorIds.length === 0
      ? []
      : await prisma.bestsellerDM.findMany({
          where: { authorId: { in: authorIds } },
        });

  const statusByAuthor = new Map(statuses.map((row) => [row.authorId, row]));
  const allBestsellers = rows.map((row, index) =>
    mapDirectoryPublication(row, index + 1),
  );
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
