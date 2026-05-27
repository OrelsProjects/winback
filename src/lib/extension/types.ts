/**
 * Shared types for talking to the chat-stack Chrome extension.
 * Matches the action contract defined in the extension's `background.ts`.
 */

export type ExtensionResponse<T> = {
  message: string;
  action: string;
  result: T;
};

export type DidSendADMResult = {
  didSendDm: boolean;
  lastReplyAt: string | null;
  canSendDM?: boolean;
};

export type SendDMResult = {
  clientId: string;
  threadId: string;
  didExceedRateLimit: boolean;
};

/**
 * Map of action name -> { params, result }. Add new actions here as the
 * extension exposes them; the hook is generic over this map.
 */
export type ExtensionApi = {
  didSendADM: {
    params: [userId: number];
    result: DidSendADMResult;
  };
  sendDM: {
    params: [userId: number, body: string];
    result: SendDMResult;
  };
  fetchDMs: {
    params: [];
    result: null;
  };
  markDMAsSeen: {
    params: [threadId: string];
    result: null;
  };
  getCurrentUserAuthorId: {
    params: [];
    result: number;
  };
};

export type ExtensionAction = keyof ExtensionApi;

export type ExtensionRequest<A extends ExtensionAction = ExtensionAction> = {
  type: "API_REQUEST";
  action: A;
  params: ExtensionApi[A]["params"];
};

export type ExtensionEnvelope<A extends ExtensionAction = ExtensionAction> =
  | {
      success: true;
      data: ExtensionResponse<ExtensionApi[A]["result"]>;
    }
  | {
      success: false;
      error: string;
      data?: { action?: string; result?: unknown };
    };

export type ExtensionPingResponse = {
  success: boolean;
  timestamp: number;
  version?: string;
  message: string;
  source: "internal" | "external";
};
