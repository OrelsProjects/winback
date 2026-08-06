import { Suspense } from "react";
import { getDiscoverCategories } from "@/lib/dm-bestsellers/sync-bestsellers";
import { Skeleton } from "@/components/ui/skeleton";
import { DmBestsellersPageClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function DmBestsellersPage() {
  const categories = await getDiscoverCategories();

  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
      <DmBestsellersPageClient categories={categories} />
    </Suspense>
  );
}
