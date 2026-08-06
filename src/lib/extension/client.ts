"use client";

import type {
  ExtensionAction,
  ExtensionApi,
  ExtensionEnvelope,
  ExtensionPingResponse,
} from "./types";

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: unknown,
          callback?: (response: unknown) => void,
        ) => void;
        lastError?: { message: string } | null;
      };
    };
  }
}

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID?.trim();

export class ExtensionUnavailableError extends Error {
  constructor(message = "Chrome extension is unavailable") {
    super(message);
    this.name = "ExtensionUnavailableError";
  }
}

export type ExtensionPingResult = { ok: true } | { ok: false; reason: string };

const getChromeRuntime = () => {
  if (typeof window === "undefined") return null;
  return window.chrome?.runtime ?? null;
};

const sendMessage = <TResponse>(
  extensionId: string,
  message: unknown,
): Promise<TResponse> => {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime();
    if (!runtime) {
      reject(new ExtensionUnavailableError("chrome.runtime not available"));
      return;
    }
    try {
      runtime.sendMessage(extensionId, message, (response) => {
        const lastError = runtime.lastError;
        if (lastError) {
          reject(new ExtensionUnavailableError(lastError.message));
          return;
        }
        resolve(response as TResponse);
      });
    } catch (err) {
      reject(
        err instanceof Error ? err : new ExtensionUnavailableError(String(err)),
      );
    }
  });
};

/** Quick check: is the extension installed & responsive? */
export const pingExtension = async (): Promise<ExtensionPingResult> => {
  if (typeof window === "undefined") {
    return { ok: false, reason: "Not in browser" };
  }
  if (!window.chrome?.runtime) {
    return {
      ok: false,
      reason: "Open this page in Chrome or Edge (chrome.runtime unavailable)",
    };
  }
  if (!EXTENSION_ID) {
    return {
      ok: false,
      reason:
        "NEXT_PUBLIC_EXTENSION_ID is not set — restart the dev server after updating .env",
    };
  }
  try {
    const res = await sendMessage<ExtensionPingResponse | undefined>(
      EXTENSION_ID,
      { type: "PING" },
    );
    if (res?.success) return { ok: true };
    return { ok: false, reason: "Extension did not respond to PING" };
  } catch (err) {
    const message =
      err instanceof ExtensionUnavailableError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Unknown error";
    return { ok: false, reason: message };
  }
};

export const getExtensionId = () => EXTENSION_ID ?? null;

/** Invoke an extension API action with the right param tuple. Throws on failure. */
export const callExtension = async <A extends ExtensionAction>(
  action: A,
  params: ExtensionApi[A]["params"],
): Promise<ExtensionApi[A]["result"]> => {
  if (!EXTENSION_ID) {
    throw new ExtensionUnavailableError("NEXT_PUBLIC_EXTENSION_ID not set");
  }
  const envelope = await sendMessage<ExtensionEnvelope<A> | undefined>(
    EXTENSION_ID,
    { type: "API_REQUEST", action, params },
  );
  if (!envelope) {
    throw new ExtensionUnavailableError("Empty response from extension");
  }
  if (!envelope.success) {
    throw new Error(envelope.error || `Extension action ${action} failed`);
  }
  return envelope.data.result;
};
