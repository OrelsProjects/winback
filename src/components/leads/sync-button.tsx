"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export const SyncButton = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync/run", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        addedCount?: number;
        updatedCount?: number;
        excludedCount?: number;
      };

      if (!res.ok || data.error) {
        toast.error(`Sync failed: ${data.error ?? "Unknown error"}`);
        return;
      }

      toast.success(
        `Sync complete — +${data.addedCount ?? 0} added, ${data.updatedCount ?? 0} updated, ${data.excludedCount ?? 0} excluded`,
      );
      router.refresh();
    } catch (err) {
      toast.error("Sync request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={loading}
      aria-label="Sync leads from WriteStack"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Syncing…" : "Sync now"}
    </Button>
  );
};
