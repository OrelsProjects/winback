import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** Matches `{{var}}` and captures the key (aligned with `render-vars`). */
const VARIABLE_TOKEN = /\{\{([\w-]+)\}\}/g;

const variableHighlightKey = new PluginKey<DecorationSet>("variableHighlight");

const escapeAttr = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/\n/g, " ");

const buildDecorationSet = (
  doc: PMNode,
  previewValues: Record<string, string>,
): DecorationSet => {
  const decos: Decoration[] = [];
  const hasPreview = Object.keys(previewValues).length > 0;

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = node.text;
    if (!text) return;
    const re = new RegExp(VARIABLE_TOKEN.source, VARIABLE_TOKEN.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const key = match[1];
      const from = pos + match.index;
      const to = from + match[0].length;
      const resolved = previewValues[key];

      const attrs: Record<string, string> = {
        class: "tiptap-variable-token",
      };

      if (hasPreview && resolved !== undefined) {
        attrs["data-resolved"] = escapeAttr(resolved);
      }

      decos.push(Decoration.inline(from, to, attrs));
    }
  });
  return DecorationSet.create(doc, decos);
};

export const VariableHighlight = Extension.create({
  name: "variableHighlight",

  addOptions() {
    return {
      previewValues: {} as Record<string, string>,
    };
  },

  addProseMirrorPlugins() {
    const previewValues = this.options.previewValues;
    return [
      new Plugin({
        key: variableHighlightKey,
        state: {
          init: (_, { doc }) => buildDecorationSet(doc, previewValues),
          apply: (tr, old, _oldState, newState) => {
            if (!tr.docChanged) return old.map(tr.mapping, tr.doc);
            return buildDecorationSet(newState.doc, previewValues);
          },
        },
        props: {
          decorations(state) {
            return variableHighlightKey.getState(state) ?? null;
          },
        },
      }),
    ];
  },
});
