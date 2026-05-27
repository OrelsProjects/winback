"use client";

import { useMemo } from "react";
import { interpolatePlain, hasUnresolvedVars } from "@/lib/templates/render-vars";
import { WRITESTACK_UNSUBSCRIBE_URL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

type VarMap = Record<string, string>;

type Props = {
  html: string;
  vars: VarMap;
  footer?: string;
};

export const EmailPreview = ({ html, vars, footer }: Props) => {
  const rendered = useMemo(() => interpolatePlain(html, vars), [html, vars]);
  const hasVars = useMemo(() => hasUnresolvedVars(rendered), [rendered]);

  const defaultFooter = `—<br/>You're receiving this because you have a WriteStack account.<br/><a href="${WRITESTACK_UNSUBSCRIBE_URL}" style="color:#1a73e8;">Unsubscribe from these emails</a>`;

  const emailHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222;margin:0;padding:0;text-align:left;">
      <div>${rendered}</div>
      ${
        footer
          ? `<p style="margin:1.5em 0 0;font-size:13px;line-height:1.5;color:#555;">${footer}</p>`
          : `<p style="margin:1.5em 0 0;font-size:13px;line-height:1.5;color:#555;">${defaultFooter}</p>`
      }
    </div>
  `;

  return (
    <div className="h-full flex flex-col">
      {hasVars && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md mb-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Unresolved variables — sending is disabled until all <code>{"{{vars}}"}</code> are filled.
        </div>
      )}
      <div
        className="flex-1 rounded-md border bg-white p-4 overflow-auto text-sm text-left"
        dangerouslySetInnerHTML={{ __html: emailHtml }}
      />
    </div>
  );
};
