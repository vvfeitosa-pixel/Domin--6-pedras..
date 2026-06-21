import { Peca } from "@/lib/dominoEngine";
import { PecaDomino } from "./PecaDomino";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface MesaProps {
  board: Peca[];
  dragActive: boolean;
  canDropLeft: boolean;
  canDropRight: boolean;
  dropHover: "E" | "D" | null;
  dropLeftRef: React.RefObject<HTMLDivElement>;
  dropRightRef: React.RefObject<HTMLDivElement>;
  lastPlayedSide?: "E" | "D" | null;
  isMyTurn?: boolean;
}

export function FaceDownPeca({ className }: { className?: string }) {
  return (
    <div
      className={`w-8 h-4 rounded-[3px] border border-[#a89078] shadow-sm overflow-hidden flex flex-row bg-[#fffcf5] ${className ?? ""}`}
      title="Pedra dormindo"
    >
      <div className="flex-1 bg-[#fdfaf1]" />
      <div className="w-[1px] h-full bg-[#a89078]" />
      <div className="flex-1 bg-[#fdfaf1]" />
    </div>
  );
}

interface PieceLayout {
  x: number;
  y: number;
  isVertical: boolean;
  reversed: boolean;
}

const PW = 84;
const PH = 42;

function computeSnakeLayout(
  count: number,
  containerPx: number
): { positions: PieceLayout[]; layoutW: number; layoutH: number } {
  const padding = 16;
  const available = containerPx - padding * 2 - 2 * PH;
  const runsPerRow = Math.max(2, Math.floor(available / PW));

  const horizStartX = PH;
  const rightCornerX = horizStartX + runsPerRow * PW;
  const leftCornerX = 0;
  const layoutW = rightCornerX + PH;

  const rowH = Math.round(PH * 1.5);

  const positions: PieceLayout[] = [];
  let direction = 1;
  let posInRun = 0;
  let rowY = 0;

  for (let i = 0; i < count; i++) {
    if (posInRun < runsPerRow) {
      const col = direction === 1 ? posInRun : runsPerRow - 1 - posInRun;

      positions.push({
        x: horizStartX + col * PW,
        y: rowY,
        isVertical: false,
        reversed: direction === -1,
      });

      posInRun++;
    } else {
      const x = direction === 1 ? rightCornerX : leftCornerX;

      positions.push({
        x,
        y: rowY,
        isVertical: true,
        reversed: false,
      });

      rowY += rowH;
      direction *= -1;
      posInRun = 0;
    }
  }

  return { positions, layoutW, layoutH: rowY + PH };
}

function renderPiece(
  peca: Peca,
  isVertical: boolean,
  reversed: boolean,
  highlight: boolean
) {
  const w = isVertical ? PH : PW;
  const h = isVertical ? PW : PH;
  const displayPeca: Peca = reversed ? [peca[1], peca[0]] : peca;

  return (
    <div
      style={{
        width: w,
        height: h,
        overflow: "visible",
        flexShrink: 0,
        borderRadius: 5,
        ...(highlight
          ? {
              outline: "2.5px solid #f5b942",
              outlineOffset: 2,
              boxShadow:
                "0 0 0 4px rgba(245,185,66,0.30), 0 0 12px rgba(245,185,66,0.45)",
              zIndex: 3,
            }
          : {}),
      }}
    >
      <PecaDomino
        peca={displayPeca}
        orientation={isVertical ? "vertical" : "horizontal"}
        className={`!w-full !h-full !rounded !shadow-none${
          highlight ? " brightness-110 saturate-[1.1]" : ""
        }`}
      />
    </div>
  );
}

export function Mesa({
  board,
  dragActive,
  canDropLeft,
  canDropRight,
  dropHover,
  dropLeftRef,
  dropRightRef,
  lastPlayedSide,
  isMyTurn,
}: MesaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerPx, setContainerPx] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerPx(el.clientWidth);

    const ro = new ResizeObserver(() => setContainerPx(el.clientWidth));
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const hasBoard = board.length > 0 && containerPx > 0;

  const { positions, layoutW, layoutH } = hasBoard
    ? computeSnakeLayout(board.length, containerPx)
    : { positions: [], layoutW: 0, layoutH: 0 };

  const usable = containerPx - 32;
  const maxDim = Math.max(layoutW, layoutH);
  const scale = hasBoard ? Math.min(1, usable / maxDim) : 1;

  const renderedW = layoutW * scale;
  const renderedH = layoutH * scale;

  const lastPlayedIdx =
    hasBoard && lastPlayedSide
      ? lastPlayedSide === "E"
        ? 0
        : board.length - 1
      : -1;

  return (
    <div
      ref={containerRef}
      data-testid="mesa-board"
      className={`domino-board-bg border-[8px] rounded-xl shadow-[inset_0_4px_20px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.3)] relative overflow-hidden flex items-center justify-center mx-auto transition-all duration-300 ${
        isMyTurn
          ? "border-[#f5b942] ring-4 ring-[#f5b942]/60 ring-offset-2 ring-offset-transparent"
          : "border-[#5c3018]"
      }`}
      style={{
        aspectRatio: "1 / 1",
        width: "min(100%, clamp(200px, 38vh, 380px))",
      }}
    >
      {!hasBoard && (
        <p className="text-white/30 font-serif text-xl rotate-[-5deg] pointer-events-none select-none">
          O jogo tá na mesa
        </p>
      )}

      {hasBoard && (
        <div style={{ width: renderedW, height: renderedH, flexShrink: 0 }}>
          <div
            style={{
              width: layoutW,
              height: layoutH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "relative",
            }}
          >
            {board.map((peca, idx) => {
              const layout = positions[idx];
              if (!layout) return null;

              const isHighlighted = idx === lastPlayedIdx;

              return (
                <div
                  key={`board-${idx}-${peca[0]}-${peca[1]}`}
                  style={{
                    position: "absolute",
                    left: layout.x,
                    top: layout.y,
                    transition: "left 0.15s ease, top 0.15s ease",
                    zIndex: isHighlighted ? 2 : 1,
                  }}
                >
                  {renderPiece(
                    peca,
                    layout.isVertical,
                    layout.reversed,
                    isHighlighted
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dragActive && (
        <>
          <div
            ref={dropLeftRef}
            className={`absolute left-0 top-0 w-1/2 h-full z-30 flex items-center justify-start pl-3 transition-all duration-150 ${
              dropHover === "E"
                ? canDropLeft
                  ? "bg-green-500/40"
                  : "bg-red-500/30"
                : "bg-white/5"
            }`}
          >
            <div
              className={`rounded-full p-2 border-2 transition-all ${
                canDropLeft
                  ? dropHover === "E"
                    ? "bg-green-500 border-green-300 scale-125"
                    : "bg-green-600/70 border-green-400"
                  : "bg-gray-600/50 border-gray-400/50"
              }`}
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </div>
          </div>

          <div
            ref={dropRightRef}
            className={`absolute right-0 top-0 w-1/2 h-full z-30 flex items-center justify-end pr-3 transition-all duration-150 ${
              dropHover === "D"
                ? canDropRight
                  ? "bg-green-500/40"
                  : "bg-red-500/30"
                : "bg-white/5"
            }`}
          >
            <div
              className={`rounded-full p-2 border-2 transition-all ${
                canDropRight
                  ? dropHover === "D"
                    ? "bg-green-500 border-green-300 scale-125"
                    : "bg-green-600/70 border-green-400"
                  : "bg-gray-600/50 border-gray-400/50"
              }`}
            >
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}import { Peca } from "@/lib/dominoEngine";
import { PecaDomino } from "./PecaDomino";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface MesaProps {
  board: Peca[];
  dragActive: boolean;
  canDropLeft: boolean;
  canDropRight: boolean;
  dropHover: "E" | "D" | null;
  dropLeftRef: React.RefObject<HTMLDivElement>;
  dropRightRef: React.RefObject<HTMLDivElement>;
  lastPlayedSide?: "E" | "D" | null;
  isMyTurn?: boolean;
}

export function FaceDownPeca({ className }: { className?: string }) {
  return (
    <div
      className={`w-8 h-4 rounded-[3px] border border-[#a89078] shadow-sm overflow-hidden flex flex-row bg-[#fffcf5] ${className ?? ""}`}
      title="Pedra dormindo"
    >
      <div className="flex-1 bg-[#fdfaf1]" />
      <div className="w-[1px] h-full bg-[#a89078]" />
      <div className="flex-1 bg-[#fdfaf1]" />
    </div>
  );
}

interface PieceLayout {
  x: number;
  y: number;
  isVertical: boolean;
  reversed: boolean;
}

const PW = 84;
const PH = 42;

function computeSnakeLayout(
  count: number,
  containerPx: number
): { positions: PieceLayout[]; layoutW: number; layoutH: number } {
  const padding = 16;

  const verticalW = PH;
  const verticalH = PW;

  const available = containerPx - padding * 2;

  const piecesPerColumn = Math.max(3, Math.floor(available / verticalH));

  const colW = verticalW * 1.35;
  const rowGap = verticalH * 0.45;

  const layoutW = Math.ceil(count / piecesPerColumn) * colW;
  const layoutH = piecesPerColumn * rowGap + verticalH;

  const positions: PieceLayout[] = [];

  let col = 0;
  let row = 0;
  let direction = 1;

  for (let i = 0; i < count; i++) {
    const visualRow = direction === 1 ? row : piecesPerColumn - 1 - row;

    positions.push({
      x: col * colW,
      y: visualRow * rowGap,
      isVertical: true,
      reversed: direction === -1,
    });

    row++;

    if (row >= piecesPerColumn) {
      row = 0;
      col++;
      direction *= -1;
    }
  }

  return { positions, layoutW, layoutH };
}

function renderPiece(
  peca: Peca,
  isVertical: boolean,
  reversed: boolean,
  highlight: boolean
) {
  const w = isVertical ? PH : PW;
  const h = isVertical ? PW : PH;
  const displayPeca: Peca = reversed ? [peca[1], peca[0]] : peca;

  return (
    <div
      style={{
        width: w,
        height: h,
        overflow: "visible",
        flexShrink: 0,
        borderRadius: 5,
        ...(highlight
          ? {
              outline: "2.5px solid #f5b942",
              outlineOffset: 2,
              boxShadow:
                "0 0 0 4px rgba(245,185,66,0.30), 0 0 12px rgba(245,185,66,0.45)",
              zIndex: 3,
            }
          : {}),
      }}
    >
      <PecaDomino
        peca={displayPeca}
        orientation={isVertical ? "vertical" : "horizontal"}
        className={`!w-full !h-full !rounded !shadow-none${
          highlight ? " brightness-110 saturate-[1.1]" : ""
        }`}
      />
    </div>
  );
}

export function Mesa({
  board,
  dragActive,
  canDropLeft,
  canDropRight,
  dropHover,
  dropLeftRef,
  dropRightRef,
  lastPlayedSide,
  isMyTurn,
}: MesaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerPx, setContainerPx] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerPx(el.clientWidth);

    const ro = new ResizeObserver(() => setContainerPx(el.clientWidth));
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const hasBoard = board.length > 0 && containerPx > 0;

  const { positions, layoutW, layoutH } = hasBoard
    ? computeSnakeLayout(board.length, containerPx)
    : { positions: [], layoutW: 0, layoutH: 0 };

  const usable = containerPx - 32;
  const maxDim = Math.max(layoutW, layoutH);
  const scale = hasBoard ? Math.min(1, usable / maxDim) : 1;

  const renderedW = layoutW * scale;
  const renderedH = layoutH * scale;

  const lastPlayedIdx =
    hasBoard && lastPlayedSide
      ? lastPlayedSide === "E"
        ? 0
        : board.length - 1
      : -1;

  return (
    <div
      ref={containerRef}
      data-testid="mesa-board"
      className={`domino-board-bg border-[8px] rounded-xl shadow-[inset_0_4px_20px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.3)] relative overflow-hidden flex items-center justify-center mx-auto transition-all duration-300 ${
        isMyTurn
          ? "border-[#f5b942] ring-4 ring-[#f5b942]/60 ring-offset-2 ring-offset-transparent"
          : "border-[#5c3018]"
      }`}
      style={{
        aspectRatio: "1 / 1",
        width: "min(100%, clamp(200px, 38vh, 380px))",
      }}
    >
      {!hasBoard && (
        <p className="text-white/30 font-serif text-xl rotate-[-5deg] pointer-events-none select-none">
          O jogo tá na mesa
        </p>
      )}

      {hasBoard && (
        <div style={{ width: renderedW, height: renderedH, flexShrink: 0 }}>
          <div
            style={{
              width: layoutW,
              height: layoutH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "relative",
            }}
          >
            {board.map((peca, idx) => {
              const layout = positions[idx];
              if (!layout) return null;

              const isHighlighted = idx === lastPlayedIdx;

              return (
                <div
                  key={`board-${idx}-${peca[0]}-${peca[1]}`}
                  style={{
                    position: "absolute",
                    left: layout.x,
                    top: layout.y,
                    transition: "left 0.15s ease, top 0.15s ease",
                    zIndex: isHighlighted ? 2 : 1,
                  }}
                >
                  {renderPiece(
                    peca,
                    layout.isVertical,
                    layout.reversed,
                    isHighlighted
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dragActive && (
        <>
          <div
            ref={dropLeftRef}
            className={`absolute left-0 top-0 w-1/2 h-full z-30 flex items-center justify-start pl-3 transition-all duration-150 ${
              dropHover === "E"
                ? canDropLeft
                  ? "bg-green-500/40"
                  : "bg-red-500/30"
                : "bg-white/5"
            }`}
          >
            <div
              className={`rounded-full p-2 border-2 transition-all ${
                canDropLeft
                  ? dropHover === "E"
                    ? "bg-green-500 border-green-300 scale-125"
                    : "bg-green-600/70 border-green-400"
                  : "bg-gray-600/50 border-gray-400/50"
              }`}
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </div>
          </div>

          <div
            ref={dropRightRef}
            className={`absolute right-0 top-0 w-1/2 h-full z-30 flex items-center justify-end pr-3 transition-all duration-150 ${
              dropHover === "D"
                ? canDropRight
                  ? "bg-green-500/40"
                  : "bg-red-500/30"
                : "bg-white/5"
            }`}
          >
            <div
              className={`rounded-full p-2 border-2 transition-all ${
                canDropRight
                  ? dropHover === "D"
                    ? "bg-green-500 border-green-300 scale-125"
                    : "bg-green-600/70 border-green-400"
                  : "bg-gray-600/50 border-gray-400/50"
              }`}
            >
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
