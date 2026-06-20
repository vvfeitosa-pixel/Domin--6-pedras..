import { cn } from "@/lib/utils";

interface PecaDominoProps {
  peca: [number, number];
  orientation?: "vertical" | "horizontal";
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

const DOT_POSITIONS = {
  0: [],
  1: ["center"],
  2: ["top-left", "bottom-right"],
  3: ["top-left", "center", "bottom-right"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
  6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"],
};

export function PecaDomino({
  peca,
  orientation = "vertical",
  selected = false,
  onClick,
  className,
  disabled = false,
  "data-testid": testId,
}: PecaDominoProps) {
  const [top, bottom] = peca;
  const isHorizontal = orientation === "horizontal";

  const renderDots = (value: number) => {
    const positions = DOT_POSITIONS[value as keyof typeof DOT_POSITIONS];
    return (
      <div className="relative w-full h-full p-1 flex-1 min-h-0 min-w-0">
        <div className="w-full h-full relative">
          {positions.map((pos, i) => {
            const classes = {
              "center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "top-left": "top-[10%] left-[10%]",
              "top-right": "top-[10%] right-[10%]",
              "middle-left": "top-1/2 left-[10%] -translate-y-1/2",
              "middle-right": "top-1/2 right-[10%] -translate-y-1/2",
              "bottom-left": "bottom-[10%] left-[10%]",
              "bottom-right": "bottom-[10%] right-[10%]",
            }[pos];

            return (
              <div
                key={i}
                className={cn(
                  "absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#3a2012] shadow-sm",
                  classes
                )}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid={testId}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "relative flex bg-[#fffcf5] border border-[#a89078] shadow-md rounded-md overflow-hidden transition-all duration-200 select-none",
        isHorizontal
          ? "flex-row w-[72px] h-9 sm:w-24 sm:h-12"
          : "flex-col w-9 h-[72px] sm:w-12 sm:h-24",
        selected && "ring-4 ring-secondary translate-y-[-8px] shadow-lg",
        onClick && !disabled && "cursor-pointer hover:scale-105",
        disabled && "opacity-70 cursor-not-allowed",
        className
      )}
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw0IDRaTTAgNEw0IDBaIiBzdHJva2U9IiNhODkwNzgiIHN0cm9rZS1vcGFjaXR5PSIwLjE1IiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] opacity-40 pointer-events-none mix-blend-multiply" />
      
      {/* Top/Left half */}
      <div className="flex-1 flex items-center justify-center relative bg-[#fdfaf1]">
        {renderDots(top)}
      </div>
      
      {/* Divider */}
      <div
        className={cn(
          "bg-[#a89078] z-10",
          isHorizontal ? "w-[1px] h-full shadow-[1px_0_1px_rgba(0,0,0,0.1)]" : "h-[1px] w-full shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
        )}
      />
      
      {/* Bottom/Right half */}
      <div className="flex-1 flex items-center justify-center relative bg-[#fdfaf1]">
        {renderDots(bottom)}
      </div>
    </div>
  );
}
