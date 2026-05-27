import { renderTiptapToHtml } from "@/lib/tiptap/server-extensions";
import { convert } from "html-to-text";
import { buildFooterHtml, buildFooterText } from "./footer";
import { interpolatePlain, hasUnresolvedVars } from "@/lib/templates/render-vars";

type VarMap = Record<string, string>;

/** Plain, left-aligned message HTML like a normal personal email (no centered “newsletter” layout). */
export const renderEmail = (bodyJson: object, subject: string, vars: VarMap) => {
  const rawHtml = renderTiptapToHtml(bodyJson);

  const renderedSubject = interpolatePlain(subject, vars);
  const renderedHtml = interpolatePlain(rawHtml, vars);

  if (hasUnresolvedVars(renderedSubject)) {
    throw new Error(`Unresolved variables in subject: ${renderedSubject}`);
  }
  if (hasUnresolvedVars(renderedHtml)) {
    throw new Error(`Unresolved variables in body`);
  }

  const footerHtml = buildFooterHtml();
  const footerText = buildFooterText();

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222;">${renderedHtml}${footerHtml}</body></html>`;

  const bodyText = convert(renderedHtml, { wordwrap: 80 }) + footerText;

  return { subject: renderedSubject, html: fullHtml, text: bodyText };
};
