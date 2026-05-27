"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  callExtension,
  ExtensionUnavailableError,
  getExtensionId,
  pingExtension,
} from "@/lib/extension/client";
import type {
  ExtensionAction,
  ExtensionApi,
} from "@/lib/extension/types";

type Availability = "unknown" | "available" | "unavailable";

type UseExtensionReturn = {
  availability: Availability;
  isAvailable: boolean;
  /** Human-readable reason when unavailable (empty when available/unknown). */
  unavailableReason: string | null;
  extensionId: string | null;
  /** Re-check whether the extension is reachable (e.g. after install). */
  refresh: () => Promise<void>;
  /** Strongly-typed action invoker. Throws if the extension is missing or errors. */
  call: <A extends ExtensionAction>(
    action: A,
    params: ExtensionApi[A]["params"],
  ) => Promise<ExtensionApi[A]["result"]>;
};

/**
 * Generic hook for talking to the chat-stack Chrome extension.
 * - Pings on mount to surface availability in the UI.
 * - Returns a typed `call()` that maps to the extension's action contract.
 */
export const useExtension = (): UseExtensionReturn => {
  const [availability, setAvailability] = useState<Availability>("unknown");
  const [unavailableReason, setUnavailableReason] = useState<string | null>(
    null,
  );
  const isMountedRef = useRef(true);

  const checkAvailability = useCallback(async () => {
    const result = await pingExtension();
    if (!isMountedRef.current) return;
    if (result.ok) {
      setAvailability("available");
      setUnavailableReason(null);
      return;
    }
    setAvailability("unavailable");
    setUnavailableReason(result.reason);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void checkAvailability();
    return () => {
      isMountedRef.current = false;
    };
  }, [checkAvailability]);

  const call = useCallback(
    async <A extends ExtensionAction>(
      action: A,
      params: ExtensionApi[A]["params"],
    ) => {
      try {
        return await callExtension(action, params);
      } catch (err) {
        if (err instanceof ExtensionUnavailableError) {
          setAvailability("unavailable");
        }
        throw err;
      }
    },
    [],
  );

  return {
    availability,
    isAvailable: availability === "available",
    unavailableReason,
    extensionId: getExtensionId(),
    refresh: checkAvailability,
    call,
  };
};
