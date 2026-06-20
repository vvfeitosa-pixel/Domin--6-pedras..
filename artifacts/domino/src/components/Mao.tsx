import { Peca } from "@/lib/dominoEngine";
import { PecaDomino } from "./PecaDomino";

interface MaoProps {
  mao: Peca[];
  selectedIndex: number | null;
  draggingIndex: number | null;
  onSelect: (index: number) => void;
  onDragStart: (index: number, e: React.PointerEvent) => void;
  isMyTurn: boolean;
}

export function Mao({ mao, selectedIndex, draggingIndex, onSelect, onDragStart, isMyTurn }: MaoProps) {
  return (
    <div
      className={`w-full wood-panel rounded-t-2xl sm:rounded-2xl shadow-xl transition-all duration-300 shrink-0 ${
        isMyTurn ? "mao-active" : ""
      }`}
    >
      <div className="flex justify-between items-center px-4 pt-2 pb-0.5">
        <h3 className="font-serif text-base sm:text-lg text-[#f5d9b3] drop-shadow-md flex items-center gap-2">
          Suas Peças
          {isMyTurn && (
            <span className="text-secondary text-[10px] font-sans px-2 py-0.5 bg-secondary/20 rounded-full">
              Sua Vez
            </span>
          )}
        </h3>
        <span className="text-[#a89078] text-xs font-medium">
          {mao.length} {mao.length === 1 ? "peça" : "peças"}
        </span>
      </div>

      {isMyTurn && mao.length > 0 && (
        <p className="text-center text-[#a89078] text-[10px] pb-0.5">
          Selecione e arraste até a mesa
        </p>
      )}

      {/* Horizontal scroll — single row, never wraps */}
      <div
        className="flex gap-1.5 sm:gap-2 px-3 pb-3 pt-1 overflow-x-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {mao.map((peca, index) => (
          <div
            key={`mao-${index}-${peca[0]}-${peca[1]}`}
            style={{
              opacity: draggingIndex === index ? 0.35 : 1,
              transition: "opacity 0.15s",
              touchAction: "none",
              flexShrink: 0,
            }}
            onPointerDown={(e) => {
              if (!isMyTurn) return;
              e.preventDefault();
              onSelect(index);
              onDragStart(index, e);
            }}
            onClick={() => {
              if (!isMyTurn) return;
              onSelect(index);
            }}
          >
            <PecaDomino
              peca={peca}
              orientation="vertical"
              selected={selectedIndex === index}
              data-testid={`peca-mao-${index}`}
              className={`hover:z-10 cursor-grab active:cursor-grabbing ${isMyTurn ? "" : "cursor-not-allowed"}`}
            />
          </div>
        ))}
        {mao.length === 0 && (
          <div className="h-16 flex items-center justify-center w-full">
            <p className="text-[#a89078] italic text-sm">Mão vazia</p>
          </div>
        )}
      </div>
    </div>
  );
}
