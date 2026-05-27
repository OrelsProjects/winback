"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { createSlashExtension } from "./slash-extension";
import { VariableHighlight } from "./variable-highlight-extension";
import { VariableChips } from "./variable-chip";
import { cn } from "@/lib/utils";
import { useEffect, useMemo } from "react";

type Props = {
  value?: object | null;
  onChange?: (json: object) => void;
  onApplySubject?: (subject: string) => void;
  enableSlash?: boolean;
  placeholder?: string;
  className?: string;
  /** When set (e.g. in compose), `{{keys}}` show as resolved text with highlight. */
  interpolationPreview?: Record<string, string>;
};

const defaultDoc = (): object => ({ type: "doc", content: [{ type: "paragraph" }] });

export const TiptapEditor = ({
  value,
  onChange,
  onApplySubject,
  enableSlash = false,
  className,
  interpolationPreview,
}: Props) => {
  const previewKey = interpolationPreview ? JSON.stringify(interpolationPreview) : "";

  const extensions = useMemo(
    () => [
      StarterKit,
      Link.configure({ openOnClick: false }),
      VariableHighlight.configure({
        previewValues: interpolationPreview ?? {},
      }),
      ...(enableSlash ? [createSlashExtension(onApplySubject)] : []),
    ],
    [enableSlash, onApplySubject, previewKey],
  );

  const editor = useEditor(
    {
      extensions,
      content: value ?? defaultDoc(),
      onUpdate: ({ editor: ed }) => {
        onChange?.(ed.getJSON() as object);
      },
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-3 py-2",
        },
      },
      immediatelyRender: false,
    },
    [extensions],
  );

  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value);
    if (current !== next) {
      editor.commands.setContent(value as object);
    }
  }, [value, editor]);

  return (
    <div className={cn("border rounded-md bg-background", className)}>
      <VariableChips editor={editor} />
      <div className="border-t">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
