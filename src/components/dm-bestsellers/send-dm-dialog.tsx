"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { Bestseller } from "@/lib/substack/discover";
import { getBargeDM } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bestseller: Bestseller | null;
  isSending: boolean;
  onConfirm: (body: string) => void;
};

const firstNameFrom = (name: string | null | undefined): string | undefined => {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  return trimmed.split(/\s+/)[0];
};

export const SendDmDialog = ({
  open,
  onOpenChange,
  bestseller,
  isSending,
  onConfirm,
}: Props) => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !bestseller) return;
    setMessage(
      getBargeDM(
        firstNameFrom(bestseller.authorName ?? bestseller.publicationName),
      ),
    );
  }, [open, bestseller]);

  const displayName =
    bestseller?.authorName ?? bestseller?.publicationName ?? "this author";
  const canSend = message.trim().length > 0 && !isSending;

  const handleConfirm = () => {
    if (!canSend) return;
    onConfirm(message.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send DM to {displayName}</DialogTitle>
          <DialogDescription>
            Review the message below. It will be sent via the Chrome extension.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={12}
          className="resize-y min-h-[240px] text-sm leading-relaxed"
          aria-label="DM message"
          disabled={isSending}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canSend}>
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isSending ? "Sending…" : "Send DM"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
