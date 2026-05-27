"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  sent: number;
  cap: number;
};

export const DailyCapPill = ({ sent, cap }: Props) => {
  const pct = cap > 0 ? sent / cap : 0;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-sm font-medium",
        pct >= 1 && "border-destructive text-destructive",
        pct >= 0.9 && pct < 1 && "border-amber-500 text-amber-600",
      )}
    >
      {sent} / {cap} sent today
    </Badge>
  );
};
