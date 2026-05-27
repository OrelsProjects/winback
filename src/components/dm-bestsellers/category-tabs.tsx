"use client";

import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { DiscoverCategory } from "@/lib/substack/discover";

type Props = {
  categories: DiscoverCategory[];
  selectedKey: string | null;
  onSelect: (categoryKey: string) => void;
};

export const CategoryTabs = ({ categories, selectedKey, onSelect }: Props) => (
  <ScrollArea className="w-full whitespace-nowrap">
    <div className="flex items-center gap-2 pb-3">
      {categories.map((cat) => {
        const isActive = selectedKey === cat.categoryKey;
        return (
          <button
            key={cat.categoryKey}
            type="button"
            onClick={() => onSelect(cat.categoryKey)}
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`Show bestsellers in ${cat.name}`}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
              isActive
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary/50",
            )}
          >
            {cat.emoji ? <span className="mr-1.5">{cat.emoji}</span> : null}
            {cat.name}
          </button>
        );
      })}
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);
