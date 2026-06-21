import { io, Socket } from "socket.io-client";

let _socket: Socket | null = null;

const SOCKET_SERVER_URL = "https://domino-nordeste26.onrender.com";

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_SERVER_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
  }

  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem("domino_pid");

  if (!id) {
    id =
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10);

    localStorage.setItem("domino_pid", id);
  }

  return id;
}

export interface StoredSession {
  code: string;
  playerId: string;
}

export function saveSession(s: StoredSession): void {
  localStorage.setItem("domino_session", JSON.stringify(s));
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem("domino_session");

    if (!raw) return null;

    const s = JSON.parse(raw) as StoredSession;

    if (!s.code || !s.playerId) return null;

    return s;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem("domino_session");
}

export function isSocketConnected(): boolean {
  return Boolean(_socket?.connected);
}
