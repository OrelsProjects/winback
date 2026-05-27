/**
 * Server-side proxy for Substack's public discover endpoints.
 *
 * Endpoints used (no auth):
 *   GET https://substack.com/api/v1/categories
 *   GET https://substack.com/api/v1/category/public/{categoryId}/{tier}?page=N
 *   GET https://substack.com/api/v1/category/leaderboard/bestseller/trending?page=N
 */

import {
  LEADERBOARD_CATEGORY_KEY,
  SUBSTACK_API_PAGE_SIZE,
} from "@/lib/dm-bestsellers/constants";

const SUBSTACK_BASE = "https://substack.com/api/v1";

const COMMON_HEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
  Origin: "https://substack.com",
  Referer: "https://substack.com/discover",
};

export type DiscoverCategory = {
  categoryKey: string;
  name: string;
  slug: string;
  emoji?: string | null;
  leaderboardDescription?: string | null;
  /** Substack API category id (from directory `categories.substack_id`). */
  substackCategoryId?: number | null;
  /** Internal row id in the directory database. */
  directoryCategoryId?: number | null;
};

/** @deprecated Use DiscoverCategory */
export type SubstackCategory = DiscoverCategory;

export type BestsellerTier = "all" | "paid" | "free";

type RawPublication = {
  id: number;
  subdomain: string;
  name: string;
  hero_text?: string | null;
  language?: string | null;
  base_url?: string | null;
  hostname?: string | null;
  custom_domain?: string | null;
  logo_url?: string | null;
  cover_photo_url?: string | null;
  hero_image?: string | null;
  author_bestseller_tier?: number | null;
  primary_author?: {
    id: number;
    name: string;
    handle?: string | null;
    photo_url?: string | null;
    bio?: string | null;
  } | null;
};

export type Bestseller = {
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
};

type LeaderboardResponse = {
  publications: RawPublication[];
  more: boolean;
  title?: string;
};

export const LEADERBOARD_CATEGORY: DiscoverCategory = {
  categoryKey: LEADERBOARD_CATEGORY_KEY,
  name: "New Bestsellers",
  slug: "leaderboard",
  emoji: "✨",
  substackCategoryId: null,
  leaderboardDescription:
    "Fast-growing publishers who became Bestsellers in the past 30 days",
};

const buildPublicationUrl = (pub: RawPublication) =>
  pub.base_url ??
  (pub.custom_domain
    ? `https://${pub.custom_domain}`
    : `https://${pub.subdomain}.substack.com`);

export const mapPublication = (pub: RawPublication, rank: number): Bestseller => ({
  rank,
  publicationId: pub.id,
  publicationName: pub.name,
  publicationUrl: buildPublicationUrl(pub),
  subdomain: pub.subdomain,
  logoUrl: pub.logo_url ?? null,
  bestsellerTier: pub.author_bestseller_tier ?? null,
  authorId: pub.primary_author?.id ?? null,
  authorName: pub.primary_author?.name ?? null,
  authorHandle: pub.primary_author?.handle ?? null,
  authorPhotoUrl: pub.primary_author?.photo_url ?? null,
});

const fetchLeaderboardPage = async (
  page: number,
): Promise<LeaderboardResponse> => {
  const url = `${SUBSTACK_BASE}/category/leaderboard/bestseller/trending?page=${page}`;
  const res = await fetch(url, {
    headers: COMMON_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Substack trending bestsellers ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<LeaderboardResponse>;
};

const fetchCategoryLeaderboardPage = async (params: {
  categoryId: number;
  tier: BestsellerTier;
  page: number;
}): Promise<LeaderboardResponse> => {
  const url = `${SUBSTACK_BASE}/category/public/${params.categoryId}/${params.tier}?page=${params.page}`;
  const res = await fetch(url, {
    headers: COMMON_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Substack bestsellers ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<LeaderboardResponse>;
};

/** Paginate Substack until `more === false`, returning every publication with global rank. */
export const fetchAllBestsellersFromSubstack = async (params: {
  categoryKey: string;
  substackCategoryId?: number | null;
  tier?: BestsellerTier;
}): Promise<Bestseller[]> => {
  const tier = params.tier ?? "all";
  const all: Bestseller[] = [];
  let rank = 0;

  for (let page = 0; page < 500; page++) {
    const data =
      params.categoryKey === LEADERBOARD_CATEGORY_KEY
        ? await fetchLeaderboardPage(page)
        : await fetchCategoryLeaderboardPage({
            categoryId: params.substackCategoryId!,
            tier,
            page,
          });

    for (const pub of data.publications ?? []) {
      rank += 1;
      all.push(mapPublication(pub, rank));
    }

    if (!data.more || (data.publications?.length ?? 0) === 0) break;
  }

  return all;
};

type RawSubstackCategory = {
  id: number;
  name: string;
  slug: string;
  emoji?: string | null;
  leaderboard_description?: string | null;
};

export const fetchSubstackCategories = async (): Promise<DiscoverCategory[]> => {
  const res = await fetch(`${SUBSTACK_BASE}/categories`, {
    headers: COMMON_HEADERS,
    next: { revalidate: 60 * 60 * 6 },
  });
  if (!res.ok) {
    throw new Error(`Substack categories ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as RawSubstackCategory[];
  return data
    .filter((c) => c?.id != null && c.slug !== "podcast")
    .map((c) => ({
      categoryKey: String(c.id),
      name: c.name,
      slug: c.slug,
      emoji: c.emoji ?? null,
      leaderboardDescription: c.leaderboard_description ?? null,
      substackCategoryId: c.id,
    }));
};

/** @deprecated Prefer fetchAllBestsellersFromSubstack + DB cache */
export const fetchBestsellersForCategory = async (params: {
  categoryId: number;
  tier?: BestsellerTier;
  page?: number;
}): Promise<{ bestsellers: Bestseller[]; more: boolean }> => {
  const tier = params.tier ?? "all";
  const page = params.page ?? 0;
  const data = await fetchCategoryLeaderboardPage({
    categoryId: params.categoryId,
    tier,
    page,
  });
  return {
    bestsellers: (data.publications ?? []).map((pub, i) =>
      mapPublication(pub, page * SUBSTACK_API_PAGE_SIZE + i + 1),
    ),
    more: Boolean(data.more),
  };
};

export const isLeaderboardCategoryKey = (categoryKey: string) =>
  categoryKey === LEADERBOARD_CATEGORY_KEY;

export const isBestsellerTier = (tier: number | null | undefined): boolean =>
  tier != null && tier > 0;

/** Prefer the author's Substack profile when we have a handle. */
export const buildCreatorUrl = (bestseller: Bestseller): string => {
  const raw = bestseller.authorHandle?.trim();
  if (!raw) return bestseller.publicationUrl;
  const handle = raw.startsWith("@") ? raw.slice(1) : raw;
  return `https://substack.com/@${handle}`;
};
