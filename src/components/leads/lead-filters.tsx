"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search } from "lucide-react";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

const TABS = [
  { value: "all", label: "All" },
  { value: "canceled", label: "Canceled" },
  { value: "never", label: "Never subscribed" },
  { value: "not-emailed", label: "Not sent email to" },
  { value: "reminders", label: "Reminders" },
  { value: "excluded", label: "Excluded" },
] as const;

const SORT_OPTIONS = [
  { value: "createdAt", label: "Sign-up date" },
  { value: "subscriptionCanceledAt", label: "Canceled date" },
  { value: "lastEmailedAt", label: "Last emailed" },
  { value: "emailCount", label: "Email count" },
] as const;

export const LeadFilters = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentTab = searchParams.get("tab") ?? "all";
  const currentSort = searchParams.get("sort") ?? "createdAt";
  const currentDir = searchParams.get("dir") ?? "desc";
  const currentQ = searchParams.get("q") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router],
  );

  const handleSearch = useDebouncedCallback((value: string) => {
    updateParams({ q: value });
  }, 300);

  const handleTabChange = (tab: string) => updateParams({ tab });
  const handleSortChange = (sort: string) => updateParams({ sort });
  const handleDirToggle = () => updateParams({ dir: currentDir === "desc" ? "asc" : "desc" });

  return (
    <div className="space-y-3">
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by email, name, handle…"
            defaultValue={currentQ}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={currentSort} onValueChange={handleSortChange}>
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={currentDir} onValueChange={(v) => updateParams({ dir: v })}>
              <DropdownMenuRadioItem value="desc">Newest first</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="asc">Oldest first</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
