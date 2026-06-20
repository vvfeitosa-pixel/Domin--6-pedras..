export type Peca = [number, number];
export type TipoVitoria = "" | "Batida simples" | "Carroçada" | "Lá e Lô" | "Cruzada" | "Trancado";

export interface RoomPlayer {
  socketId: string;
  name: string;
  seatIndex: number;
  playerId: string;
  disconnected: boolean;
}

export interface RoomPublicState {
  code: string;
  hostSocketId: string;
  maxHumans: number;
  players: RoomPlayer[];
  status: "waiting" | "playing" | "finished";
}

export interface ChatMessage {
  id: number;
  seatIndex: number;
  name: string;
  text: string;
}

export interface PlayerGameState {
  myHand: Peca[];
  mySeat: number;
  board: Peca[];
  turnoId: number;
  turnoNome: string;
  mensagem: string;
  fim: boolean;
  vencedor: string | null;
  esquerda: number | null;
  direita: number | null;
  handSizes: number[];
  seatNames: string[];
  isHumanSeat: boolean[];
  podePasse: boolean;
  placar: { A: number; B: number };
  jogoFinalizado: boolean;
  tipoVitoria: TipoVitoria;
  pontosMao: number;
  vencedorTime: "A" | "B" | null;
  ehPrimeiraRodada: boolean;
  aguardandoEscolha: boolean;
  timeEscolha: "A" | "B" | null;
  forcedStarter: number | null;
  lastPlayedSide: "E" | "D" | null;
  ehBuchuda: boolean;
  sleeping: Peca[];
}
