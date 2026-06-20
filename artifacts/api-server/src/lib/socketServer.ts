import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { roomManager } from "./roomManager.js";
import { logger } from "./logger.js";

export function attachSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    function emit(event: string, data: unknown) {
      socket.emit(event, data);
    }

    socket.on("create-room", ({ playerName, maxHumans, playerId }: { playerName: string; maxHumans: number; playerId: string }) => {
      const name = String(playerName || "Jogador").slice(0, 20).trim() || "Jogador";
      const max = Number(maxHumans) || 2;
      const pid = String(playerId || "").slice(0, 64) || socket.id;
      const result = roomManager.createRoom(socket.id, name, max, pid);
      if (!result.ok) { emit("error", { message: result.error }); return; }
      socket.join(result.room!.code);
      emit("room-updated", result.room);
      logger.info({ code: result.room!.code, name }, "Room created");
    });

    socket.on("join-room", ({ code, playerName, playerId }: { code: string; playerName: string; playerId: string }) => {
      const name = String(playerName || "Jogador").slice(0, 20).trim() || "Jogador";
      const pid = String(playerId || "").slice(0, 64) || socket.id;
      const result = roomManager.joinRoom(socket.id, code, name, pid);
      if (!result.ok) { emit("error", { message: result.error }); return; }
      socket.join(result.room!.code);
      emit("room-updated", result.room);
      socket.to(result.room!.code).emit("room-updated", result.room);
      logger.info({ code, name }, "Player joined room");
    });

    socket.on("rejoin-room", ({ code, playerId }: { code: string; playerId: string }) => {
      const result = roomManager.rejoinRoom(socket.id, code, String(playerId || ""));
      if (!result.ok) {
        emit("rejoin-room-fail", { message: result.error });
        logger.info({ code, playerId }, "Rejoin failed: " + result.error);
        return;
      }
      socket.join(result.room!.code);
      emit("rejoin-room-ok", { room: result.room, gameState: result.gameState ?? null });
      // Push current game state via normal channel (updates MultiplayerGame.tsx gs)
      if (result.gameState) {
        roomManager.sendGameStateTo(socket.id, result.room!.code);
      }
      // Notify others the player is back
      socket.to(result.room!.code).emit("room-updated", result.room);
      logger.info({ code, playerId }, "Player rejoined");
    });

    socket.on("leave-room", () => {
      const removed = roomManager.hardRemovePlayer(socket.id);
      if (removed) {
        io.to(removed.code).emit("room-updated", removed.room);
        io.to(removed.code).emit("player-left", { message: "Um jogador saiu. A sala foi pausada." });
      }
    });

    socket.on("start-game", ({ code }: { code: string }) => {
      const result = roomManager.startGame(socket.id, code, {
        onGameState: (targetSocketId, state) => {
          io.to(targetSocketId).emit("game-state", state);
        },
        onRoomUpdate: (roomState) => {
          io.to(roomState.code).emit("room-updated", roomState);
        },
      });
      if (!result.ok) { emit("error", { message: result.error }); return; }
      logger.info({ code }, "Game started");
    });

    socket.on("play-piece", ({ code, pieceIndex, side }: { code: string; pieceIndex: number; side: "E" | "D" }) => {
      const result = roomManager.playPiece(socket.id, code, pieceIndex, side);
      if (!result.ok) { emit("error", { message: result.error }); return; }
    });

    socket.on("pass-turn", ({ code }: { code: string }) => {
      const result = roomManager.passTurn(socket.id, code);
      if (!result.ok) { emit("error", { message: result.error }); return; }
    });

    socket.on("next-round", ({ code }: { code: string }) => {
      const result = roomManager.nextRound(socket.id, code);
      if (!result.ok) { emit("error", { message: result.error }); return; }
    });

    socket.on("new-game", ({ code }: { code: string }) => {
      const result = roomManager.newGame(socket.id, code);
      if (!result.ok) { emit("error", { message: result.error }); return; }
    });

    socket.on("escolher-inicio", ({ code, seat }: { code: string; seat: number }) => {
      const result = roomManager.escolherInicio(socket.id, code, seat);
      if (!result.ok) { emit("error", { message: result.error }); return; }
    });

    socket.on("chat-message", ({ code, text }: { code: string; text: string }) => {
      const trimmed = String(text || "").trim().slice(0, 120);
      if (!trimmed) return;
      const result = roomManager.sendChat(socket.id, code, trimmed);
      if (result.ok && result.msg) {
        io.to(code).emit("chat-msg", result.msg);
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
      const removed = roomManager.removePlayer(socket.id);
      if (removed) {
        io.to(removed.code).emit("room-updated", removed.room);
        if (!removed.softDisconnect) {
          io.to(removed.code).emit("player-left", { message: "Um jogador saiu. A sala foi pausada." });
        }
      }
    });
  });

  return io;
}
