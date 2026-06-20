import { Button } from "@/components/ui/button";
import { SkipForward } from "lucide-react";

interface ControlesProps {
  onPassar: () => void;
  podePassar: boolean;
  isMyTurn: boolean;
}

export function Controles({ onPassar, podePassar, isMyTurn }: ControlesProps) {
  return (
    <div className="flex items-center justify-center py-1.5 shrink-0">
      <Button
        size="sm"
        onClick={onPassar}
        disabled={!isMyTurn || !podePassar}
        variant="outline"
        className="bg-[#fffcf5] hover:bg-[#f5d9b3] text-[#5c3018] border-[#a89078] font-bold shadow-md rounded-full px-6 h-9"
        data-testid="btn-passar"
      >
        <SkipForward className="mr-1.5 h-4 w-4" />
        Passar a Vez
      </Button>
    </div>
  );
}
