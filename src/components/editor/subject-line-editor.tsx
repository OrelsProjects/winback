"use client";

import { forwardRef, useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { VariableHighlight } from "./variable-highlight-extension";
import { cn } from "@/lib/utils";

const plainTextToDoc = (text: string): object => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    },
  ],
});

const subjectStarterKit = StarterKit.configure({
  heading: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  codeBlock: false,
  horizontalRule: false,
});

export type SubjectLineEditorProps = {
  /** For `<Label htmlFor>`, set on the inner ProseMirror surface (compose). */
  prosemirrorId?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  interpolationPreview?: Record<string, string>;
  className?: string;
  disabled?: boolean;
};

export const SubjectLineEditor = forwardRef<HTMLDivElement, SubjectLineEditorProps>(
  function SubjectLineEditor(
    {
      prosemirrorId,
      value,
      onChange,
      onBlur,
      interpolationPreview,
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const previewKey = interpolationPreview ? JSON.stringify(interpolationPreview) : "";

    const extensions = useMemo(
      () => [
        subjectStarterKit,
        Link.configure({ openOnClick: false }),
        VariableHighlight.configure({
          previewValues: interpolationPreview ?? {},
        }),
      ],
      [previewKey],
    );

    const editor = useEditor(
      {
        extensions,
        content: plainTextToDoc(value),
        editable: !disabled,
        onUpdate: ({ editor: ed }) => {
          onChange(ed.state.doc.textContent);
        },
        editorProps: {
          attributes: {
            class: cn(
              "prose prose-sm max-w-none focus:outline-none min-h-9 px-3 py-2 text-sm",
              "text-foreground [&_.ProseMirror]:min-h-[1.25rem] [&_.ProseMirror]:leading-normal",
            ),
            ...(prosemirrorId ? { id: prosemirrorId } : {}),
          },
          handleDOMEvents: {
            blur: () => {
              onBlur?.();
              return false;
            },
          },
          handleKeyDown: (_view, event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              return true;
            }
            return false;
          },
        },
        immediatelyRender: false,
      },
      [extensions],
    );

    useEffect(() => {
      if (!editor) return;
      const current = editor.state.doc.textContent;
      if (current !== value) {
        editor.commands.setContent(plainTextToDoc(value));
      }
    }, [value, editor]);

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!disabled);
    }, [disabled, editor]);

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border border-input bg-background shadow-xs",
          "ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          "[&_.ProseMirror]:outline-none",
          className,
        )}
        {...rest}
      >
        <EditorContent editor={editor} />
      </div>
    );
  },
);

SubjectLineEditor.displayName = "SubjectLineEditor";
