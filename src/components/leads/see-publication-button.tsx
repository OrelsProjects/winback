"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

type Props = {
  handle: string | null | undefined;
};

const sanitizeHandle = (h: string | null | undefined) => {
  if (!h) return null;
  return h.replace(/^@/, "").replace(/\/+$/, "").trim().toLowerCase();
};

export const SeePublicationButton = ({ handle }: Props) => {
  const clean = sanitizeHandle(handle);

  if(!clean) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!clean}
      asChild={!!clean}
      aria-label={clean ? `View ${clean}'s Substack` : "No Substack handle"}
      tabIndex={0}
    >
      {clean ? (
        <a href={`https://substack.com/@${clean}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Publication
        </a>
      ) : (
        <>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Publication
        </>
      )}
    </Button>
  );
};
