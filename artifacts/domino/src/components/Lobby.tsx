import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, User, ArrowLeft, BookOpen, Trophy, Shield, Crown, Info } from "lucide-react";
import { getSocket, getOrCreatePlayerId } from "@/lib/socketClient";
import { RoomPublicState } from "@/types/multiplayer";
import { useToast } from "@/hooks/use-toast";
import { SessaoStats } from "@/App";

type LobbyView = "home" | "create" | "join";
type ModalView = "tutorial" | "ranking" | "privacy" | "premium" | null;

interface LobbyProps {
  onSolo: () => void;
  onRoomReady: (room: RoomPublicState, mySocketId: string) => void;
  stats: SessaoStats;
  onResetStats: () => void;
  adsRemoved: boolean;
  onRemoveAdsDemo: () => void;
}

export function Lobby({ onSolo, onRoomReady, stats, onResetStats, adsRemoved, onRemoveAdsDemo }: LobbyProps) {
  const [view, setView] = useState<LobbyView>("home");
  const [modal, setModal] = useState<ModalView>(null);
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [maxHumans, setMaxHumans] = useState(2);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join")?.toUpperCase();
    if (code && code.length === 4) {
      setRoomCode(code);
      setView("join");
    }
  }, []);

  function handleCreate() {
    const name = playerName.trim();
    if (!name) { toast({ variant: "destructive", title: "Digite seu nome!" }); return; }
    setLoading(true);
    const socket = getSocket();

    socket.off("room-updated");
    socket.off("error");

    socket.once("room-updated", (room: RoomPublicState) => {
      setLoading(false);
      onRoomReady(room, socket.id!);
    });
    socket.once("error", ({ message }: { message: string }) => {
      setLoading(false);
      toast({ variant: "destructive", title: "Erro", description: message });
    });

    socket.emit("create-room", { playerName: name, maxHumans, playerId: getOrCreatePlayerId() });
  }

  function handleJoin() {
    const name = playerName.trim();
    const code = roomCode.trim().toUpperCase();
    if (!name) { toast({ variant: "destructive", title: "Digite seu nome!" }); return; }
    if (code.length !== 4) { toast({ variant: "destructive", title: "Código deve ter 4 letras." }); return; }
    setLoading(true);
    const socket = getSocket();

    socket.off("room-updated");
    socket.off("error");

    socket.once("room-updated", (room: RoomPublicState) => {
      setLoading(false);
      onRoomReady(room, socket.id!);
    });
    socket.once("error", ({ message }: { message: string }) => {
      setLoading(false);
      toast({ variant: "destructive", title: "Erro ao entrar", description: message });
    });

    socket.emit("join-room", { code, playerName: name, playerId: getOrCreatePlayerId() });
  }

  const totalJogos = stats.vitorias + stats.derrotas;
  const aproveitamento = totalJogos ? Math.round((stats.vitorias / totalJogos) * 100) : 0;

  return (
    <div className="min-h-[100dvh] varanda-bg flex flex-col items-center justify-center p-5 gap-5 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#f5b942]/20 to-transparent pointer-events-none" />

      <div className="text-center mb-1 relative z-10">
        <div className="inline-flex items-center gap-2 bg-[#3a1a00]/50 border border-[#a89078]/30 text-[#f5d9b3] rounded-full px-3 py-1 mb-3 text-[10px] font-black uppercase tracking-[0.22em]">
          <span>Vaca H Games</span>
          <span className="text-[#f5b942]">•</span>
          <span>Beta Mobile</span>
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl text-white font-black drop-shadow-xl leading-none">
          Dominó
        </h1>
        <p className="font-serif text-xl text-[#f5d9b3] opacity-90 italic">Pernambucano</p>
      </div>

      {view === "home" && (
        <div className="w-full max-w-sm relative z-10 flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-2 bg-[#3a1a00]/65 rounded-2xl p-3 border border-[#a89078]/30 shadow-xl">
            <div className="text-center">
              <p className="text-[#f5b942] font-black text-xl leading-none">{stats.vitorias}</p>
              <p className="text-[#f5d9b3] text-[9px] uppercase tracking-wider font-bold opacity-70">Vitórias</p>
            </div>
            <div className="text-center">
              <p className="text-[#e05c2a] font-black text-xl leading-none">{stats.derrotas}</p>
              <p className="text-[#f5d9b3] text-[9px] uppercase tracking-wider font-bold opacity-70">Derrotas</p>
            </div>
            <div className="text-center">
              <p className="text-white font-black text-xl leading-none">{aproveitamento}%</p>
              <p className="text-[#f5d9b3] text-[9px] uppercase tracking-wider font-bold opacity-70">Aproveit.</p>
            </div>
            <div className="text-center">
              <p className="text-[#f5b942] font-black text-xl leading-none">{stats.melhorSequencia}</p>
              <p className="text-[#f5d9b3] text-[9px] uppercase tracking-wider font-bold opacity-70">Seq.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={onSolo} className="h-16 rounded-2xl bg-[#5c3018] hover:bg-[#3a1a00] text-[#f5d9b3] font-bold text-lg border-2 border-[#a89078] shadow-xl flex gap-3">
              <User className="w-6 h-6" /> Jogar Sozinho
            </Button>
            <Button size="lg" onClick={() => setView("create")} className="h-16 rounded-2xl bg-[#c4541a] hover:bg-[#a03a10] text-white font-bold text-lg shadow-xl flex gap-3 relative overflow-hidden">
              <Users className="w-6 h-6" /> Criar Sala Online
              <span className="absolute top-2 right-2 text-[9px] bg-[#f5b942] text-[#3a1a00] rounded-full px-2 py-0.5 font-black">BETA</span>
            </Button>
            <Button size="lg" variant="outline" onClick={() => setView("join")} className="h-14 rounded-2xl bg-[#fffcf5]/90 hover:bg-[#fffcf5] text-[#5c3018] border-[#5c3018] font-bold text-base shadow-xl flex gap-3">
              <ArrowLeft className="w-5 h-5 rotate-180" /> Entrar em Sala
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => setModal("tutorial")} className="menu-mini-btn"><BookOpen className="w-4 h-4" /> Regras</button>
            <button onClick={() => setModal("ranking")} className="menu-mini-btn"><Trophy className="w-4 h-4" /> Ranking</button>
            <button onClick={() => setModal("premium")} className="menu-mini-btn"><Crown className="w-4 h-4" /> Premium</button>
            <button onClick={() => setModal("privacy")} className="menu-mini-btn"><Shield className="w-4 h-4" /> Privac.</button>
          </div>

          {!adsRemoved && (
            <div className="rounded-2xl border border-[#f5b942]/30 bg-[#3a1a00]/45 px-4 py-3 text-center text-[#f5d9b3] text-xs">
              <strong className="text-[#f5b942]">Monetização pronta:</strong> espaço de anúncio aparece somente após partidas. Use o botão Premium para simular “remover anúncios”.
            </div>
          )}
        </div>
      )}

      {view === "create" && (
        <div className="w-full max-w-xs bg-[#fffcf5] rounded-2xl p-6 shadow-2xl border-4 border-[#5c3018] flex flex-col gap-4 relative z-10">
          <button onClick={() => setView("home")} className="flex items-center gap-1 text-[#a89078] text-sm hover:text-[#5c3018] self-start"><ArrowLeft className="w-4 h-4" /> Voltar</button>
          <h2 className="font-serif text-xl font-bold text-[#5c3018]">Criar Sala Online <span className="text-[10px] bg-[#f5b942] rounded-full px-2 py-0.5 align-middle">BETA</span></h2>
          <div className="bg-[#f5ede0] rounded-xl p-3 text-xs text-[#5c3018] flex gap-2"><Info className="w-4 h-4 shrink-0" /> O online está marcado como beta para teste fechado antes da Play Store/App Store.</div>
          <div>
            <label className="text-xs font-bold text-[#a89078] uppercase tracking-wider">Seu nome</label>
            <Input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Como quer ser chamado?" maxLength={20} className="mt-1 border-[#a89078] focus:ring-[#c4541a]" onKeyDown={e => e.key === "Enter" && handleCreate()} />
          </div>
          <div>
            <label className="text-xs font-bold text-[#a89078] uppercase tracking-wider">Nº de jogadores humanos</label>
            <div className="flex gap-2 mt-1">
              {[2, 3, 4].map(n => <button key={n} onClick={() => setMaxHumans(n)} className={`flex-1 py-2 rounded-xl font-bold border-2 transition-all ${maxHumans === n ? "bg-[#c4541a] text-white border-[#c4541a]" : "bg-white text-[#5c3018] border-[#a89078] hover:border-[#5c3018]"}`}>{n}</button>)}
            </div>
            <p className="text-[10px] text-[#a89078] mt-1">CPUs preenchem os assentos vazios</p>
          </div>
          <Button onClick={handleCreate} disabled={loading} className="w-full h-12 rounded-xl bg-[#c4541a] hover:bg-[#a03a10] text-white font-bold text-base shadow-md">{loading ? "Criando…" : "Criar Sala"}</Button>
        </div>
      )}

      {view === "join" && (
        <div className="w-full max-w-xs bg-[#fffcf5] rounded-2xl p-6 shadow-2xl border-4 border-[#5c3018] flex flex-col gap-4 relative z-10">
          <button onClick={() => setView("home")} className="flex items-center gap-1 text-[#a89078] text-sm hover:text-[#5c3018] self-start"><ArrowLeft className="w-4 h-4" /> Voltar</button>
          <h2 className="font-serif text-xl font-bold text-[#5c3018]">Entrar em Sala</h2>
          {roomCode && <div className="bg-[#c4541a]/10 border border-[#c4541a]/30 rounded-xl px-4 py-2 text-sm text-[#5c3018]">Link de convite detectado — código <span className="font-mono font-bold">{roomCode}</span> preenchido.</div>}
          <div>
            <label className="text-xs font-bold text-[#a89078] uppercase tracking-wider">Seu nome</label>
            <Input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Como quer ser chamado?" maxLength={20} autoFocus className="mt-1 border-[#a89078]" onKeyDown={e => e.key === "Enter" && handleJoin()} />
          </div>
          <div>
            <label className="text-xs font-bold text-[#a89078] uppercase tracking-wider">Código da sala</label>
            <Input value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="Ex: ABCD" maxLength={4} className="mt-1 border-[#a89078] font-mono text-xl tracking-widest uppercase text-center" onKeyDown={e => e.key === "Enter" && handleJoin()} />
          </div>
          <Button onClick={handleJoin} disabled={loading} className="w-full h-12 rounded-xl bg-[#c4541a] hover:bg-[#a03a10] text-white font-bold text-base shadow-md">{loading ? "Entrando…" : "Entrar"}</Button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-[#fffcf5] border-4 border-[#5c3018] rounded-2xl p-6 max-w-sm w-full shadow-2xl text-[#5c3018]" onClick={e => e.stopPropagation()}>
            {modal === "tutorial" && <Tutorial />}
            {modal === "ranking" && <Ranking stats={stats} aproveitamento={aproveitamento} onResetStats={onResetStats} />}
            {modal === "privacy" && <Privacy />}
            {modal === "premium" && <Premium adsRemoved={adsRemoved} onRemoveAdsDemo={onRemoveAdsDemo} />}
            <Button onClick={() => setModal(null)} variant="outline" className="w-full mt-4 border-[#5c3018] text-[#5c3018] font-bold rounded-xl">Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tutorial() {
  return <div>
    <h2 className="font-serif text-2xl font-black mb-3">Regras rápidas</h2>
    <ul className="space-y-2 text-sm">
      <li><strong>Objetivo:</strong> bater a mão ou vencer no trancado pela menor soma de pedras.</li>
      <li><strong>Primeira rodada:</strong> começa quem tiver a maior carroça.</li>
      <li><strong>Rodadas seguintes:</strong> começa o vencedor da rodada anterior.</li>
      <li><strong>Pontuação:</strong> batida simples 1, carroçada 2, lá e lô 3, cruzada 4.</li>
      <li><strong>Dorme:</strong> 4 pedras ficam fora da mão e aparecem ao final da rodada.</li>
    </ul>
  </div>;
}

function Ranking({ stats, aproveitamento, onResetStats }: { stats: SessaoStats; aproveitamento: number; onResetStats: () => void }) {
  return <div>
    <h2 className="font-serif text-2xl font-black mb-3">Ranking local</h2>
    <div className="grid grid-cols-2 gap-2 text-center">
      <div className="ranking-card"><p>{stats.vitorias}</p><span>Vitórias</span></div>
      <div className="ranking-card"><p>{stats.derrotas}</p><span>Derrotas</span></div>
      <div className="ranking-card"><p>{aproveitamento}%</p><span>Aproveitamento</span></div>
      <div className="ranking-card"><p>{stats.melhorSequencia}</p><span>Melhor sequência</span></div>
    </div>
    <button onClick={onResetStats} className="mt-4 text-xs text-[#a89078] hover:text-[#5c3018] font-bold underline w-full">Zerar ranking local</button>
  </div>;
}

function Privacy() {
  return <div>
    <h2 className="font-serif text-2xl font-black mb-3">Privacidade</h2>
    <p className="text-sm mb-2">Esta versão salva apenas estatísticas locais no aparelho, como vitórias, derrotas e sequência.</p>
    <p className="text-sm mb-2">Para publicar com AdMob, compras e multiplayer, adicione sua Política de Privacidade oficial com dados coletados por anúncios, loja e servidor.</p>
    <p className="text-xs bg-[#f5ede0] rounded-xl p-3">Sugestão: colocar o link da política no menu, na Play Store, na App Store e no site usado pelo app-ads.txt.</p>
  </div>;
}

function Premium({ adsRemoved, onRemoveAdsDemo }: { adsRemoved: boolean; onRemoveAdsDemo: () => void }) {
  return <div>
    <h2 className="font-serif text-2xl font-black mb-3">Premium</h2>
    <p className="text-sm mb-3">Produto sugerido para as lojas: <strong>remover_anuncios</strong>.</p>
    <div className="bg-[#f5ede0] rounded-xl p-3 text-sm mb-3">
      Benefícios: remover anúncios entre partidas, selo premium e futuras mesas/avatares exclusivos.
    </div>
    <Button disabled={adsRemoved} onClick={onRemoveAdsDemo} className="w-full bg-[#c4541a] hover:bg-[#a03a10] text-white font-bold rounded-xl">
      {adsRemoved ? "Anúncios removidos" : "Simular remover anúncios"}
    </Button>
    <p className="text-[11px] text-[#a89078] mt-2">Na publicação real, este botão deve chamar Google Play Billing/App Store In-App Purchase.</p>
  </div>;
}
