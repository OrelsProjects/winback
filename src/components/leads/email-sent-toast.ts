"use client";

import { toast } from "sonner";

const RESEND_EMAIL_DASHBOARD_PREFIX = "https://resend.com/emails";

export const toastEmailSentWithView = (resendMessageId: string | null) => {
  const hasId = resendMessageId != null && resendMessageId.length > 0;

  toast.success(
    "Email sent!",
    hasId
      ? {
          action: {
            label: "View",
            onClick: () => {
              window.open(
                `${RESEND_EMAIL_DASHBOARD_PREFIX}/${resendMessageId}`,
                "_blank",
                "noopener,noreferrer",
              );
            },
          },
        }
      : undefined,
  );
};
