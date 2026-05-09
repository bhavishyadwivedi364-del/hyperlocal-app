import { useEffect, useRef } from "react";

export type OrderStatusUpdate = {
  orderId: number;
  status: string;
  updatedAt: string;
};

type WsMessage =
  | { type: "connected" }
  | { type: "order_status"; orderId: number; status: string; updatedAt: string };

// ---- Singleton WebSocket state shared across all hook instances ----
let globalWs: WebSocket | null = null;
const wsListeners = new Set<(update: OrderStatusUpdate) => void>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws`;
}

function connectGlobal(): void {
  if (
    globalWs &&
    (globalWs.readyState === WebSocket.CONNECTING ||
      globalWs.readyState === WebSocket.OPEN)
  ) {
    return;
  }

  intentionalClose = false;
  globalWs = new WebSocket(getWsUrl());

  globalWs.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string) as WsMessage;
      if (msg.type === "order_status") {
        const update: OrderStatusUpdate = {
          orderId: msg.orderId,
          status: msg.status,
          updatedAt: msg.updatedAt,
        };
        for (const listener of wsListeners) listener(update);
      }
    } catch {
      // ignore malformed messages
    }
  };

  globalWs.onerror = () => {
    // handled via onclose
  };

  globalWs.onclose = () => {
    globalWs = null;
    if (!intentionalClose && wsListeners.size > 0) {
      reconnectTimer = setTimeout(connectGlobal, 3000);
    }
  };
}

function disconnectGlobal(): void {
  intentionalClose = true;
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  globalWs?.close();
  globalWs = null;
}

// ---- Hook ----

/**
 * Subscribe to real-time order status updates from the server.
 * Pass `onUpdate` to receive updates. Optionally filter by `orderId`.
 * The WS connection is shared across all instances and auto-reconnects.
 */
export function useOrderWs(
  onUpdate?: (update: OrderStatusUpdate) => void,
  filterOrderId?: number,
): void {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    const listener = (update: OrderStatusUpdate) => {
      if (filterOrderId !== undefined && update.orderId !== filterOrderId) return;
      cbRef.current?.(update);
    };

    wsListeners.add(listener);
    connectGlobal();

    return () => {
      wsListeners.delete(listener);
      if (wsListeners.size === 0) disconnectGlobal();
    };
  }, [filterOrderId]);
}
