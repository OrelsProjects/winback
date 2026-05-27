"use client";

import { Button } from "@/components/ui/button";
import { TEMPLATE_VARIABLES } from "@/lib/constants";
import type { Editor } from "@tiptap/react";

type Props = {
  editor: Editor | null;
};

export const VariableChips = ({ editor }: Props) => {
  const handleInsert = (token: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(token).run();
  };

  return (
    <div className="flex flex-wrap gap-1.5 py-2">
      {TEMPLATE_VARIABLES.map(({ token, label }) => (
        <Button
          key={token}
          variant="outline"
          size="sm"
          className="h-7 text-xs font-mono"
          onClick={() => handleInsert(token)}
          type="button"
          aria-label={`Insert ${label} variable`}
          tabIndex={0}
        >
          {token}
        </Button>
      ))}
    </div>
  );
};
