import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_SERVER_URL = "https://domino-nordeste26.onrender.com";

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getOrCreatePlayerId(): string {
  let playerId = localStorage.getItem("domino_player_id");

  if (!playerId) {
    playerId =
      "player_" +
      Math.random().toString(36).slice(2, 10) +
      "_" +
      Date.now().toString(36);

    localStorage.setItem("domino_player_id", playerId);
  }

  return playerId;
}

export interface StoredSession {
  code: string;
  playerId: string;
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem("domino_online_session", JSON.stringify(session));
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem("domino_online_session");

    if (!raw) return null;

    const session = JSON.parse(raw) as StoredSession;

    if (!session.code || !session.playerId) return null;

    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem("domino_online_session");
}

export function isSocketConnected(): boolean {
  return Boolean(socket?.connected);
}
