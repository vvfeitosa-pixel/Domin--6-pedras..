import { MultiplayerJogoDomino, PlayerGameState } from "./multiplayerEngine.js";

const CPU_DELAY_MS = 2000;
const MAX_ROOMS = 100;

export interface RoomPlayer {
  socketId: string;
  name: string;
  seatIndex: number;
  playerId: string;
  disconnected: boolean;
}

export interface RoomPublicState {
  code: string;
  hostSocketId: string;
  maxHumans: number;
  players: RoomPlayer[];
  status: "waiting" | "playing" | "finished";
}

export interface ChatMsg {
  id: number;
  seatIndex: number;
  name: string;
  text: string;
}

interface Room {
  code: string;
  hostSocketId: string;
  maxHumans: number;
  players: RoomPlayer[];
  status: "waiting" | "playing" | "finished";
  game: MultiplayerJogoDomino | null;
  cpuTimer: ReturnType<typeof setTimeout> | null;
  chatHistory: ChatMsg[];
  chatIdCounter: number;
  onGameState?: (socketId: string, state: PlayerGameState) => void;
  onRoomUpdate?: (state: RoomPublicState) => void;
}

const rooms = new Map<string, Room>();

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function getSeatNames(room: Room): string[] {
  const names: string[] = [];
  for (let i = 0; i < 4; i++) {
    const p = room.players.find(p => p.seatIndex === i);
    if (p) names.push(p.name);
    else names.push("");
  }
  let cpuIdx = 1;
  for (let i = 0; i < 4; i++) {
    if (!room.players.find(p => p.seatIndex === i)) {
      names[i] = `CPU ${cpuIdx++}`;
    }
  }
  return names;
}

function broadcastGameState(room: Room): void {
  if (!room.game || !room.onGameState) return;
  for (const player of room.players) {
    if (!player.disconnected) {
      room.onGameState(player.socketId, room.game.getStateForSeat(player.seatIndex));
    }
  }
}

function sendGameStateToPlayer(room: Room, player: RoomPlayer): void {
  if (!room.game || !room.onGameState) return;
  room.onGameState(player.socketId, room.game.getStateForSeat(player.seatIndex));
}

function scheduleCpuTurns(room: Room): void {
  if (!room.game || room.game.isFim() || room.game.isHumanTurn() || room.game.isAguardandoEscolha()) return;

  const step = () => {
    if (!room.game) return;
    room.cpuTimer = null;
    const { fim } = room.game.jogarCpuStep();
    broadcastGameState(room);
    if (!fim && !room.game.isHumanTurn()) {
      room.cpuTimer = setTimeout(step, CPU_DELAY_MS);
    }
    if (fim) room.status = "finished";
  };

  room.cpuTimer = setTimeout(step, CPU_DELAY_MS);
}

function clearCpuTimer(room: Room): void {
  if (room.cpuTimer) {
    clearTimeout(room.cpuTimer);
    room.cpuTimer = null;
  }
}

function toPublic(room: Room): RoomPublicState {
  return {
    code: room.code,
    hostSocketId: room.hostSocketId,
    maxHumans: room.maxHumans,
    players: room.players.map(p => ({ ...p })),
    status: room.status,
  };
}

export const roomManager = {
  createRoom(socketId: string, playerName: string, maxHumans: number, playerId: string): { ok: boolean; room?: RoomPublicState; error?: string } {
    if (rooms.size >= MAX_ROOMS) return { ok: false, error: "Servidor cheio, tente mais tarde." };
    maxHumans = Math.min(4, Math.max(2, maxHumans));
    const code = genCode();
    const room: Room = {
      code,
      hostSocketId: socketId,
      maxHumans,
      players: [{ socketId, name: playerName, seatIndex: 0, playerId, disconnected: false }],
      status: "waiting",
      game: null,
      cpuTimer: null,
      chatHistory: [],
      chatIdCounter: 0,
    };
    rooms.set(code, room);
    return { ok: true, room: toPublic(room) };
  },

  joinRoom(socketId: string, code: string, playerName: string, playerId: string): { ok: boolean; room?: RoomPublicState; seatIndex?: number; error?: string } {
    const room = rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: "Sala não encontrada." };
    if (room.status !== "waiting") return { ok: false, error: "A partida já começou." };
    if (room.players.length >= room.maxHumans) return { ok: false, error: "Sala cheia." };
    if (room.players.find(p => p.socketId === socketId)) return { ok: false, error: "Você já está nessa sala." };

    const preferredSeats: Record<number, number[]> = {
      2: [0, 2],
      3: [0, 1, 2],
      4: [0, 1, 2, 3],
    };
    const order = preferredSeats[room.maxHumans] ?? [0, 1, 2, 3];
    const taken = new Set(room.players.map(p => p.seatIndex));
    const seat = order.find(s => !taken.has(s)) ?? -1;
    if (seat === -1) return { ok: false, error: "Sala cheia." };

    room.players.push({ socketId, name: playerName, seatIndex: seat, playerId, disconnected: false });
    return { ok: true, room: toPublic(room), seatIndex: seat };
  },

  rejoinRoom(socketId: string, code: string, playerId: string): { ok: boolean; room?: RoomPublicState; gameState?: PlayerGameState; error?: string } {
    const room = rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: "Sala não encontrada." };

    const player = room.players.find(p => p.playerId === playerId);
    if (!player) return { ok: false, error: "Jogador não encontrado nessa sala." };

    const wasHost = room.hostSocketId === player.socketId;
    player.socketId = socketId;
    player.disconnected = false;
    if (wasHost) room.hostSocketId = socketId;

    if (room.onRoomUpdate) room.onRoomUpdate(toPublic(room));

    const gameState = room.game ? room.game.getStateForSeat(player.seatIndex) : undefined;
    return { ok: true, room: toPublic(room), gameState };
  },

  startGame(
    socketId: string,
    code: string,
    callbacks: {
      onGameState: (socketId: string, state: PlayerGameState) => void;
      onRoomUpdate: (state: RoomPublicState) => void;
    }
  ): { ok: boolean; error?: string } {
    const room = rooms.get(code);
    if (!room) return { ok: false, error: "Sala não encontrada." };
    if (room.hostSocketId !== socketId) return { ok: false, error: "Apenas o host pode iniciar." };
    if (room.status !== "waiting") return { ok: false, error: "Jogo já iniciado." };
    if (room.players.length < 2) return { ok: false, error: "Mínimo de 2 jogadores." };

    room.status = "playing";
    room.onGameState = callbacks.onGameState;
    room.onRoomUpdate = callbacks.onRoomUpdate;
    room.chatHistory = [];
    room.chatIdCounter = 0;

    const seatNames = getSeatNames(room);
    const humanSeats = room.players.map(p => p.seatIndex);
    room.game = new MultiplayerJogoDomino(seatNames, humanSeats);

    callbacks.onRoomUpdate(toPublic(room));
    broadcastGameState(room);
    scheduleCpuTurns(room);
    return { ok: true };
  },

  playPiece(socketId: string, code: string, pieceIndex: number, side: "E" | "D"): { ok: boolean; error?: string } {
    const room = rooms.get(code);
    if (!room || !room.game) return { ok: false, error: "Sala não encontrada." };
    const player = room.players.find(p => p.socketId === socketId);
    if (!player) return { ok: false, error: "Você não está nessa sala." };

    const res = room.game.jogar(player.seatIndex, pieceIndex, side);
    if (!res.ok) return { ok: false, error: res.mensagem };

    broadcastGameState(room);
    if (room.game.isFim()) {
      room.status = "finished";
    } else {
      scheduleCpuTurns(room);
    }
    return { ok: true };
  },

  passTurn(socketId: string, code: string): { ok: boolean; error?: string } {
    const room = rooms.get(code);
    if (!room || !room.game) return { ok: false, error: "Sala não encontrada." };
    const player = room.players.find(p => p.socketId === socketId);
    if (!player) return { ok: false, error: "Você não está nessa sala." };

    const res = room.game.passar(player.seatIndex);
    if (!res.ok) return { ok: false, error: "Você tem jogadas disponíveis." };

    broadcastGameState(room);
    if (!room.game.isFim()) scheduleCpuTurns(room);
    return { ok: true };
  },

  nextRound(socketId: string, code: string): { ok: boolean; error?: string } {
    const room = rooms.get(code);
    if (!room || !room.game) return { ok: false, error: "Sala não encontrada." };
    if (room.hostSocketId !== socketId) return { ok: false, error: "Apenas o host pode avançar a rodada." };
    if (!room.game.isFim()) return { ok: false, error: "Rodada ainda em andamento." };
    if (room.game.isJogoFinalizado()) return { ok: false, error: "Use nova partida." };

    clearCpuTimer(room);
    room.status = "playing";
    room.game.iniciarRodada();
    broadcastGameState(room);
    scheduleCpuTurns(room);
    return { ok: true };
  },

  escolherInicio(socketId: string, code: string, seat: number): { ok: boolean; error?: string } {
    const room = rooms.get(code);
    if (!room || !room.game) return { ok: false, error: "Sala não encontrada." };
    const player = room.players.find(p => p.socketId === socketId);
    if (!player) return { ok: false, error: "Você não está nessa sala." };
    const ok = room.game.escolherIniciador(seat);
    if (!ok) return { ok: false, error: "Escolha inválida." };
    broadcastGameState(room);
    scheduleCpuTurns(room);
    return { ok: true };
  },

  newGame(socketId: string, code: string): { ok: boolean; error?: string } {
    const room = rooms.get(code);
    if (!room || !room.game) return { ok: false, error: "Sala não encontrada." };
    if (room.hostSocketId !== socketId) return { ok: false, error: "Apenas o host pode reiniciar." };

    clearCpuTimer(room);
    room.status = "playing";
    room.chatHistory = [];
    room.chatIdCounter = 0;
    room.game.novaPartida();
    broadcastGameState(room);
    scheduleCpuTurns(room);
    return { ok: true };
  },

  sendChat(socketId: string, code: string, text: string): { ok: boolean; msg?: ChatMsg; error?: string } {
    const room = rooms.get(code);
    if (!room) return { ok: false, error: "Sala não encontrada." };
    const player = room.players.find(p => p.socketId === socketId);
    if (!player) return { ok: false, error: "Você não está nessa sala." };

    const msg: ChatMsg = {
      id: ++room.chatIdCounter,
      seatIndex: player.seatIndex,
      name: player.name,
      text,
    };
    room.chatHistory.push(msg);
    if (room.chatHistory.length > 60) room.chatHistory.shift();

    return { ok: true, msg };
  },

  // Called on network disconnect: soft-remove during game, hard-remove otherwise
  removePlayer(socketId: string): { code: string; room: RoomPublicState; softDisconnect: boolean } | null {
    for (const [code, room] of rooms) {
      const player = room.players.find(p => p.socketId === socketId);
      if (!player) continue;

      if (room.status === "playing") {
        // Soft disconnect: keep player's seat and game state
        player.disconnected = true;
        if (room.onRoomUpdate) room.onRoomUpdate(toPublic(room));
        return { code, room: toPublic(room), softDisconnect: true };
      }

      // Hard remove (waiting / finished)
      const idx = room.players.indexOf(player);
      room.players.splice(idx, 1);

      if (room.players.length === 0) {
        clearCpuTimer(room);
        rooms.delete(code);
        return null;
      }

      if (room.hostSocketId === socketId) {
        room.hostSocketId = room.players[0].socketId;
      }

      if (room.onRoomUpdate) room.onRoomUpdate(toPublic(room));
      return { code, room: toPublic(room), softDisconnect: false };
    }
    return null;
  },

  // Called when player explicitly leaves (emits leave-room)
  hardRemovePlayer(socketId: string): { code: string; room: RoomPublicState } | null {
    for (const [code, room] of rooms) {
      const idx = room.players.findIndex(p => p.socketId === socketId);
      if (idx === -1) continue;

      const player = room.players[idx];
      room.players.splice(idx, 1);

      if (room.players.length === 0) {
        clearCpuTimer(room);
        rooms.delete(code);
        return null;
      }

      if (room.hostSocketId === socketId) {
        room.hostSocketId = room.players[0].socketId;
      }

      if (room.status === "playing") {
        clearCpuTimer(room);
        room.status = "waiting";
        room.game = null;
      }

      if (room.onRoomUpdate) room.onRoomUpdate(toPublic(room));
      return { code, room: toPublic(room) };
    }
    return null;
  },

  sendGameStateTo(socketId: string, code: string): void {
    const room = rooms.get(code);
    if (!room || !room.game || !room.onGameState) return;
    const player = room.players.find(p => p.socketId === socketId);
    if (!player) return;
    sendGameStateToPlayer(room, player);
  },

  getRoom(code: string): RoomPublicState | null {
    const room = rooms.get(code);
    return room ? toPublic(room) : null;
  },

  getRoomBySocket(socketId: string): { code: string; room: RoomPublicState } | null {
    for (const [code, room] of rooms) {
      if (room.players.find(p => p.socketId === socketId))
        return { code, room: toPublic(room) };
    }
    return null;
  },
};
