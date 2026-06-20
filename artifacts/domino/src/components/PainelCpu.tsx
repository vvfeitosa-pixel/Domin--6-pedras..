import { cn } from "@/lib/utils";

interface PainelCpuProps {
  nome: string;
  qtdPecas: number;
  isTurn: boolean;
  position: "top" | "left" | "right";
}

export function PainelCpu({ nome, qtdPecas, isTurn, position }: PainelCpuProps) {
  const isHorizontal = position === "top";
  
  return (
    <div 
      className={cn(
        "flex flex-col items-center bg-[#5c3018]/80 backdrop-blur-sm p-3 rounded-lg border border-[#a89078]/30 shadow-lg transition-all duration-300",
        isTurn && "ring-2 ring-secondary scale-105 bg-[#5c3018] cpu-thinking"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-2 h-2 rounded-full", isTurn ? "bg-secondary animate-pulse" : "bg-muted-foreground")} />
        <span className="font-serif font-bold text-[#f5d9b3]">{nome}</span>
      </div>
      
      <div className={cn(
        "flex gap-1", 
        !isHorizontal && "flex-wrap max-w-[80px] justify-center"
      )}>
        {Array.from({ length: qtdPecas }).map((_, i) => (
          <div 
            key={i} 
            className="w-4 h-6 sm:w-5 sm:h-8 bg-[#fffcf5] border border-[#a89078] rounded-[2px] shadow-sm relative overflow-hidden"
          >
            {/* Fake dots on back of domino to look like face-down pieces */}
            <div className="absolute inset-0 bg-[#3a2012]/10" />
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#a89078]" />
          </div>
        ))}
        {qtdPecas === 0 && (
          <span className="text-xs text-[#a89078]">Sem peças</span>
        )}
      </div>
    </div>
  );
}