import { useState, useEffect } from "react";
import { DominoGame } from "./components/DominoGame";
import { Lobby } from "./components/Lobby";
import { SalaEspera } from "./components/SalaEspera";
import { MultiplayerGame } from "./components/MultiplayerGame";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSocket, disconnectSocket, clearSession, saveSession, loadSession, getOrCreatePlayerId } from "@/lib/socketClient";
import { RoomPublicState, PlayerGameState } from "@/types/multiplayer";

const queryClient = new QueryClient();

type Screen = "lobby" | "solo" | "sala-espera" | "multiplayer-game" | "reconnecting";

export interface SessaoStats {
  vitorias: number;
  derrotas: number;
  melhorSequencia: number;
  sequenciaAtual: number;
}

function App() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [room, setRoom] = useState<RoomPublicState | null>(null);
  const [mySocketId, setMySocketId] = useState<string>("");
  const [initialGameState, setInitialGameState] = useState<PlayerGameState | null>(null);
  const [confirmSairSolo, setConfirmSairSolo] = useState(false);
  const [stats, setStats] = useState<SessaoStats>(() => {
    try {
      const saved = localStorage.getItem("domino_stats");
      if (saved) {
        return { vitorias: 0, derrotas: 0, melhorSequencia: 0, sequenciaAtual: 0, ...JSON.parse(saved) };
      }
    } catch {
      // mantém placar local zerado se o navegador bloquear localStorage
    }
    return { vitorias: 0, derrotas: 0, melhorSequencia: 0, sequenciaAtual: 0 };
  });
  const [adsRemoved, setAdsRemoved] = useState<boolean>(() => localStorage.getItem("domino_ads_removed") === "true");


  useEffect(() => {
    localStorage.setItem("domino_stats", JSON.stringify(stats));
  }, [stats]);

  function handleResetStats() {
    const zerado = { vitorias: 0, derrotas: 0, melhorSequencia: 0, sequenciaAtual: 0 };
    setStats(zerado);
    localStorage.setItem("domino_stats", JSON.stringify(zerado));
  }

  function handleRemoveAdsDemo() {
    setAdsRemoved(true);
    localStorage.setItem("domino_ads_removed", "true");
  }

  // ── Keep room state fresh during multiplayer ─────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    function handleRoomUpdated(updatedRoom: RoomPublicState) {
      setRoom(updatedRoom);
    }
    socket.on("room-updated", handleRoomUpdated);
    return () => { socket.off("room-updated", handleRoomUpdated); };
  }, []);

  // ── Auto-rejoin on socket (re)connect ────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    function attemptRejoin() {
      const session = loadSession();
      if (!session) return;
      setScreen("reconnecting");
      socket.emit("rejoin-room", { code: session.code, playerId: session.playerId });
    }

    function handleRejoinOk({ room: r, gameState }: { room: RoomPublicState; gameState: PlayerGameState | null }) {
      setRoom(r);
      setMySocketId(socket.id!);
      if (gameState) {
        setInitialGameState(gameState);
        setScreen("multiplayer-game");
      } else {
        setScreen("sala-espera");
      }
    }

    function handleRejoinFail() {
      clearSession();
      setScreen("lobby");
    }

    socket.on("connect", attemptRejoin);
    socket.on("rejoin-room-ok", handleRejoinOk);
    socket.on("rejoin-room-fail", handleRejoinFail);

    // If socket is already connected on mount, try immediately
    if (socket.connected) attemptRejoin();

    return () => {
      socket.off("connect", attemptRejoin);
      socket.off("rejoin-room-ok", handleRejoinOk);
      socket.off("rejoin-room-fail", handleRejoinFail);
    };
  }, []);

  function handleRoomReady(r: RoomPublicState, socketId: string) {
    setRoom(r);
    setMySocketId(socketId);
    setScreen("sala-espera");
  }

  function handleGameStarted(initState: PlayerGameState) {
    setInitialGameState(initState);
    setScreen("multiplayer-game");
    // Save session so we can rejoin on reconnect
    const playerId = getOrCreatePlayerId();
    if (room) {
      saveSession({ code: room.code, playerId });
    }
  }

  function handleLeaveRoom() {
    const socket = getSocket();
    socket.emit("leave-room");
    clearSession();
    disconnectSocket();
    setRoom(null);
    setMySocketId("");
    setInitialGameState(null);
    setScreen("lobby");
  }

  function registrarFimDeJogo(venceu: boolean) {
    setStats(prev => {
      const sequenciaAtual = venceu ? prev.sequenciaAtual + 1 : 0;
      return venceu
        ? { ...prev, vitorias: prev.vitorias + 1, sequenciaAtual, melhorSequencia: Math.max(prev.melhorSequencia, sequenciaAtual) }
        : { ...prev, derrotas: prev.derrotas + 1, sequenciaAtual: 0 };
    });
  }

  function handleSoloGameOver(venceu: boolean) {
    registrarFimDeJogo(venceu);
  }

  function handleMultiGameOver(venceu: boolean) {
    registrarFimDeJogo(venceu);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {screen === "reconnecting" && (
          <div className="min-h-[100dvh] varanda-bg flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-[#f5b942] border-t-transparent animate-spin" />
            <p className="text-[#f5d9b3] font-bold text-base">Reconectando à partida…</p>
          </div>
        )}

        {screen === "lobby" && (
          <Lobby
            onSolo={() => setScreen("solo")}
            onRoomReady={handleRoomReady}
            stats={stats}
            onResetStats={handleResetStats}
            adsRemoved={adsRemoved}
            onRemoveAdsDemo={handleRemoveAdsDemo}
          />
        )}

        {screen === "solo" && (
          <div className="relative">
            <DominoGame onGameOver={handleSoloGameOver} adsRemoved={adsRemoved} />
            <button
              onClick={() => setConfirmSairSolo(true)}
              className="fixed top-3 left-3 z-50 text-[#f5d9b3]/70 hover:text-white text-xs flex items-center gap-1 bg-black/30 px-2 py-1 rounded-full"
            >
              ← Lobby
            </button>
            {confirmSairSolo && (
              <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#fffcf5] border-4 border-[#5c3018] rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center">
                  <h2 className="font-serif text-xl font-bold text-[#5c3018] mb-1">Sair do jogo?</h2>
                  <p className="text-sm text-[#a89078] mb-5">O progresso desta partida será perdido.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmSairSolo(false)}
                      className="flex-1 py-2.5 rounded-xl border-2 border-[#a89078] text-[#5c3018] font-bold text-sm hover:bg-[#f5ede0] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => { setConfirmSairSolo(false); setScreen("lobby"); }}
                      className="flex-1 py-2.5 rounded-xl bg-[#5c3018] text-white font-bold text-sm hover:bg-[#3a1a00] transition-colors"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {screen === "sala-espera" && room && (
          <SalaEspera
            room={room}
            mySocketId={mySocketId}
            onGameStarted={handleGameStarted}
            onLeave={handleLeaveRoom}
          />
        )}

        {screen === "multiplayer-game" && room && initialGameState && (
          <MultiplayerGame
            room={room}
            mySocketId={mySocketId}
            initialState={initialGameState}
            onLeave={handleLeaveRoom}
            onGameOver={handleMultiGameOver}
            adsRemoved={adsRemoved}
          />
        )}

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
