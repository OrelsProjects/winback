import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { SlashPopup, type SlashPopupHandle, type SlashItem } from "./slash-popup";

type OnApplySubject = (subject: string) => void;

const positionAt = (el: HTMLElement | null | undefined, rect: DOMRect | null | undefined) => {
  if (!el || !rect) return;
  el.style.position = "fixed";
  el.style.top = `${rect.bottom + 4}px`;
  el.style.left = `${rect.left}px`;
  el.style.zIndex = "9999";
};

export const createSlashExtension = (onApplySubject?: OnApplySubject) =>
  Extension.create({
    name: "slash",
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          startOfLine: false,
          items: async ({ query }: { query: string }): Promise<SlashItem[]> => {
            try {
              const res = await fetch(`/api/templates?q=${encodeURIComponent(query)}`);
              if (!res.ok) return [];
              return res.json() as Promise<SlashItem[]>;
            } catch {
              return [];
            }
          },
          render: () => {
            let component: ReactRenderer<SlashPopupHandle> | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(SlashPopup, {
                  props: {
                    items: props.items as SlashItem[],
                    command: (item: SlashItem) => {
                      props.command(item);
                    },
                  },
                  editor: props.editor,
                });
                document.body.appendChild(component.element);
                positionAt(component.element as HTMLElement, props.clientRect?.());
              },
              onUpdate: (props) => {
                component?.updateProps({
                  items: props.items as SlashItem[],
                  command: (item: SlashItem) => {
                    props.command(item);
                  },
                });
                positionAt(component?.element as HTMLElement, props.clientRect?.());
              },
              onKeyDown: (props) => component?.ref?.onKeyDown?.(props) ?? false,
              onExit: () => {
                component?.element.remove();
                component?.destroy();
                component = null;
              },
            };
          },
          command: ({ editor, range, props }) => {
            const item = props as unknown as SlashItem;
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContentAt(range.from, item.bodyJson as object)
              .run();
            if (onApplySubject && item.subject) {
              onApplySubject(item.subject);
            }
          },
        }),
      ];
    },
  });
