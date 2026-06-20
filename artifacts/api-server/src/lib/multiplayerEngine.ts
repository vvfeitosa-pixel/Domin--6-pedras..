export type Peca = [number, number];
export type Lado = "E" | "D";
export type TipoVitoria = "" | "Batida simples" | "Carroçada" | "Lá e Lô" | "Cruzada" | "Trancado";

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SCORE_LIMIT = 6;

interface ValidPlay { i: number; lado: Lado; peca: Peca; }

export class MultiplayerJogoDomino {
  private jogadores: { nome: string; mao: Peca[] }[];
  private humanSeats: Set<number>;
  private board: Peca[];
  private turnoAtual: number;
  private mensagem: string;
  private fim: boolean;
  private vencedor: string | null;
  private passesSequidos: number;
  private placar: { A: number; B: number };
  private jogoFinalizado: boolean;
  private tipoVitoria: TipoVitoria;
  private pontosMao: number;
  private vencedorTime: "A" | "B" | null;
  private ultimoVencedor: number | null;
  private ehPrimeiraRodada: boolean;
  private aguardandoEscolha: boolean;
  private timeEscolha: "A" | "B" | null;
  private forcedStarter: number | null;
  private lastPlayedSide: "E" | "D" | null;
  private sleeping: Peca[];

  constructor(seatNames: string[], humanSeats: number[]) {
    this.humanSeats = new Set(humanSeats);
    this.jogadores = seatNames.map(nome => ({ nome, mao: [] }));
    this.board = [];
    this.turnoAtual = 0;
    this.mensagem = "";
    this.fim = false;
    this.vencedor = null;
    this.passesSequidos = 0;
    this.placar = { A: 0, B: 0 };
    this.jogoFinalizado = false;
    this.tipoVitoria = "";
    this.pontosMao = 0;
    this.vencedorTime = null;
    this.ultimoVencedor = null;
    this.ehPrimeiraRodada = true;
    this.aguardandoEscolha = false;
    this.timeEscolha = null;
    this.forcedStarter = null;
    this.lastPlayedSide = null;
    this.sleeping = [];
    this.distribuirPecas();
  }

  private distribuirPecas(): void {
    const todasPecas: Peca[] = [];
    for (let x = 0; x <= 6; x++)
      for (let y = x; y <= 6; y++)
        todasPecas.push([x, y]);
    const emb = shuffle(todasPecas);
    for (let i = 0; i < 4; i++)
      this.jogadores[i].mao = emb.slice(i * 6, (i + 1) * 6);
    this.sleeping = emb.slice(24);

    this.board = [];
    this.fim = false;
    this.vencedor = null;
    this.passesSequidos = 0;
    this.tipoVitoria = "";
    this.pontosMao = 0;
    this.vencedorTime = null;
    this.lastPlayedSide = null;
    this.aguardandoEscolha = false;
    this.timeEscolha = null;
    this.forcedStarter = null;

    this.ehPrimeiraRodada = this.ultimoVencedor === null;

    const hasAnyHuman = this.humanSeats.size > 0;

    if (this.ehPrimeiraRodada) {
      const mandatoryStarter = this.determinarPrimeiro();
      this.turnoAtual = mandatoryStarter;
      const d = this.maiorCarroca(mandatoryStarter);
      const dLabel = d !== null ? `[${d}|${d}]` : "a maior pedra";
      this.mensagem = `${this.jogadores[mandatoryStarter].nome} abre com ${dLabel}.`;
      // 1ª rodada: sem diálogo — quem tem a maior carroça sai direto
    } else {
      const winTeam = this.teamOf(this.ultimoVencedor!);
      const teamSeats = winTeam === "A" ? [0, 2] : [1, 3];
      const hasHumanInTeam = teamSeats.some(s => this.humanSeats.has(s));

      if (hasHumanInTeam) {
        this.aguardandoEscolha = true;
        this.timeEscolha = winTeam;
        this.forcedStarter = null;
        this.turnoAtual = this.ultimoVencedor!;
        this.mensagem = `${winTeam === "A" ? "Time A" : "Time B"} escolhe quem começa a rodada.`;
      } else {
        this.turnoAtual = this.ultimoVencedor!;
        this.mensagem = `${this.jogadores[this.turnoAtual].nome} começa a rodada.`;
      }
    }
  }

  iniciarRodada(): void {
    this.distribuirPecas();
  }

  escolherIniciador(seat: number): boolean {
    if (!this.aguardandoEscolha) return false;
    if (this.teamOf(seat) !== this.timeEscolha) return false;
    if (this.forcedStarter !== null && seat !== this.forcedStarter) return false;

    this.turnoAtual = seat;
    this.aguardandoEscolha = false;
    this.timeEscolha = null;
    this.forcedStarter = null;
    this.mensagem = `${this.jogadores[seat].nome} começa a rodada.`;
    return true;
  }

  novaPartida(): void {
    this.placar = { A: 0, B: 0 };
    this.jogoFinalizado = false;
    this.ultimoVencedor = null;
    this.ehPrimeiraRodada = true;
    this.aguardandoEscolha = false;
    this.timeEscolha = null;
    this.forcedStarter = null;
    this.distribuirPecas();
  }

  private determinarPrimeiro(): number {
    for (let d = 6; d >= 0; d--)
      for (let i = 0; i < 4; i++)
        if (this.jogadores[i].mao.some(([a, b]) => a === d && b === d)) return i;
    let best = 0, bestSum = -1;
    for (let i = 0; i < 4; i++)
      for (const [a, b] of this.jogadores[i].mao)
        if (a + b > bestSum) { bestSum = a + b; best = i; }
    return best;
  }

  private pontas(): [number | null, number | null] {
    if (this.board.length === 0) return [null, null];
    return [this.board[0][0], this.board[this.board.length - 1][1]];
  }

  private validar(peca: Peca, lado: Lado): boolean {
    if (this.board.length === 0) return true;
    const [e, d] = this.pontas();
    return lado === "E" ? (peca[0] === e || peca[1] === e) : (peca[0] === d || peca[1] === d);
  }

  private teamOf(uid: number): "A" | "B" { return uid % 2 === 0 ? "A" : "B"; }

  private maiorCarroca(uid: number): number | null {
    for (let d = 6; d >= 0; d--)
      if (this.jogadores[uid].mao.some(([a, b]) => a === d && b === d)) return d;
    return null;
  }

  private temJogada(uid: number): boolean {
    return this.jogadores[uid].mao.some(p => this.validar(p, "E") || this.validar(p, "D"));
  }

  private getValidPlays(uid: number): ValidPlay[] {
    const mao = this.jogadores[uid].mao;
    const plays: ValidPlay[] = [];
    for (let i = 0; i < mao.length; i++) {
      const peca = mao[i];
      if (this.validar(peca, "E")) plays.push({ i, lado: "E", peca });
      else if (this.validar(peca, "D")) plays.push({ i, lado: "D", peca });
    }
    return plays;
  }

  private realizarJogada(uid: number, idx: number, lado: Lado): { ok: boolean; mensagem: string } {
    const mao = this.jogadores[uid].mao;
    if (idx < 0 || idx >= mao.length) return { ok: false, mensagem: "Índice inválido." };
    const peca = mao[idx];
    if (!this.validar(peca, lado)) return { ok: false, mensagem: "Essa peça não encaixa nesse lado." };

    const [eAntes, dAntes] = this.pontas();
    mao.splice(idx, 1);

    if (this.board.length === 0) {
      this.board.push(peca);
    } else {
      if (lado === "E")
        this.board.unshift(peca[1] === eAntes ? peca : [peca[1], peca[0]]);
      else
        this.board.push(peca[0] === dAntes ? peca : [peca[1], peca[0]]);
    }

    this.lastPlayedSide = lado;
    this.passesSequidos = 0;
    this.mensagem = `${this.jogadores[uid].nome} jogou [${peca[0]}|${peca[1]}].`;

    if (mao.length === 0) {
      const isDouble = peca[0] === peca[1];
      const bothEqual = eAntes !== null && dAntes !== null && eAntes === dAntes;
      let tipo: TipoVitoria, pontos: number;
      if (isDouble && bothEqual)        { tipo = "Cruzada";        pontos = 4; }
      else if (!isDouble && bothEqual)  { tipo = "Lá e Lô";        pontos = 3; }
      else if (isDouble)                { tipo = "Carroçada";      pontos = 2; }
      else                              { tipo = "Batida simples"; pontos = 1; }

      const time = this.teamOf(uid);
      this.placar[time] += pontos;
      this.tipoVitoria = tipo;
      this.pontosMao = pontos;
      this.vencedorTime = time;
      if (this.placar.A >= SCORE_LIMIT || this.placar.B >= SCORE_LIMIT)
        this.jogoFinalizado = true;
      this.fim = true;
      this.vencedor = this.jogadores[uid].nome;
      this.ultimoVencedor = uid;
      this.mensagem = `${this.vencedor} bateu! ${tipo} (+${pontos} ponto${pontos !== 1 ? "s" : ""})`;
    }
    return { ok: true, mensagem: this.mensagem };
  }

  private passarInterno(uid: number): void {
    this.passesSequidos++;
    this.mensagem = `${this.jogadores[uid].nome} passou.`;
    if (this.passesSequidos >= 4) {
      let somaA = 0, somaB = 0;
      for (let i = 0; i < 4; i++) {
        const s = this.jogadores[i].mao.reduce((acc, [a, b]) => acc + a + b, 0);
        if (i % 2 === 0) somaA += s; else somaB += s;
      }
      const time: "A" | "B" = somaA <= somaB ? "A" : "B";
      this.placar[time] += 1;
      this.tipoVitoria = "Trancado";
      this.pontosMao = 1;
      this.vencedorTime = time;
      if (this.placar.A >= SCORE_LIMIT || this.placar.B >= SCORE_LIMIT)
        this.jogoFinalizado = true;
      const [p1, p2] = time === "A" ? [0, 2] : [1, 3];
      const s1 = this.jogadores[p1].mao.reduce((s, [a, b]) => s + a + b, 0);
      const s2 = this.jogadores[p2].mao.reduce((s, [a, b]) => s + a + b, 0);
      this.ultimoVencedor = s1 <= s2 ? p1 : p2;
      this.fim = true;
      const nome = time === "A" ? "Time A" : "Time B";
      this.vencedor = nome;
      this.mensagem = `Trancado! Menor pedra: ${nome} (+1 ponto)`;
    }
  }

  jogar(seatIndex: number, pieceIndex: number, lado: Lado): { ok: boolean; mensagem: string } {
    if (this.aguardandoEscolha) return { ok: false, mensagem: "Aguardando escolha de quem começa." };
    if (this.fim) return { ok: false, mensagem: "A partida terminou." };
    if (this.turnoAtual !== seatIndex) return { ok: false, mensagem: "Não é sua vez." };
    if (!this.humanSeats.has(seatIndex)) return { ok: false, mensagem: "Assento de CPU." };

    if (this.board.length === 0 && this.ehPrimeiraRodada) {
      const peca = this.jogadores[seatIndex].mao[pieceIndex];
      const d = this.maiorCarroca(seatIndex);
      if (d !== null && (!peca || peca[0] !== peca[1] || peca[0] !== d))
        return { ok: false, mensagem: `Você deve abrir com a carroça [${d}|${d}]!` };
    }

    const res = this.realizarJogada(seatIndex, pieceIndex, lado);
    if (res.ok && !this.fim) this.turnoAtual = (this.turnoAtual + 1) % 4;
    return res;
  }

  passar(seatIndex: number): { ok: boolean } {
    if (this.aguardandoEscolha || this.fim || this.turnoAtual !== seatIndex) return { ok: false };
    if (!this.humanSeats.has(seatIndex) && this.temJogada(seatIndex)) return { ok: false };
    this.passarInterno(seatIndex);
    if (!this.fim) this.turnoAtual = (this.turnoAtual + 1) % 4;
    return { ok: true };
  }

  jogarCpuStep(): { jogou: boolean; fim: boolean; proximoTurno: number } {
    if (this.aguardandoEscolha || this.fim || this.humanSeats.has(this.turnoAtual))
      return { jogou: false, fim: this.fim, proximoTurno: this.turnoAtual };

    const uid = this.turnoAtual;
    const mao = this.jogadores[uid].mao;

    if (this.board.length === 0 && this.ehPrimeiraRodada) {
      const d = this.maiorCarroca(uid);
      if (d !== null) {
        const idx = mao.findIndex(([a, b]) => a === d && b === d);
        if (idx !== -1) { this.realizarJogada(uid, idx, "D"); }
      }
    } else {
      const plays = this.getValidPlays(uid);
      if (plays.length === 0) {
        this.passarInterno(uid);
      } else {
        const [eAtual, dAtual] = this.pontas();
        plays.sort((a, b) => {
          const scorePlay = (v: ValidPlay): number => {
            let s = v.peca[0] + v.peca[1];
            const newEnd = v.lado === "E"
              ? (v.peca[0] === eAtual ? v.peca[1] : v.peca[0])
              : (v.peca[1] === dAtual ? v.peca[0] : v.peca[1]);
            const otherEnd = v.lado === "E" ? dAtual : eAtual;
            if (newEnd !== null && otherEnd !== null && newEnd === otherEnd) s -= 8;
            if (mao.length === 2) s += 15;
            return s;
          };
          return scorePlay(b) - scorePlay(a);
        });
        this.realizarJogada(uid, plays[0].i, plays[0].lado);
      }
    }

    if (!this.fim) this.turnoAtual = (this.turnoAtual + 1) % 4;
    return { jogou: true, fim: this.fim, proximoTurno: this.turnoAtual };
  }

  isHumanTurn(): boolean { return !this.fim && !this.aguardandoEscolha && this.humanSeats.has(this.turnoAtual); }
  isAguardandoEscolha(): boolean { return this.aguardandoEscolha; }
  currentTurn(): number { return this.turnoAtual; }
  isFim(): boolean { return this.fim; }
  isJogoFinalizado(): boolean { return this.jogoFinalizado; }

  pecaValidaE(seatIndex: number, peca: Peca): boolean {
    if (this.board.length === 0 && this.ehPrimeiraRodada) {
      const d = this.maiorCarroca(seatIndex);
      return peca[0] === peca[1] && peca[0] === d;
    }
    return this.validar(peca, "E");
  }
  pecaValidaD(seatIndex: number, peca: Peca): boolean {
    if (this.board.length === 0 && this.ehPrimeiraRodada) {
      const d = this.maiorCarroca(seatIndex);
      return peca[0] === peca[1] && peca[0] === d;
    }
    return this.validar(peca, "D");
  }
  podePasser(seatIndex: number): boolean { return !this.temJogada(seatIndex); }

  getStateForSeat(seatIndex: number): PlayerGameState {
    const [e, d] = this.pontas();
    const ehBuchuda = this.jogoFinalizado && (this.placar.A === 0 || this.placar.B === 0);
    return {
      myHand: [...this.jogadores[seatIndex].mao],
      mySeat: seatIndex,
      board: [...this.board],
      turnoId: this.turnoAtual,
      turnoNome: this.jogadores[this.turnoAtual].nome,
      mensagem: this.mensagem,
      fim: this.fim,
      vencedor: this.vencedor,
      esquerda: e,
      direita: d,
      handSizes: this.jogadores.map(j => j.mao.length),
      seatNames: this.jogadores.map(j => j.nome),
      isHumanSeat: this.jogadores.map((_, i) => this.humanSeats.has(i)),
      podePasse: this.podePasser(seatIndex),
      placar: { ...this.placar },
      jogoFinalizado: this.jogoFinalizado,
      tipoVitoria: this.tipoVitoria,
      pontosMao: this.pontosMao,
      vencedorTime: this.vencedorTime,
      ehPrimeiraRodada: this.ehPrimeiraRodada,
      aguardandoEscolha: this.aguardandoEscolha,
      timeEscolha: this.timeEscolha,
      forcedStarter: this.forcedStarter,
      lastPlayedSide: this.lastPlayedSide,
      ehBuchuda,
      sleeping: [...this.sleeping],
    };
  }
}
