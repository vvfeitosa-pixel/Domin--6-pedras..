import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, Crown, ArrowLeft } from "lucide-react";
import { getSocket } from "@/lib/socketClient";
import { RoomPublicState, PlayerGameState } from "@/types/multiplayer";
import { useToast } from "@/hooks/use-toast";

interface SalaEsperaProps {
  room: RoomPublicState;
  mySocketId: string;
  onGameStarted: (initialState: PlayerGameState) => void;
  onLeave: () => void;
}

const TEAM_LABELS: Record<number, { team: string; color: string }> = {
  0: { team: "Time A", color: "text-[#f5b942]" },
  1: { team: "Time B", color: "text-[#e05c2a]" },
  2: { team: "Time A", color: "text-[#f5b942]" },
  3: { team: "Time B", color: "text-[#e05c2a]" },
};

export function SalaEspera({ room: initialRoom, mySocketId, onGameStarted, onLeave }: SalaEsperaProps) {
  const [room, setRoom] = useState<RoomPublicState>(initialRoom);
  const [copied, setCopied] = useState(false);
  const [confirmSair, setConfirmSair] = useState(false);
  const { toast } = useToast();

  const isHost = room.hostSocketId === mySocketId;
  const canStart = isHost && room.players.length >= 2 && room.status === "waiting";

  useEffect(() => {
    const socket = getSocket();

    // Capture the first game-state event to pass as initialState
    // (it arrives right after room-updated with status "playing")
    let capturedState: PlayerGameState | null = null;
    let transitionPending = false;

    const onGameState = (state: PlayerGameState) => {
      capturedState = state;
      socket.off("game-state", onGameState);
      if (transitionPending) {
        onGameStarted(capturedState);
      }
    };

    const onRoomUpdated = (updatedRoom: RoomPublicState) => {
      setRoom(updatedRoom);
      if (updatedRoom.status === "playing") {
        transitionPending = true;
        socket.off("room-updated", onRoomUpdated);
        if (capturedState) {
          onGameStarted(capturedState);
        }
        // If game-state hasn't arrived yet, the onGameState handler above will trigger
      }
    };

    socket.on("room-updated", onRoomUpdated);
    socket.on("game-state", onGameState);

    socket.on("player-left", ({ message }: { message: string }) => {
      toast({ title: "Jogador saiu", description: message });
    });

    return () => {
      socket.off("room-updated", onRoomUpdated);
      socket.off("game-state", onGameState);
      socket.off("player-left");
    };
  }, [onGameStarted, toast]);

  function handleStart() {
    getSocket().emit("start-game", { code: room.code });
  }

  function copyCode() {
    const url = `${window.location.origin}${window.location.pathname}?join=${room.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const seats = Array.from({ length: 4 }, (_, i) => {
    const player = room.players.find(p => p.seatIndex === i);
    return { seatIndex: i, player };
  });

  let cpuIdx = 1;
  const seatLabels = seats.map(s => {
    if (s.player) return s.player.name;
    return `CPU ${cpuIdx++}`;
  });

  return (
    <div className="min-h-[100dvh] varanda-bg flex flex-col items-center justify-center p-6 gap-5">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-white font-black drop-shadow">Sala de Espera</h1>
        <p className="text-[#f5d9b3] text-sm opacity-80">Aguardando jogadores…</p>
      </div>

      <div className="w-full max-w-sm bg-[#fffcf5] rounded-2xl shadow-2xl border-4 border-[#5c3018] overflow-hidden">
        {/* Code section */}
        <div className="bg-[#5c3018] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[#a89078] text-xs uppercase font-bold tracking-wider">Código da Sala</p>
            <p className="text-[#f5d9b3] font-mono text-3xl font-black tracking-widest">{room.code}</p>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 bg-[#a89078]/20 hover:bg-[#a89078]/40 text-[#f5d9b3] px-3 py-2 rounded-xl transition-all text-sm font-medium"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>

        {/* Players list */}
        <div className="p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[#5c3018] font-bold text-sm flex items-center gap-1">
              <Users className="w-4 h-4" />
              Jogadores ({room.players.length}/{room.maxHumans})
            </p>
          </div>

          {seats.map((seat, i) => {
            const isMe = seat.player?.socketId === mySocketId;
            const isHostSeat = seat.player?.socketId === room.hostSocketId;
            const { team, color } = TEAM_LABELS[i];
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  seat.player
                    ? isMe
                      ? "bg-[#c4541a]/10 border-[#c4541a]"
                      : "bg-white border-[#a89078]"
                    : "bg-[#f5ede0] border-dashed border-[#a89078]/50"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                  seat.player ? "bg-[#5c3018] text-[#f5d9b3]" : "bg-[#a89078]/30 text-[#a89078]"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${seat.player ? "text-[#3a1a00]" : "text-[#a89078] italic"}`}>
                    {seatLabels[i]}
                    {!seat.player && " (CPU)"}
                    {isMe && <span className="ml-1 text-[#c4541a] text-xs">(você)</span>}
                  </p>
                  <p className={`text-xs font-medium ${color}`}>{team}</p>
                </div>
                {isHostSeat && seat.player && <Crown className="w-4 h-4 text-[#f5b942] flex-shrink-0" />}
                {!seat.player && <span className="text-[10px] text-[#a89078] bg-[#a89078]/20 px-2 py-0.5 rounded-full">vazio</span>}
              </div>
            );
          })}

          <div className="flex gap-3 mt-1 text-xs text-[#a89078]">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f5b942] inline-block" />Time A: assentos 1 e 3</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#e05c2a] inline-block" />Time B: assentos 2 e 4</div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          {isHost ? (
            <>
              <Button
                onClick={handleStart}
                disabled={!canStart}
                className="w-full h-12 rounded-xl bg-[#c4541a] hover:bg-[#a03a10] text-white font-bold text-base shadow-md disabled:opacity-50"
              >
                {room.players.length < 2 ? "Aguardando mais jogadores…" : "Iniciar Jogo"}
              </Button>
              <p className="text-center text-[10px] text-[#a89078]">Mínimo 2 jogadores para iniciar</p>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 text-[#a89078] text-sm">
              <div className="w-2 h-2 rounded-full bg-[#f5b942] animate-pulse" />
              Aguardando o host iniciar…
            </div>
          )}
          <button
            onClick={() => setConfirmSair(true)}
            className="flex items-center justify-center gap-2 text-[#a89078] hover:text-[#5c3018] text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Sair da sala
          </button>
        </div>
      </div>

      {confirmSair && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffcf5] border-4 border-[#5c3018] rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center">
            <h2 className="font-serif text-xl font-bold text-[#5c3018] mb-1">Sair da sala?</h2>
            <p className="text-sm text-[#a89078] mb-5">Você deixará a sala de espera.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSair(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-[#a89078] text-[#5c3018] font-bold text-sm hover:bg-[#f5ede0] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onLeave}
                className="flex-1 py-2.5 rounded-xl bg-[#5c3018] text-white font-bold text-sm hover:bg-[#3a1a00] transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
