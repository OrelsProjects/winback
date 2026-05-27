"use client";

import type { Bestseller } from "@/lib/substack/discover";
import { BestsellerRow } from "./bestseller-row";
import type { DmActionState, VerifyActionState, VerifyEligibleActionState } from "./dm-action-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Inbox } from "lucide-react";

type Props = {
  isLoading: boolean;
  bestsellers: Bestseller[];
  /** authorId -> send action state. Missing entries default to "idle". */
  actionStateByAuthorId: Map<number, DmActionState>;
  /** authorId -> verify action state. Missing entries default to "disabled". */
  verifyStateByAuthorId: Map<number, VerifyActionState>;
  /** authorId -> note-eligibility verify state. Missing entries default to "disabled". */
  verifyEligibleStateByAuthorId: Map<number, VerifyEligibleActionState>;
  onVerify: (b: Bestseller) => void;
  onVerifyEligible: (b: Bestseller) => void;
  onSend: (b: Bestseller) => void;
  onDismiss: (b: Bestseller) => void;
};

export const BestsellerList = ({
  isLoading,
  bestsellers,
  actionStateByAuthorId,
  verifyStateByAuthorId,
  verifyEligibleStateByAuthorId,
  onVerify,
  onVerifyEligible,
  onSend,
  onDismiss,
}: Props) => {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (bestsellers.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 gap-3">
        <Inbox className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground font-medium">No bestsellers</p>
        <p className="text-sm text-muted-foreground">
          Substack returned an empty list for this category.
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y">
      {bestsellers.map((b) => {
        const state = b.authorId
          ? (actionStateByAuthorId.get(b.authorId) ?? "idle")
          : "disabled";
        const verifyState = b.authorId
          ? (verifyStateByAuthorId.get(b.authorId) ?? "disabled")
          : "disabled";
        const verifyEligibleState = b.authorId
          ? (verifyEligibleStateByAuthorId.get(b.authorId) ?? "idle")
          : "disabled";
        return (
          <BestsellerRow
            key={`${b.publicationId}-${b.rank}`}
            bestseller={b}
            actionState={state}
            verifyState={verifyState}
            verifyEligibleState={verifyEligibleState}
            onVerify={onVerify}
            onVerifyEligible={onVerifyEligible}
            onSend={onSend}
            onDismiss={onDismiss}
          />
        );
      })}
    </Card>
  );
};
