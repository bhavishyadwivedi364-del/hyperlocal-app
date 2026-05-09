import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { getSession } from "./auth";
import { logger } from "./logger";

const SESSION_COOKIE = "sid";

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    try { result[key] = decodeURIComponent(val); } catch { result[key] = val; }
  }
  return result;
}

// userId -> Set of open WebSocket connections
const connections = new Map<string, Set<WebSocket>>();

export function setupWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    if (req.url !== "/api/ws") {
      socket.destroy();
      return;
    }

    const cookies = parseCookies(req.headers.cookie ?? "");
    const sid = cookies[SESSION_COOKIE];

    if (!sid) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let session;
    try {
      session = await getSession(sid);
    } catch (err) {
      logger.error({ err }, "WS auth error");
      socket.destroy();
      return;
    }

    if (!session) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const userId = session.user.id;

    wss.handleUpgrade(req, socket, head, (ws) => {
      if (!connections.has(userId)) connections.set(userId, new Set());
      connections.get(userId)!.add(ws);
      logger.info({ userId }, "WS client connected");

      ws.send(JSON.stringify({ type: "connected" }));

      ws.on("close", () => {
        const set = connections.get(userId);
        set?.delete(ws);
        if (set?.size === 0) connections.delete(userId);
        logger.info({ userId }, "WS client disconnected");
      });

      ws.on("error", (err) => {
        logger.error({ err, userId }, "WS client error");
      });
    });
  });
}

export function broadcastToUser(userId: string, message: Record<string, unknown>): void {
  const userConns = connections.get(userId);
  if (!userConns || userConns.size === 0) return;
  const payload = JSON.stringify(message);
  for (const ws of userConns) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

export function getConnectionCount(): number {
  let total = 0;
  for (const set of connections.values()) total += set.size;
  return total;
}
