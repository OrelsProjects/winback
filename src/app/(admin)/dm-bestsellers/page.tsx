import { getDiscoverCategories } from "@/lib/dm-bestsellers/sync-bestsellers";
import { DmBestsellersPageClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function DmBestsellersPage() {
  const categories = await getDiscoverCategories();

  return <DmBestsellersPageClient categories={categories} />;
}
