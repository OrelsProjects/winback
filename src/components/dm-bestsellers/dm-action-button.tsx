"use client";

import { Button } from "@/components/ui/button";
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
        isSent && "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-50",
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
  );
};
