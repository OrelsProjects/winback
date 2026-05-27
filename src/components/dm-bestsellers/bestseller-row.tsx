"use client";

import type { KeyboardEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BadgeCheck, X } from "lucide-react";
import type { Bestseller } from "@/lib/substack/discover";
import { buildCreatorUrl, isBestsellerTier } from "@/lib/substack/discover";
import {
  DmActionButton,
  VerifyActionButton,
  VerifyEligibleActionButton,
  type DmActionState,
  type VerifyActionState,
  type VerifyEligibleActionState,
} from "./dm-action-button";

type Props = {
  bestseller: Bestseller;
  actionState: DmActionState;
  verifyState: VerifyActionState;
  verifyEligibleState: VerifyEligibleActionState;
  onVerify?: (b: Bestseller) => void;
  onVerifyEligible?: (b: Bestseller) => void;
  onSend?: (b: Bestseller) => void;
  onDismiss?: (b: Bestseller) => void;
};

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const BestsellerRow = ({
  bestseller,
  actionState,
  verifyState,
  verifyEligibleState,
  onVerify,
  onVerifyEligible,
  onSend,
  onDismiss,
}: Props) => {
  const displayName = bestseller.authorName ?? bestseller.publicationName;
  const sublabel = bestseller.publicationName;
  const avatarUrl = bestseller.authorPhotoUrl ?? bestseller.logoUrl;
  const hasAuthor = bestseller.authorId != null;
  const creatorUrl = buildCreatorUrl(bestseller);
  const isBestseller = isBestsellerTier(bestseller.bestsellerTier);
  const linkLabel = bestseller.authorHandle
    ? `Open ${displayName} on Substack`
    : `Open ${bestseller.publicationName} on Substack`;

  const handleVerify = () => {
    if (onVerify) onVerify(bestseller);
  };

  const handleVerifyEligible = () => {
    if (onVerifyEligible) onVerifyEligible(bestseller);
  };

  const handleSend = () => {
    if (onSend) onSend(bestseller);
  };

  const handleDismiss = () => {
    if (onDismiss) onDismiss(bestseller);
  };

  const handleDismissKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleDismiss();
  };

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-secondary/40 transition-colors">
      {hasAuthor ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          onKeyDown={handleDismissKeyDown}
          aria-label={`Remove ${displayName} from list`}
          tabIndex={0}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : (
        <div className="h-8 w-8 shrink-0" aria-hidden="true" />
      )}

      <div className="w-6 text-sm text-muted-foreground tabular-nums shrink-0 text-right">
        {bestseller.rank}
      </div>

      <Avatar className="h-10 w-10 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback className="text-xs">
          {initialsFor(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <a
          href={creatorUrl}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={0}
          aria-label={linkLabel}
          className="flex items-center gap-1.5 font-medium text-sm hover:underline truncate"
        >
          <span className="truncate">{displayName}</span>
          {isBestseller ? (
            <BadgeCheck className="h-4 w-4 text-orange-500 shrink-0" aria-hidden="true" />
          ) : null}
        </a>
        {displayName !== sublabel ? (
          <div className="text-xs text-muted-foreground truncate">{sublabel}</div>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <VerifyActionButton
          state={hasAuthor ? verifyState : "disabled"}
          onClick={hasAuthor ? handleVerify : undefined}
          ariaLabel={`Verify DM status for ${displayName}`}
        />
        <VerifyEligibleActionButton
          state={hasAuthor ? verifyEligibleState : "disabled"}
          onClick={hasAuthor ? handleVerifyEligible : undefined}
          ariaLabel={
            verifyEligibleState === "eligible"
              ? `${displayName} is eligible — posts notes regularly`
              : `Verify note eligibility for ${displayName}`
          }
        />
        <DmActionButton
          state={hasAuthor ? actionState : "disabled"}
          onClick={hasAuthor ? handleSend : undefined}
          ariaLabel={
            actionState === "sent"
              ? `Already DM'd ${displayName}`
              : `Send DM to ${displayName}`
          }
        />
      </div>
    </div>
  );
};
