import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import type { JSONContent } from "@tiptap/core";

import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Bold } from "@tiptap/extension-bold";
import { Italic } from "@tiptap/extension-italic";
import { Strike } from "@tiptap/extension-strike";
import { Code } from "@tiptap/extension-code";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Heading } from "@tiptap/extension-heading";
import { BulletList } from "@tiptap/extension-bullet-list";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { ListItem } from "@tiptap/extension-list-item";
import { Blockquote } from "@tiptap/extension-blockquote";
import { HardBreak } from "@tiptap/extension-hard-break";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import { Link } from "@tiptap/extension-link";

// Pure-schema extensions, safe to import on the server.
// Excludes Dropcursor / Gapcursor / History which touch `window`.
export const SERVER_EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  Strike,
  Code,
  CodeBlock,
  Heading,
  BulletList,
  OrderedList,
  ListItem,
  Blockquote,
  HardBreak,
  HorizontalRule,
  Link,
];

// Pure-JS JSON → HTML — does not touch the DOM.
export const renderTiptapToHtml = (bodyJson: object): string =>
  renderToHTMLString({
    content: bodyJson as JSONContent,
    extensions: SERVER_EXTENSIONS,
  });
