import { WRITESTACK_UNSUBSCRIBE_URL } from "@/lib/constants";

export const buildFooterHtml = (unsubscribeUrl: string = WRITESTACK_UNSUBSCRIBE_URL) => `
<p style="margin:1.5em 0 0;font-size:13px;line-height:1.5;color:#555;">
—<br/>
You're receiving this because you have a WriteStack account.<br/>
<a href="${unsubscribeUrl}" style="color:#1a73e8;">Unsubscribe from these emails</a>
</p>
`;

export const buildFooterText = (unsubscribeUrl: string = WRITESTACK_UNSUBSCRIBE_URL) =>
  `\n\n—\nYou're receiving this because you have a WriteStack account.\nUnsubscribe: ${unsubscribeUrl}\n`;
