"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, CheckCheck, Loader2, NotepadText, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type DmActionState =
  | "idle"
  | "loading"
  | "sent"
  | "not-sent"
  | "disabled";

export type VerifyActionState = "idle" | "loading" | "disabled";

export type VerifyEligibleActionState =
  | "idle"
  | "loading"
  | "eligible"
  | "disabled";

const ActionTooltip = ({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex">{children}</span>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs">
      {content}
    </TooltipContent>
  </Tooltip>
);

const verifyTooltipFor = (state: VerifyActionState): string => {
  if (state === "loading") {
    return "Checking via the extension whether you already sent this author a DM.";
  }
  if (state === "disabled") {
    return "Enable the Chrome extension, or this row has no author to verify.";
  }
  return "Verify DM status — uses the extension to see if you already messaged them on Substack.";
};

const verifyEligibleTooltipFor = (state: VerifyEligibleActionState): string => {
  if (state === "loading") {
    return "Checking their recent notes to see if they post regularly.";
  }
  if (state === "eligible") {
    return "Note-eligible — they post notes often enough. You can send a DM.";
  }
  if (state === "disabled") {
    return "Can't check — already ineligible, not checked yet, or no author.";
  }
  return "Check note eligibility — they must post notes regularly before you can DM them.";
};

const dmTooltipFor = (state: DmActionState): string => {
  if (state === "loading") {
    return "Sending DM through the Chrome extension…";
  }
  if (state === "sent") {
    return "You already sent a DM to this author.";
  }
  if (state === "not-sent") {
    return "Verified — no prior DM found. Click to compose and send.";
  }
  if (state === "disabled") {
    return "Can't send — verify note eligibility first, they may block DMs, or data is missing.";
  }
  return "Send a DM via the Chrome extension.";
};

type VerifyProps = {
  state: VerifyActionState;
  onClick?: () => void;
  ariaLabel: string;
};

export const VerifyActionButton = ({
  state,
  onClick,
  ariaLabel,
}: VerifyProps) => {
  const isLoading = state === "loading";
  const isDisabled = state === "disabled" || isLoading;

  return (
    <ActionTooltip content={verifyTooltipFor(state)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={isDisabled}
        aria-label={ariaLabel}
        tabIndex={0}
        className="h-9 shrink-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCheck className="h-4 w-4" />
        )}
        {isLoading ? "Verifying…" : "Verify"}
      </Button>
    </ActionTooltip>
  );
};

type VerifyEligibleProps = {
  state: VerifyEligibleActionState;
  onClick?: () => void;
  ariaLabel: string;
};

export const VerifyEligibleActionButton = ({
  state,
  onClick,
  ariaLabel,
}: VerifyEligibleProps) => {
  const isLoading = state === "loading";
  const isEligible = state === "eligible";
  const isDisabled = state === "disabled" || isLoading || isEligible;

  return (
    <ActionTooltip content={verifyEligibleTooltipFor(state)}>
      <Button
        type="button"
        variant={isEligible ? "secondary" : "outline"}
        size="icon"
        onClick={onClick}
        disabled={isDisabled}
        aria-label={ariaLabel}
        tabIndex={0}
        className={cn(
          "h-9 w-9 rounded-full shrink-0",
          isEligible &&
            "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-50",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isEligible ? (
          <Check className="h-4 w-4" />
        ) : (
          <NotepadText className="h-4 w-4" />
        )}
      </Button>
    </ActionTooltip>
  );
};

type Props = {
  state: DmActionState;
  onClick?: () => void;
  ariaLabel: string;
};

export const DmActionButton = ({ state, onClick, ariaLabel }: Props) => {
  const isLoading = state === "loading";
  const isSent = state === "sent";
  const isDisabled = state === "disabled" || isLoading || isSent;

  return (
    <ActionTooltip content={dmTooltipFor(state)}>
      <Button
        type="button"
        variant={isSent ? "secondary" : "outline"}
        size="icon"
        onClick={onClick}
        disabled={isDisabled}
        aria-label={ariaLabel}
        tabIndex={0}
        className={cn(
          "h-9 w-9 rounded-full shrink-0",
          isSent &&
            "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-50",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSent ? (
          <Check className="h-4 w-4" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </ActionTooltip>
  );
};
