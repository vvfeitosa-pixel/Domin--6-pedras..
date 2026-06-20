import { useState, useEffect, useRef, useCallback } from "react";
import { PlayerGameState, RoomPublicState, ChatMessage } from "@/types/multiplayer";
import { Mesa, FaceDownPeca } from "./Mesa";
import { Mao } from "./Mao";
import { PecaDomino } from "./PecaDomino";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSocket } from "@/lib/socketClient";
import { playDominoClack, playPass, playWin, playGameOver, playGameWin, playGameLoss } from "@/lib/sounds";
import { AlertCircle, PartyPopper, Loader2, Trophy, SkipForward, ArrowLeft, MessageCircle, X, Send } from "lucide-react";
import type { Peca } from "@/lib/dominoEngine";

const SCORE_LIMIT = 6;

interface DragState { index: number; x: number; y: number; }

interface MultiplayerGameProps {
  room: RoomPublicState;
  mySocketId: string;
  initialState: PlayerGameState;
  onLeave: () => void;
  onGameOver?: (venceu: boolean) => void;
  adsRemoved?: boolean;
}

const TEAM_SEAT_COLOR: Record<number, string> = {
  0: "#f5b942",
  1: "#e05c2a",
  2: "#f5b942",
  3: "#e05c2a",
};

function teamOf(seat: number): "A" | "B" { return seat % 2 === 0 ? "A" : "B"; }

function PlayersHeader({
  seatNames,
  handSizes,
  isHumanSeat,
  turnoId,
  mySeat,
}: {
  seatNames: string[];
  handSizes: number[];
  isHumanSeat: boolean[];
  turnoId: number;
  mySeat: number;
}) {
  const teamA = [0, 2];
  const teamB = [1, 3];

  const renderSeat = (seat: number) => {
    const isMe = seat === mySeat;
    const isTurn = seat === turnoId;
    const color = TEAM_SEAT_COLOR[seat];
    return (
      <div
        key={seat}
        className={`flex flex-col items-center px-2 py-1 rounded-lg transition-all duration-200 ${
          isTurn ? "bg-white/15 scale-105" : ""
        }`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black mb-0.5 transition-all ${
            isTurn ? "ring-2 ring-white scale-110" : ""
          }`}
          style={{ backgroundColor: color, color: "#3a1a00" }}
        >
          {isHumanSeat[seat] ? (isMe ? "Eu" : "👤") : "🤖"}
        </div>
        <span
          className={`text-[10px] font-bold leading-none truncate max-w-[54px] text-center ${
            isTurn ? "text-white" : "text-[#f5d9b3]/70"
          }`}
        >
          {isMe ? "Você" : seatNames[seat]?.split(" ")[0]}
        </span>
        <span className="text-[9px] text-[#3a1a00] leading-none mt-0.5 bg-[#f5d9b3]/80 px-1 rounded-sm font-bold">{handSizes[seat]}🁣</span>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center gap-1 px-3 py-1 shrink-0">
      <div className="flex items-center gap-0.5 bg-[#f5b942]/10 rounded-xl px-1 py-0.5 border border-[#f5b942]/20">
        {teamA.map(renderSeat)}
      </div>
      <div className="flex flex-col items-center px-1 gap-0.5">
        <span className="text-[9px] font-black text-[#f5b942]/60 uppercase tracking-wider">A</span>
        <span className="text-white/20 text-xs">×</span>
        <span className="text-[9px] font-black text-[#e05c2a]/60 uppercase tracking-wider">B</span>
      </div>
      <div className="flex items-center gap-0.5 bg-[#e05c2a]/10 rounded-xl px-1 py-0.5 border border-[#e05c2a]/20">
        {teamB.map(renderSeat)}
      </div>
    </div>
  );
}

function ScoreBar({ placar }: { placar: { A: number; B: number } }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 shrink-0">
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        <span className="text-[#f5d9b3] text-[10px] font-bold tracking-wide uppercase opacity-80">Time A</span>
        <div className="flex gap-0.5">
          {Array.from({ length: SCORE_LIMIT }).map((_, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-sm border border-white/20 transition-all duration-300 ${i < placar.A ? "bg-[#f5b942]" : "bg-[#3a1a00]/60"}`} />
          ))}
        </div>
        <span className="text-[#f5b942] font-black text-sm w-4 text-right">{placar.A}</span>
      </div>
      <span className="text-white/40 text-xs font-bold">×</span>
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[#f5b942] font-black text-sm w-4">{placar.B}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: SCORE_LIMIT }).map((_, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-sm border border-white/20 transition-all duration-300 ${i < placar.B ? "bg-[#e05c2a]" : "bg-[#3a1a00]/60"}`} />
          ))}
        </div>
        <span className="text-[#f5d9b3] text-[10px] font-bold tracking-wide uppercase opacity-80">Time B</span>
      </div>
    </div>
  );
}

const tipoLabel: Record<string, string> = {
  "Batida simples": "Batida simples",
  "Carroçada": "Carroçada! 🁣",
  "Lá e Lô": "Lá e Lô!",
  "Cruzada": "Cruzada!",
  "Trancado": "Jogo trancado",
};

export function MultiplayerGame({ room, mySocketId, initialState, onLeave, onGameOver, adsRemoved = false }: MultiplayerGameProps) {
  const [gs, setGs] = useState<PlayerGameState>(initialState);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropHover, setDropHover] = useState<"E" | "D" | null>(null);
  const [confirmSair, setConfirmSair] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [turnoFlash, setTurnoFlash] = useState<{ nome: string; isMe: boolean; key: number } | null>(null);
  const [showChoiceOverlay, setShowChoiceOverlay] = useState(false);

  // Refs for stable access in socket callbacks
  const dropHoverRef = useRef<"E" | "D" | null>(null);
  const draggingRef = useRef<DragState | null>(null);
  const dropLeftRef = useRef<HTMLDivElement>(null);
  const dropRightRef = useRef<HTMLDivElement>(null);
  const prevTurno = useRef(initialState.turnoId);
  const flashKey = useRef(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const gameOverFiredRef = useRef(false);
  const chatOpenRef = useRef(false);
  const gsRef = useRef<PlayerGameState>(initialState);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const { toast } = useToast();

  const isMyTurn = gs.turnoId === gs.mySeat && !gs.fim && !gs.aguardandoEscolha;
  const myTeam: "A" | "B" = gs.mySeat % 2 === 0 ? "A" : "B";
  const myTeamWon = gs.vencedorTime === myTeam;

  // Sync refs
  useEffect(() => { dropHoverRef.current = dropHover; }, [dropHover]);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  // Delay showing "Quem começa?" dialog so players see their pieces first
  useEffect(() => {
    if (!gs.aguardandoEscolha || gs.fim) {
      setShowChoiceOverlay(false);
      return;
    }
    const t = setTimeout(() => setShowChoiceOverlay(true), 1800);
    return () => clearTimeout(t);
  }, [gs.aguardandoEscolha, gs.fim]);

  // Scroll chat on new messages
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [chatOpen, chatMessages.length]);

  // Socket listeners — stable, only mounted once
  useEffect(() => {
    const socket = getSocket();

    const onGameState = (state: PlayerGameState) => {
      setGs(state);
      gsRef.current = state;
      if (!state.aguardandoEscolha) playDominoClack();

      if (state.turnoId !== prevTurno.current) {
        prevTurno.current = state.turnoId;
        if (!state.fim && !state.aguardandoEscolha) {
          flashKey.current += 1;
          const isMe = state.turnoId === state.mySeat;
          setTurnoFlash({ nome: state.turnoNome, isMe, key: flashKey.current });
          setTimeout(() => setTurnoFlash(null), 1800);
        }
      }

      if (state.jogoFinalizado && !gameOverFiredRef.current) {
        gameOverFiredRef.current = true;
        const myWon = state.vencedorTime === (state.mySeat % 2 === 0 ? "A" : "B");
        onGameOverRef.current?.(myWon);
        if (myWon) playGameWin(); else playGameLoss();
      }
    };

    const onPlayerLeft = ({ message }: { message: string }) => {
      toast({ title: "Jogador desconectou", description: message });
    };

    const onChatMsg = (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
      if (!chatOpenRef.current) {
        setUnreadCount(n => n + 1);
      }
    };

    socket.on("game-state", onGameState);
    socket.on("player-left", onPlayerLeft);
    socket.on("chat-msg", onChatMsg);

    return () => {
      socket.off("game-state", onGameState);
      socket.off("player-left", onPlayerLeft);
      socket.off("chat-msg", onChatMsg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — socket listeners are stable via refs

  const pecaValidaE = useCallback((peca: Peca) => {
    const state = gsRef.current;
    if (state.board.length === 0) return state.ehPrimeiraRodada ? peca[0] === peca[1] : true;
    return peca[0] === state.esquerda || peca[1] === state.esquerda;
  }, []);

  const pecaValidaD = useCallback((peca: Peca) => {
    const state = gsRef.current;
    if (state.board.length === 0) return state.ehPrimeiraRodada ? peca[0] === peca[1] : true;
    return peca[0] === state.direita || peca[1] === state.direita;
  }, []);

  const executeJogar = useCallback((index: number, lado: "E" | "D") => {
    getSocket().emit("play-piece", { code: room.code, pieceIndex: index, side: lado });
    setSelectedIndex(null);
    setDragging(null);
    setDropHover(null);
  }, [room.code]);

  const handlePassar = useCallback(() => {
    const state = gsRef.current;
    if (!state.podePasse || state.turnoId !== state.mySeat) return;
    getSocket().emit("pass-turn", { code: room.code });
    setSelectedIndex(null);
    playPass();
  }, [room.code]);

  const handleEscolherInicio = useCallback((seat: number) => {
    getSocket().emit("escolher-inicio", { code: room.code, seat });
  }, [room.code]);

  const handleOpenChat = useCallback(() => {
    setChatOpen(true);
    setUnreadCount(0);
  }, []);

  const handleCloseChat = useCallback(() => {
    setChatOpen(false);
  }, []);

  const handleSendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    getSocket().emit("chat-message", { code: room.code, text });
    setChatInput("");
  }, [chatInput, room.code]);

  // Drag & drop
  useEffect(() => {
    if (!dragging) return;
    const inRect = (ref: React.RefObject<HTMLDivElement>, x: number, y: number) => {
      const r = ref.current?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const onMove = (e: PointerEvent) => {
      setDragging(d => d ? { ...d, x: e.clientX, y: e.clientY } : null);
      if (inRect(dropLeftRef, e.clientX, e.clientY)) { setDropHover("E"); dropHoverRef.current = "E"; }
      else if (inRect(dropRightRef, e.clientX, e.clientY)) { setDropHover("D"); dropHoverRef.current = "D"; }
      else { setDropHover(null); dropHoverRef.current = null; }
    };
    const onUp = () => {
      const hover = dropHoverRef.current;
      const drag = draggingRef.current;
      if (hover && drag) {
        const peca = gsRef.current.myHand[drag.index] as Peca | undefined;
        if (peca) {
          const canDrop = hover === "E" ? pecaValidaE(peca) : pecaValidaD(peca);
          if (canDrop) executeJogar(drag.index, hover);
          else toast({ variant: "destructive", title: "Essa peça não encaixa aí!" });
        }
      }
      setDragging(null); setDropHover(null); dropHoverRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragging, pecaValidaE, pecaValidaD, executeJogar, toast]);

  const selectedPeca = selectedIndex !== null ? gs.myHand[selectedIndex] as Peca : null;
  const canDropLeft = selectedPeca ? pecaValidaE(selectedPeca) : false;
  const canDropRight = selectedPeca ? pecaValidaD(selectedPeca) : false;
  const dragPeca = dragging !== null ? gs.myHand[dragging.index] as Peca : null;
  const myName = gs.seatNames[gs.mySeat] ?? "Você";

  // Determine who can be chosen to start (for aguardandoEscolha dialog)
  const choiceSeats = gs.timeEscolha === "A" ? [0, 2] : gs.timeEscolha === "B" ? [1, 3] : [];

  return (
    <div className="min-h-[100dvh] varanda-bg w-full flex flex-col overflow-hidden relative select-none" style={{ touchAction: "none" }}>

      {/* Header */}
      <header className="flex justify-between items-center px-4 py-2 z-10 shrink-0">
        <div>
          <h1 className="font-serif text-lg sm:text-xl text-white font-bold drop-shadow-md">Dominó de 6 Pedras</h1>
          <p className="text-[#f5d9b3] text-xs opacity-70">Sala: <span className="font-mono font-bold">{room.code}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {/* Chat button */}
          <button
            onClick={handleOpenChat}
            className="relative flex items-center gap-1 text-[#f5d9b3]/80 hover:text-white text-xs bg-black/20 px-2.5 py-1.5 rounded-full border border-white/10"
          >
            <MessageCircle className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#e05c2a] text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setConfirmSair(true)} className="flex items-center gap-1 text-[#f5d9b3]/70 hover:text-white text-xs">
            <ArrowLeft className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      {/* Player names above score */}
      <PlayersHeader
        seatNames={gs.seatNames}
        handSizes={gs.handSizes}
        isHumanSeat={gs.isHumanSeat}
        turnoId={gs.turnoId}
        mySeat={gs.mySeat}
      />

      {/* Score */}
      <ScoreBar placar={gs.placar} />

      {/* Turn status */}
      {!gs.fim && !gs.aguardandoEscolha && (
        gs.isHumanSeat[gs.turnoId] && gs.turnoId !== gs.mySeat ? (
          <div className="flex items-center justify-center gap-2 text-[#f5d9b3] text-xs py-0.5 shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#f5b942] animate-pulse" />
            <span>Aguardando {gs.turnoNome}…</span>
          </div>
        ) : !gs.isHumanSeat[gs.turnoId] ? (
          <div className="flex items-center justify-center gap-2 text-[#f5d9b3] text-xs py-0.5 shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{gs.turnoNome} está pensando…</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-[#f5b942] text-xs py-0.5 shrink-0 font-bold animate-pulse">
            <span>⬇ SUA VEZ ⬇</span>
          </div>
        )
      )}

      {/* Mesa */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 z-10 min-h-0">
        <Mesa
          board={gs.board as Peca[]}
          dragActive={dragging !== null}
          canDropLeft={canDropLeft}
          canDropRight={canDropRight}
          dropHover={dropHover}
          dropLeftRef={dropLeftRef}
          dropRightRef={dropRightRef}
          lastPlayedSide={gs.lastPlayedSide}
          isMyTurn={isMyTurn}
        />
        <div className="mt-2 w-full max-w-[min(100%,46vh)] flex justify-between items-center px-3 py-1.5 bg-[#5c3018]/60 backdrop-blur-sm rounded-full text-white/90 text-xs font-medium border border-[#a89078]/20 shadow-inner">
          <span className="truncate max-w-[65%]">{gs.mensagem || "Boa partida!"}</span>
          {gs.esquerda !== null && gs.direita !== null && (
            <span className="shrink-0 flex items-center gap-1.5">
              Pontas:
              <strong className="text-secondary bg-[#5c3018] px-1.5 py-0.5 rounded text-xs">{gs.esquerda}</strong>
              /
              <strong className="text-secondary bg-[#5c3018] px-1.5 py-0.5 rounded text-xs">{gs.direita}</strong>
            </span>
          )}
        </div>

        {/* Sleeping pieces strip (outside mesa) */}
        {gs.sleeping && gs.sleeping.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[#f5d9b3]/60 text-[9px] font-bold uppercase tracking-widest">Dorme</span>
            <div className="flex gap-1.5">
              {gs.sleeping.map((_, i) => (
                <FaceDownPeca key={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pass button */}
      <div className="flex items-center justify-center py-1.5 shrink-0">
        <Button
          size="sm"
          onClick={handlePassar}
          disabled={!isMyTurn || !gs.podePasse}
          variant="outline"
          className="bg-[#fffcf5] hover:bg-[#f5d9b3] text-[#5c3018] border-[#a89078] font-bold shadow-md rounded-full px-6 h-9"
        >
          <SkipForward className="mr-1.5 h-4 w-4" />
          Passar a Vez
        </Button>
      </div>

      {/* My hand */}
      <Mao
        mao={gs.myHand as Peca[]}
        selectedIndex={selectedIndex}
        draggingIndex={dragging?.index ?? null}
        onSelect={idx => { if (isMyTurn) setSelectedIndex(prev => prev === idx ? null : idx); }}
        onDragStart={(idx, e) => {
          if (isMyTurn && !gs.fim) {
            setDragging({ index: idx, x: e.clientX, y: e.clientY });
            setSelectedIndex(idx);
          }
        }}
        isMyTurn={isMyTurn}
      />

      {/* Ghost piece */}
      {dragging && dragPeca && (
        <div style={{ position: "fixed", left: dragging.x - 56, top: dragging.y - 28, zIndex: 999, pointerEvents: "none", transform: "scale(1.15) rotate(-4deg)", opacity: 0.92, filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.55))" }}>
          <PecaDomino peca={dragPeca} orientation="horizontal" />
        </div>
      )}

      {/* Turn flash — small pill, non-intrusive */}
      {turnoFlash && (
        <div key={turnoFlash.key} className="absolute bottom-32 inset-x-0 z-40 pointer-events-none flex justify-center">
          <div className={`turno-flash flex items-center gap-2 px-4 py-1.5 rounded-full shadow-xl text-sm font-black tracking-wide ${
            turnoFlash.isMe
              ? "bg-[#f5b942] text-[#3a1a00]"
              : "bg-[#3a1a00]/90 text-[#f5d9b3] border border-[#a89078]/40"
          }`}>
            <span className="text-base leading-none">{turnoFlash.isMe ? "⬇" : "🎯"}</span>
            <span>{turnoFlash.isMe ? "SUA VEZ!" : turnoFlash.nome}</span>
          </div>
        </div>
      )}

      {/* ─── WHO STARTS overlay ───────────────────────────────────── */}
      {showChoiceOverlay && gs.aguardandoEscolha && !gs.fim && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffcf5] border-4 border-[#5c3018] rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
            <p className="text-4xl mb-3">🁣</p>
            <h2 className="font-serif text-2xl font-bold text-[#5c3018] mb-1">Quem começa?</h2>
            <p className="text-sm text-[#a89078] mb-5">
              {myTeam === gs.timeEscolha
                ? "Seu time ganhou a rodada anterior. Escolha quem vai sair."
                : `${gs.timeEscolha === "A" ? "Time A" : "Time B"} está escolhendo quem começa.`}
            </p>
            {myTeam === gs.timeEscolha ? (
              <div className="flex gap-3">
                {choiceSeats.map(seat => (
                  <Button
                    key={seat}
                    size="lg"
                    onClick={() => handleEscolherInicio(seat)}
                    className={`flex-1 font-bold rounded-xl h-12 ${
                      seat === gs.mySeat
                        ? "bg-[#c4541a] hover:bg-[#a03a10] text-white"
                        : "border-2 border-[#5c3018] text-[#5c3018] bg-white hover:bg-[#f5ede0]"
                    }`}
                  >
                    {seat === gs.mySeat ? "Você" : gs.seatNames[seat]?.split(" ")[0]}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-[#a89078] text-sm">
                <div className="w-2 h-2 rounded-full bg-[#f5b942] animate-pulse" />
                Aguardando {gs.timeEscolha === "A" ? "Time A" : "Time B"} escolher…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CHAT panel ──────────────────────────────────────────── */}
      {chatOpen && (
        <div className="absolute inset-0 z-50 flex flex-col" style={{ touchAction: "auto" }}>
          <div className="flex-1 bg-black/40" onClick={handleCloseChat} />
          <div className="bg-[#fffcf5] border-t-4 border-[#5c3018] flex flex-col" style={{ height: "55vh", maxHeight: 420 }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#f5ede0] shrink-0">
              <span className="font-bold text-[#5c3018] text-sm flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> Chat da Sala
              </span>
              <button onClick={handleCloseChat} className="text-[#a89078] hover:text-[#5c3018]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5" style={{ touchAction: "pan-y" }}>
              {chatMessages.length === 0 && (
                <p className="text-[#a89078] text-xs text-center py-4 italic">Ninguém falou nada ainda…</p>
              )}
              {chatMessages.map(msg => {
                const isMe = msg.name === myName;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && (
                      <span
                        className="text-[9px] font-bold mb-0.5 ml-1"
                        style={{ color: TEAM_SEAT_COLOR[msg.seatIndex] ?? "#a89078" }}
                      >
                        {msg.name}
                      </span>
                    )}
                    <div className={`px-3 py-1.5 rounded-2xl text-sm max-w-[75%] break-words ${
                      isMe
                        ? "bg-[#c4541a] text-white rounded-br-sm"
                        : "bg-[#f5ede0] text-[#3a1a00] rounded-bl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border-t border-[#f5ede0] shrink-0" style={{ touchAction: "auto" }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                placeholder="Digite uma mensagem…"
                maxLength={120}
                className="flex-1 bg-[#f5ede0] text-[#3a1a00] rounded-full px-4 py-2 text-sm outline-none placeholder:text-[#a89078] border border-[#a89078]/30 focus:border-[#c4541a] transition-colors"
                style={{ touchAction: "auto" }}
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#c4541a] text-white disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm sair */}
      {confirmSair && (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffcf5] border-4 border-[#5c3018] rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center">
            <h2 className="font-serif text-xl font-bold text-[#5c3018] mb-1">Sair da sala?</h2>
            <p className="text-sm text-[#a89078] mb-5">Você será desconectado e a partida será interrompida.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSair(false)} className="flex-1 py-2.5 rounded-xl border-2 border-[#a89078] text-[#5c3018] font-bold text-sm hover:bg-[#f5ede0] transition-colors">
                Cancelar
              </button>
              <button onClick={onLeave} className="flex-1 py-2.5 rounded-xl bg-[#5c3018] text-white font-bold text-sm hover:bg-[#3a1a00] transition-colors">
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── END MODAL ───────────────────────────────────────────── */}
      {gs.fim && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffcf5] border-4 border-[#5c3018] rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">

            {gs.ehBuchuda && (
              <div className="inline-block bg-[#f5b942] text-[#3a1a00] text-xs font-black px-3 py-1 rounded-full mb-3 tracking-widest uppercase animate-bounce">
                🏆 BUCHUDA!
              </div>
            )}

            {gs.jogoFinalizado ? (
              <Trophy className={`w-14 h-14 mx-auto mb-3 ${myTeamWon ? "text-[#f5b942] animate-bounce" : "text-[#a89078]"}`} />
            ) : myTeamWon ? (
              <PartyPopper className="w-14 h-14 text-[#f5b942] mx-auto mb-3 animate-bounce" />
            ) : (
              <AlertCircle className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
            )}

            <h2 className="font-serif text-2xl font-bold text-[#5c3018] mb-1">
              {gs.jogoFinalizado
                ? (myTeamWon ? "Eita glória! Ganhamos!" : "Perdemos o jogo!")
                : (myTeamWon ? "Ponto nosso!" : "Ponto dos adversários!")}
            </h2>

            {gs.tipoVitoria && (
              <p className="text-base font-bold text-[#c4541a] mb-1">{tipoLabel[gs.tipoVitoria] ?? gs.tipoVitoria}</p>
            )}
            <p className="text-sm text-[#a89078] mb-4">
              {gs.tipoVitoria === "Trancado" ? "Jogo trancado — menor pedra vence" : `${gs.vencedor} bateu`}
              {gs.pontosMao > 0 && (
                <span className="ml-1 font-bold text-[#5c3018]">(+{gs.pontosMao} ponto{gs.pontosMao !== 1 ? "s" : ""})</span>
              )}
            </p>

            <div className="flex justify-center gap-6 mb-4 py-3 bg-[#f5ede0] rounded-xl">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-[#a89078] tracking-wider mb-0.5">{gs.seatNames[0]} + {gs.seatNames[2]}</p>
                <p className={`text-4xl font-black ${gs.placar.A >= SCORE_LIMIT ? "text-[#f5b942]" : "text-[#5c3018]"}`}>{gs.placar.A}</p>
              </div>
              <div className="flex items-center text-[#a89078] text-2xl font-light">×</div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-[#a89078] tracking-wider mb-0.5">{gs.seatNames[1]} + {gs.seatNames[3]}</p>
                <p className={`text-4xl font-black ${gs.placar.B >= SCORE_LIMIT ? "text-[#e05c2a]" : "text-[#5c3018]"}`}>{gs.placar.B}</p>
              </div>
            </div>

            {/* Sleeping pieces revealed */}
            {gs.sleeping && gs.sleeping.length > 0 && (
              <div className="mb-4 px-3 py-2.5 bg-[#f5ede0] rounded-xl">
                <p className="text-[9px] uppercase font-bold text-[#a89078] tracking-widest mb-2 text-center">Pedras que dormiram</p>
                <div className="flex justify-center gap-2">
                  {gs.sleeping.map((peca, i) => (
                    <div
                      key={i}
                      className="rounded-[4px] border border-[#a89078] overflow-hidden shadow-sm"
                      style={{
                        width: 48, height: 24,
                        display: "flex", flexDirection: "row",
                        background: "#fffcf5",
                        animationDelay: `${i * 100}ms`,
                      }}
                    >
                      {[peca[0], peca[1]].map((val, half) => (
                        <div
                          key={half}
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: "bold", color: "#3a1a00",
                            borderRight: half === 0 ? "1px solid #a89078" : undefined,
                            background: "#fdfaf1",
                          }}
                        >
                          {val}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!adsRemoved && (
              <div className="ad-placeholder mb-4">
                Espaço reservado para anúncio AdMob após a partida
              </div>
            )}

            {room.hostSocketId === mySocketId ? (
              gs.jogoFinalizado ? (
                <Button
                  size="lg"
                  onClick={() => { gameOverFiredRef.current = false; getSocket().emit("new-game", { code: room.code }); }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base h-12 rounded-xl shadow-lg"
                >
                  Nova Partida
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    size="lg"
                    onClick={() => getSocket().emit("next-round", { code: room.code })}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base h-12 rounded-xl shadow-lg"
                  >
                    Próxima Rodada
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => { gameOverFiredRef.current = false; getSocket().emit("new-game", { code: room.code }); }}
                    className="w-full text-[#a89078] hover:text-[#5c3018] text-xs"
                  >
                    Zerar e começar nova partida
                  </Button>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-[#a89078] text-sm">
                <div className="w-2 h-2 rounded-full bg-[#f5b942] animate-pulse" />
                Aguardando o host continuar…
              </div>
            )}

            <button onClick={() => setConfirmSair(true)} className="mt-3 text-xs text-[#a89078] hover:text-[#5c3018] flex items-center justify-center gap-1 w-full">
              <ArrowLeft className="w-3 h-3" /> Sair da sala
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
