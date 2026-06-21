import { useState, useRef, useEffect, useCallback } from "react";
import { JogoDomino, EstadoJogo, Dificuldade } from "@/lib/dominoEngine";
import { Mesa, FaceDownPeca } from "./Mesa";
import { Mao } from "./Mao";
import { Controles } from "./Controles";
import { PecaDomino } from "./PecaDomino";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, PartyPopper, Loader2, Trophy } from "lucide-react";
import { playDominoClack, playPass, playWin, playGameOver, playShuffle, playGameWin, playGameLoss } from "@/lib/sounds";

interface DragState {
  index: number;
  x: number;
  y: number;
}

const SCORE_LIMIT = 6;

function CpuStrip({ nome, qtd, isTurn }: { nome: string; qtd: number; isTurn: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 select-none ${
        isTurn
          ? "bg-[#f5b942] text-[#3a1a00] ring-2 ring-white/60 cpu-thinking"
          : "bg-[#3a1a00]/60 text-[#f5d9b3]"
      }`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isTurn ? "bg-[#3a1a00] animate-pulse" : "bg-[#a89078]"}`} />
      <span>{nome}</span>
      <span className="opacity-60">·</span>
      <span>{qtd}</span>
    </div>
  );
}

function ScoreBar({ placar }: { placar: { A: number; B: number } }) {
  const total = SCORE_LIMIT;
  return (
    <div className="flex items-center gap-2 px-3 py-1 shrink-0">
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        <span className="text-[#f5d9b3] text-[10px] font-bold tracking-wide uppercase opacity-80">Você+CPU2</span>
        <div className="flex gap-0.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-sm border border-white/20 transition-all duration-300 ${
                i < placar.A ? "bg-[#f5b942]" : "bg-[#3a1a00]/60"
              }`}
            />
          ))}
        </div>
        <span className="text-[#f5b942] font-black text-sm w-4 text-right">{placar.A}</span>
      </div>
      <span className="text-white/40 text-xs font-bold">×</span>
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[#f5b942] font-black text-sm w-4">{placar.B}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-sm border border-white/20 transition-all duration-300 ${
                i < placar.B ? "bg-[#e05c2a]" : "bg-[#3a1a00]/60"
              }`}
            />
          ))}
        </div>
        <span className="text-[#f5d9b3] text-[10px] font-bold tracking-wide uppercase opacity-80">CPU1+CPU3</span>
      </div>
    </div>
  );
}

const DIFICULDADE_LABELS: Record<Dificuldade, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

const CPU_DELAY_MS = 3000;

interface DominoGameProps {
  onGameOver?: (venceuTimeA: boolean) => void;
  adsRemoved?: boolean;
}

export function DominoGame({ onGameOver, adsRemoved = false }: DominoGameProps) {
  const [dificuldade, setDificuldade] = useState<Dificuldade>("medio");
  const jogoRef = useRef<JogoDomino>(new JogoDomino("medio"));
  const [estado, setEstado] = useState<EstadoJogo>(jogoRef.current.estado());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [turnoFlash, setTurnoFlash] = useState<{ nome: string; isHuman: boolean; key: number } | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropHover, setDropHover] = useState<"E" | "D" | null>(null);
  const [cpuThinking, setCpuThinking] = useState(false);
  const [showDificuldadeMenu, setShowDificuldadeMenu] = useState(false);

  const prevTurnoId = useRef<number>(jogoRef.current.estado().turnoId);
  const flashKey = useRef(0);
  const dropHoverRef = useRef<"E" | "D" | null>(null);
  const draggingRef = useRef<DragState | null>(null);
  const dropLeftRef = useRef<HTMLDivElement>(null);
  const dropRightRef = useRef<HTMLDivElement>(null);
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverFiredRef = useRef(false);

  const { toast } = useToast();
  const isMyTurn = estado.turnoId === 0 && !cpuThinking;

  useEffect(() => { dropHoverRef.current = dropHover; }, [dropHover]);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);

  const flashTurno = useCallback((novoEstado: EstadoJogo) => {
    if (novoEstado.fim) return;
    if (novoEstado.turnoId !== prevTurnoId.current) {
      prevTurnoId.current = novoEstado.turnoId;
      flashKey.current += 1;
      setTurnoFlash({ nome: novoEstado.turno, isHuman: novoEstado.turnoId === 0, key: flashKey.current });
      setTimeout(() => setTurnoFlash(null), 1800);
    }
  }, []);

  const scheduleCpuTurns = useCallback(() => {
    if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);

    const step = () => {
      const { jogou, fim, proximoTurnoId } = jogoRef.current.jogarUmCpu();
      if (!jogou) { setCpuThinking(false); return; }
      playDominoClack();
      const novoEstado = jogoRef.current.estado();
      setEstado(novoEstado);
      flashTurno(novoEstado);
      if (fim || proximoTurnoId === 0) {
        setCpuThinking(false);
      } else {
        cpuTimerRef.current = setTimeout(step, CPU_DELAY_MS);
      }
    };

    setCpuThinking(true);
    cpuTimerRef.current = setTimeout(step, CPU_DELAY_MS);
  }, [flashTurno]);

  useEffect(() => () => { if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current); }, []);

  // Fire game over callback once when jogoFinalizado becomes true
  useEffect(() => {
    if (estado.jogoFinalizado && !gameOverFiredRef.current) {
      gameOverFiredRef.current = true;
      onGameOver?.(estado.vencedorTime === "A");
      if (estado.vencedorTime === "A") {
        playGameWin();
      } else {
        playGameLoss();
      }
    }
  }, [estado.jogoFinalizado, estado.vencedorTime, onGameOver]);

  const resetInteraction = useCallback(() => {
    setSelectedIndex(null);
    setDragging(null);
    setDropHover(null);
    setTurnoFlash(null);
    setCpuThinking(false);
    if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
  }, []);

  const handleNovaPartida = useCallback(() => {
    resetInteraction();
    gameOverFiredRef.current = false;
    jogoRef.current.novaPartida();
    const novoEstado = jogoRef.current.estado();
    prevTurnoId.current = novoEstado.turnoId;
    setEstado(novoEstado);
    playShuffle();
    if (novoEstado.turnoId !== 0 && !novoEstado.fim) scheduleCpuTurns();
    toast({ title: "Nova partida!", description: "Boa sorte, arretado!" });
  }, [resetInteraction, scheduleCpuTurns, toast]);

  const handleNovaRodada = useCallback(() => {
    resetInteraction();
    jogoRef.current.novaRodada();
    const novoEstado = jogoRef.current.estado();
    prevTurnoId.current = novoEstado.turnoId;
    setEstado(novoEstado);
    playShuffle();
    if (!novoEstado.aguardandoEscolha && novoEstado.turnoId !== 0 && !novoEstado.fim) scheduleCpuTurns();
    toast({ title: "Nova rodada!", description: "As pedras foram distribuídas." });
  }, [resetInteraction, scheduleCpuTurns, toast]);

  const handleEscolherIniciador = useCallback((seat: 0 | 2) => {
    jogoRef.current.escolherIniciador(seat);
    const novoEstado = jogoRef.current.estado();
    prevTurnoId.current = novoEstado.turnoId;
    setEstado(novoEstado);
    if (!novoEstado.aguardandoEscolha && novoEstado.turnoId !== 0) scheduleCpuTurns();
  }, [scheduleCpuTurns]);

  const handleChangeDificuldade = useCallback((d: Dificuldade) => {
    setDificuldade(d);
    jogoRef.current.setDificuldade(d);
    setShowDificuldadeMenu(false);
    toast({ title: `Dificuldade: ${DIFICULDADE_LABELS[d]}`, description: "Os CPUs vão jogar diferente a partir de agora." });
  }, [toast]);

  const handleSelectPeca = useCallback((index: number) => {
    if (!isMyTurn) return;
    setSelectedIndex(prev => (prev === index ? null : index));
  }, [isMyTurn]);

  const handlePassar = useCallback(() => {
    if (!estado.podePasse || !isMyTurn) return;
    jogoRef.current.passarHumano();
    setSelectedIndex(null);
    const novoEstado = jogoRef.current.estado();
    setEstado(novoEstado);
    flashTurno(novoEstado);
    playPass();
    toast({ title: "Vez passada", description: "Você bateu na mesa e passou a vez." });
    if (!novoEstado.fim && novoEstado.turnoId !== 0) scheduleCpuTurns();
  }, [estado.podePasse, isMyTurn, flashTurno, scheduleCpuTurns, toast]);

  const executeJogar = useCallback((index: number, lado: "E" | "D") => {
    const { ok, mensagem } = jogoRef.current.jogar(index, lado);
    if (!ok) {
      toast({ variant: "destructive", title: "Jogada inválida", description: mensagem });
      return false;
    }
    playDominoClack();
    setSelectedIndex(null);
    const novoEstado = jogoRef.current.estado();
    setEstado(novoEstado);
    flashTurno(novoEstado);
    if (!novoEstado.fim && novoEstado.turnoId !== 0) scheduleCpuTurns();
    return true;
  }, [flashTurno, scheduleCpuTurns, toast]);

  const handleDragStart = useCallback((index: number, e: React.PointerEvent) => {
    if (!isMyTurn || estado.fim) return;
    setDragging({ index, x: e.clientX, y: e.clientY });
    setSelectedIndex(index);
  }, [isMyTurn, estado.fim]);

  useEffect(() => {
    if (!dragging) return;

    const inRect = (ref: React.RefObject<HTMLDivElement>, x: number, y: number) => {
      const r = ref.current?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    const onMove = (e: PointerEvent) => {
      setDragging(d => d ? { ...d, x: e.clientX, y: e.clientY } : null);
      if (inRect(dropLeftRef, e.clientX, e.clientY)) {
        setDropHover("E"); dropHoverRef.current = "E";
      } else if (inRect(dropRightRef, e.clientX, e.clientY)) {
        setDropHover("D"); dropHoverRef.current = "D";
      } else {
        setDropHover(null); dropHoverRef.current = null;
      }
    };

    const onUp = () => {
      const hover = dropHoverRef.current;
      const drag = draggingRef.current;
      if (hover && drag) {
        const peca = jogoRef.current.estado().mao[drag.index];
        if (peca) {
          const canDrop = hover === "E"
            ? jogoRef.current.pecaValidaParaEsquerda(peca)
            : jogoRef.current.pecaValidaParaDireita(peca);
          if (canDrop) {
            executeJogar(drag.index, hover);
          } else {
            toast({ variant: "destructive", title: "Essa peça não encaixa aí!" });
          }
        }
      }
      setDragging(null);
      setDropHover(null);
      dropHoverRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, executeJogar, toast]);

  const selectedPeca = selectedIndex !== null ? estado.mao[selectedIndex] : null;
  const canDropLeft  = selectedPeca ? jogoRef.current.pecaValidaParaEsquerda(selectedPeca) : false;
  const canDropRight = selectedPeca ? jogoRef.current.pecaValidaParaDireita(selectedPeca) : false;
  const dragPeca     = dragging !== null ? estado.mao[dragging.index] : null;

  const myTeamWon = estado.vencedorTime === "A";
  const myTeamScore = estado.placar.A;
  const enemyScore  = estado.placar.B;

  const tipoVitoriaLabel: Record<string, string> = {
    "Batida simples": "Batida simples",
    "Carroçada": "Carroçada! 🁣",
    "Lá e Lô": "Lá e Lô!",
    "Cruzada": "Cruzada!",
    "Trancado": "Jogo trancado",
  };

  return (
    <div
      className="min-h-[100dvh] varanda-bg w-full flex flex-col overflow-hidden relative select-none"
      style={{ touchAction: "none" }}
    >
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-2 z-10 shrink-0">
        <h1 className="font-serif text-lg sm:text-2xl text-white font-bold drop-shadow-md">
          Dominó de 6 Pedras
        </h1>
        <div className="flex items-center gap-2">
          {/* Difficulty selector */}
          <div className="relative">
            <button
              onClick={() => setShowDificuldadeMenu(v => !v)}
              className="text-[#f5d9b3]/80 hover:text-white text-xs font-bold px-2 py-1 rounded-full bg-black/20 border border-white/10 flex items-center gap-1"
            >
              🎯 {DIFICULDADE_LABELS[dificuldade]}
            </button>
            {showDificuldadeMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#fffcf5] border-2 border-[#5c3018] rounded-xl shadow-xl z-50 overflow-hidden min-w-[130px]">
                {(["facil", "medio", "dificil"] as Dificuldade[]).map(d => (
                  <button
                    key={d}
                    onClick={() => handleChangeDificuldade(d)}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                      d === dificuldade
                        ? "bg-[#c4541a] text-white"
                        : "text-[#5c3018] hover:bg-[#f5ede0]"
                    }`}
                  >
                    {DIFICULDADE_LABELS[d]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline" size="sm" onClick={handleNovaPartida}
            className="bg-[#fffcf5]/90 hover:bg-[#fffcf5] text-[#5c3018] border-[#5c3018] shadow-md text-xs"
            data-testid="btn-nova-partida-header"
          >
            Nova Partida
          </Button>
        </div>
      </header>

      {/* Score bar */}
      <ScoreBar placar={estado.placar} />

      {/* CPU strips */}
      <div className="flex justify-around items-center px-4 pb-1 z-10 shrink-0">
        <CpuStrip nome="CPU 1" qtd={estado.qtdCpu["CPU 1"]} isTurn={estado.turnoId === 1} />
        <CpuStrip nome="CPU 2" qtd={estado.qtdCpu["CPU 2"]} isTurn={estado.turnoId === 2} />
        <CpuStrip nome="CPU 3" qtd={estado.qtdCpu["CPU 3"]} isTurn={estado.turnoId === 3} />
      </div>

      {/* CPU thinking indicator */}
      {cpuThinking && !estado.fim && (
        <div className="flex items-center justify-center gap-2 text-[#f5d9b3] text-xs py-0.5 shrink-0">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{estado.turno} está pensando…</span>
        </div>
      )}

      {/* Mesa */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 z-10 min-h-0">
        <Mesa
          board={estado.board}
          dragActive={dragging !== null}
          canDropLeft={canDropLeft}
          canDropRight={canDropRight}
          dropHover={dropHover}
          dropLeftRef={dropLeftRef}
          dropRightRef={dropRightRef}
          lastPlayedSide={estado.lastPlayedSide}
        />

        {/* Info bar */}
        <div className="mt-2 w-full max-w-[min(100%,46vh)] flex justify-between items-center px-3 py-1.5 bg-[#5c3018]/60 backdrop-blur-sm rounded-full text-white/90 text-xs font-medium border border-[#a89078]/20 shadow-inner">
          <span className="truncate max-w-[65%]">{estado.mensagem || "Boa partida!"}</span>
          {estado.esquerda !== null && estado.direita !== null && (
            <span className="shrink-0 flex items-center gap-1.5">
              Pontas:
              <strong className="text-secondary bg-[#5c3018] px-1.5 py-0.5 rounded text-xs">{estado.esquerda}</strong>
              /
              <strong className="text-secondary bg-[#5c3018] px-1.5 py-0.5 rounded text-xs">{estado.direita}</strong>
            </span>
          )}
        </div>

        {/* Sleeping pieces strip (outside mesa) */}
        {estado.sleeping && estado.sleeping.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[#f5d9b3]/60 text-[9px] font-bold uppercase tracking-widest">Dorme</span>
            <div className="flex gap-1.5">
              {estado.sleeping.map((_, i) => (
                <FaceDownPeca key={i} />
              ))}
            </div>
          </div>
        )}
      </div>

    {/* Player Hand - centralizada abaixo da mesa */}
<div className="w-full flex justify-center items-center mt-3 mb-2 z-20">
  <div className="w-full max-w-[520px] px-2">
    <Mao
      mao={estado.mao}
      selectedIndex={selectedIndex}
      draggingIndex={dragging?.index ?? null}
      onSelect={handleSelectPeca}
      onDragStart={handleDragStart}
      isMyTurn={isMyTurn}
    />
  </div>
</div>

{/* Controls - abaixo das peças */}
<Controles onPassar={handlePassar} podePassar={estado.podePasse} isMyTurn={isMyTurn} />

      {/* Ghost piece */}
      {dragging && dragPeca && (
        <div
          style={{
            position: "fixed",
            left: dragging.x - 56,
            top: dragging.y - 28,
            zIndex: 999,
            pointerEvents: "none",
            transform: "scale(1.15) rotate(-4deg)",
            opacity: 0.92,
            filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.55))",
          }}
        >
          <PecaDomino peca={dragPeca} orientation="horizontal" />
        </div>
      )}

      {/* Turn flash overlay */}
      {turnoFlash && (
        <div key={turnoFlash.key} className="absolute bottom-32 inset-x-0 z-40 pointer-events-none flex justify-center">
          <div className={`turno-flash flex items-center gap-2 px-4 py-1.5 rounded-full shadow-xl text-sm font-black tracking-wide ${
            turnoFlash.isHuman
              ? "bg-[#f5b942] text-[#3a1a00]"
              : "bg-[#3a1a00]/90 text-[#f5d9b3] border border-[#a89078]/40"
          }`}>
            <span className="text-base leading-none">{turnoFlash.isHuman ? "⬇" : "🎯"}</span>
            <span>{turnoFlash.isHuman ? "SUA VEZ!" : turnoFlash.nome}</span>
          </div>
        </div>
      )}

      {/* Difficulty menu backdrop */}
      {showDificuldadeMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDificuldadeMenu(false)} />
      )}

      {/* Choose who starts overlay */}
      {estado.aguardandoEscolha && estado.timeEscolha === "A" && !estado.fim && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffcf5] border-4 border-[#5c3018] rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
            <p className="text-4xl mb-3">🁣</p>
            <h2 className="font-serif text-2xl font-bold text-[#5c3018] mb-1">Quem começa?</h2>
            <p className="text-sm text-[#a89078] mb-5">Seu time ganhou a rodada anterior. Escolha quem vai sair.</p>
            <div className="flex gap-3">
              <Button
                size="lg"
                onClick={() => handleEscolherIniciador(0)}
                className="flex-1 bg-[#c4541a] hover:bg-[#a03a10] text-white font-bold rounded-xl h-12"
              >
                Você
              </Button>
              <Button
                size="lg"
                onClick={() => handleEscolherIniciador(2)}
                variant="outline"
                className="flex-1 border-[#5c3018] text-[#5c3018] font-bold rounded-xl h-12"
              >
                CPU 2
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hand over / Game over modal */}
      {estado.fim && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffcf5] border-4 border-[#5c3018] rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">

            {/* Buchuda badge */}
            {estado.ehBuchuda && (
              <div className="inline-block bg-[#f5b942] text-[#3a1a00] text-xs font-black px-3 py-1 rounded-full mb-3 tracking-widest uppercase animate-bounce">
                🏆 BUCHUDA!
              </div>
            )}

            {/* Icon */}
            {estado.jogoFinalizado ? (
              <Trophy className={`w-14 h-14 mx-auto mb-3 ${myTeamWon ? "text-[#f5b942] animate-bounce" : "text-[#a89078]"}`} />
            ) : myTeamWon ? (
              <PartyPopper className="w-14 h-14 text-[#f5b942] mx-auto mb-3 animate-bounce" />
            ) : (
              <AlertCircle className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
            )}

            {/* Main title */}
            <h2 className="font-serif text-2xl font-bold text-[#5c3018] mb-1">
              {estado.jogoFinalizado
                ? (myTeamWon ? "Eita glória! Ganhamos!" : "Perdemos o jogo!")
                : (myTeamWon ? "Ponto nosso!" : "Ponto dos adversários!")}
            </h2>

            {/* Victory type */}
            {estado.tipoVitoria && (
              <p className="text-base font-bold text-[#c4541a] mb-1">
                {tipoVitoriaLabel[estado.tipoVitoria] ?? estado.tipoVitoria}
              </p>
            )}

            {/* Winner name */}
            <p className="text-sm text-[#a89078] mb-4">
              {estado.tipoVitoria === "Trancado"
                ? `Jogo trancado — menor pedra vence`
                : `${estado.vencedor} bateu`}
              {estado.pontosMao > 0 && (
                <span className="ml-1 font-bold text-[#5c3018]">
                  (+{estado.pontosMao} ponto{estado.pontosMao !== 1 ? "s" : ""})
                </span>
              )}
            </p>

            {/* Score display */}
            <div className="flex justify-center gap-6 mb-4 py-3 bg-[#f5ede0] rounded-xl">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-[#a89078] tracking-wider mb-0.5">Você + CPU 2</p>
                <p className={`text-4xl font-black ${myTeamScore >= SCORE_LIMIT ? "text-[#f5b942]" : "text-[#5c3018]"}`}>
                  {myTeamScore}
                </p>
              </div>
              <div className="flex items-center text-[#a89078] text-2xl font-light">×</div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-[#a89078] tracking-wider mb-0.5">CPU 1 + CPU 3</p>
                <p className={`text-4xl font-black ${enemyScore >= SCORE_LIMIT ? "text-[#e05c2a]" : "text-[#5c3018]"}`}>
                  {enemyScore}
                </p>
              </div>
            </div>

            {/* Sleeping pieces revealed */}
            {estado.sleeping && estado.sleeping.length > 0 && (
              <div className="mb-4 px-3 py-2.5 bg-[#f5ede0] rounded-xl">
                <p className="text-[9px] uppercase font-bold text-[#a89078] tracking-widest mb-2 text-center">Pedras que dormiram</p>
                <div className="flex justify-center gap-2">
                  {estado.sleeping.map((peca, i) => (
                    <div
                      key={i}
                      className="rounded-[4px] border border-[#a89078] overflow-hidden shadow-sm"
                      style={{
                        width: 48, height: 24,
                        display: "flex", flexDirection: "row",
                        background: "#fffcf5",
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

            {/* Action buttons */}
            {estado.jogoFinalizado ? (
              <Button
                size="lg" onClick={handleNovaPartida}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base h-12 rounded-xl shadow-lg"
                data-testid="btn-nova-partida-modal"
              >
                Nova Partida
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  size="lg" onClick={handleNovaRodada}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base h-12 rounded-xl shadow-lg"
                  data-testid="btn-nova-rodada"
                >
                  Próxima Rodada
                </Button>
                <Button
                  size="sm" variant="ghost" onClick={handleNovaPartida}
                  className="w-full text-[#a89078] hover:text-[#5c3018] text-xs"
                  data-testid="btn-nova-partida-modal"
                >
                  Zerar e começar nova partida
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
