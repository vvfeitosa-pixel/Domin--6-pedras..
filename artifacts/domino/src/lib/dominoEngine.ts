export type Peca = [number, number];
export type Lado = "E" | "D";
export type TipoVitoria = "" | "Batida simples" | "Carroçada" | "Lá e Lô" | "Cruzada" | "Trancado";
export type Dificuldade = "facil" | "medio" | "dificil";

export interface EstadoJogo {
  mao: Peca[];
  board: Peca[];
  turno: string;
  turnoId: number;
  mensagem: string;
  fim: boolean;
  vencedor: string | null;
  esquerda: number | null;
  direita: number | null;
  qtdCpu: { "CPU 1": number; "CPU 2": number; "CPU 3": number };
  podePasse: boolean;
  placar: { A: number; B: number };
  jogoFinalizado: boolean;
  tipoVitoria: TipoVitoria;
  pontosMao: number;
  vencedorTime: "A" | "B" | null;
  aguardandoEscolha: boolean;
  timeEscolha: "A" | "B" | null;
  lastPlayedSide: "E" | "D" | null;
  ehBuchuda: boolean;
  dificuldade: Dificuldade;
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

interface ValidPlay {
  i: number;
  lado: Lado;
  peca: Peca;
}

export class JogoDomino {
  private jogadores: { nome: string; mao: Peca[]; tipo: "humano" | "cpu" }[];
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
  private lastPlayedSide: "E" | "D" | null;
  private sleeping: Peca[];
  private dificuldade: Dificuldade;

  constructor(dificuldade: Dificuldade = "medio") {
    this.jogadores = [];
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
    this.lastPlayedSide = null;
    this.sleeping = [];
    this.dificuldade = dificuldade;
    this.iniciarMao();
  }

  setDificuldade(d: Dificuldade): void {
    this.dificuldade = d;
  }

  private iniciarMao(): void {
    const todasPecas: Peca[] = [];
    for (let x = 0; x <= 6; x++) {
      for (let y = x; y <= 6; y++) {
        todasPecas.push([x, y]);
      }
    }
    const embaralhadas = shuffle(todasPecas);

    this.jogadores = [
      { nome: "Você", mao: [], tipo: "humano" },
      { nome: "CPU 1", mao: [], tipo: "cpu" },
      { nome: "CPU 2", mao: [], tipo: "cpu" },
      { nome: "CPU 3", mao: [], tipo: "cpu" },
    ];

    for (let i = 0; i < 4; i++) {
      this.jogadores[i].mao = embaralhadas.slice(i * 6, (i + 1) * 6);
    }
    this.sleeping = embaralhadas.slice(24);

    this.board = [];
    this.fim = false;
    this.vencedor = null;
    this.passesSequidos = 0;
    this.tipoVitoria = "";
    this.pontosMao = 0;
    this.vencedorTime = null;
    this.lastPlayedSide = null;

    this.ehPrimeiraRodada = this.ultimoVencedor === null;
    this.aguardandoEscolha = false;
    this.timeEscolha = null;

    if (this.ehPrimeiraRodada) {
      this.turnoAtual = this.determinarPrimeiroJogador();
      const d = this.maiorCarrocaNaMao(this.turnoAtual)!;
      this.mensagem = `${this.jogadores[this.turnoAtual].nome} abre com [${d}|${d}].`;
      if (this.turnoAtual !== 0) this.jogarCpusAteHumano();
    } else {
      const winTeam = this.teamOf(this.ultimoVencedor!);
      if (winTeam === "A") {
        this.aguardandoEscolha = true;
        this.timeEscolha = "A";
        this.turnoAtual = this.ultimoVencedor!;
        this.mensagem = "Seu time ganhou — escolha quem começa.";
      } else {
        this.turnoAtual = this.ultimoVencedor!;
        this.mensagem = `${this.jogadores[this.turnoAtual].nome} começa a rodada.`;
        if (this.turnoAtual !== 0) this.jogarCpusAteHumano();
      }
    }
  }

  escolherIniciador(seat: 0 | 2): void {
    if (!this.aguardandoEscolha || this.timeEscolha !== "A") return;
    this.turnoAtual = seat;
    this.aguardandoEscolha = false;
    this.timeEscolha = null;
    this.mensagem = `${this.jogadores[seat].nome} começa a rodada.`;
    if (seat !== 0) this.jogarCpusAteHumano();
  }

  novaPartida(): void {
    this.placar = { A: 0, B: 0 };
    this.jogoFinalizado = false;
    this.ultimoVencedor = null;
    this.ehPrimeiraRodada = true;
    this.aguardandoEscolha = false;
    this.timeEscolha = null;
    this.iniciarMao();
  }

  novaRodada(): void {
    if (this.jogoFinalizado) return;
    this.iniciarMao();
  }

  private determinarPrimeiroJogador(): number {
    for (let d = 6; d >= 0; d--) {
      for (let i = 0; i < 4; i++) {
        if (this.jogadores[i].mao.some(([a, b]) => a === d && b === d)) return i;
      }
    }
    let melhorJogador = 0;
    let melhorSoma = -1;
    for (let i = 0; i < 4; i++) {
      for (const [a, b] of this.jogadores[i].mao) {
        const soma = a + b;
        if (soma > melhorSoma) { melhorSoma = soma; melhorJogador = i; }
      }
    }
    return melhorJogador;
  }

  private pontas(): [number | null, number | null] {
    if (this.board.length === 0) return [null, null];
    return [this.board[0][0], this.board[this.board.length - 1][1]];
  }

  private validarJogada(peca: Peca, lado: Lado): boolean {
    if (this.board.length === 0) return true;
    const [esquerda, direita] = this.pontas();
    if (lado === "E") return peca[0] === esquerda || peca[1] === esquerda;
    if (lado === "D") return peca[0] === direita || peca[1] === direita;
    return false;
  }

  private teamOf(uid: number): "A" | "B" {
    return uid % 2 === 0 ? "A" : "B";
  }

  private maiorCarrocaNaMao(uid: number): number | null {
    for (let d = 6; d >= 0; d--) {
      if (this.jogadores[uid].mao.some(([a, b]) => a === d && b === d)) return d;
    }
    return null;
  }

  private getValidPlays(uid: number): ValidPlay[] {
    const mao = this.jogadores[uid].mao;
    const plays: ValidPlay[] = [];
    for (let i = 0; i < mao.length; i++) {
      const peca = mao[i];
      if (this.validarJogada(peca, "E")) plays.push({ i, lado: "E", peca });
      else if (this.validarJogada(peca, "D")) plays.push({ i, lado: "D", peca });
    }
    return plays;
  }

  private realizarJogadaInterna(uid: number, indexPeca: number, lado: Lado): { ok: boolean; mensagem: string } {
    const mao = this.jogadores[uid].mao;
    if (indexPeca < 0 || indexPeca >= mao.length) return { ok: false, mensagem: "Índice inválido." };

    const peca = mao[indexPeca];
    if (!this.validarJogada(peca, lado)) return { ok: false, mensagem: "Essa peça não encaixa nesse lado." };

    const [esquerdaAntes, direitaAntes] = this.pontas();

    mao.splice(indexPeca, 1);

    if (this.board.length === 0) {
      this.board.push(peca);
    } else {
      const [esquerda, direita] = [esquerdaAntes, direitaAntes];
      if (lado === "E") {
        this.board.unshift(peca[1] === esquerda ? peca : [peca[1], peca[0]]);
      } else {
        this.board.push(peca[0] === direita ? peca : [peca[1], peca[0]]);
      }
    }

    this.lastPlayedSide = lado;
    this.passesSequidos = 0;
    this.mensagem = `${this.jogadores[uid].nome} jogou [${peca[0]}|${peca[1]}].`;

    if (mao.length === 0) {
      const isDouble = peca[0] === peca[1];
      const bothEndsEqual = esquerdaAntes !== null && direitaAntes !== null && esquerdaAntes === direitaAntes;

      let tipo: TipoVitoria;
      let pontos: number;

      if (isDouble && bothEndsEqual) {
        tipo = "Cruzada"; pontos = 4;
      } else if (!isDouble && bothEndsEqual) {
        tipo = "Lá e Lô"; pontos = 3;
      } else if (isDouble) {
        tipo = "Carroçada"; pontos = 2;
      } else {
        tipo = "Batida simples"; pontos = 1;
      }

      const time = this.teamOf(uid);
      this.placar[time] += pontos;
      this.tipoVitoria = tipo;
      this.pontosMao = pontos;
      this.vencedorTime = time;

      if (this.placar.A >= SCORE_LIMIT || this.placar.B >= SCORE_LIMIT) {
        this.jogoFinalizado = true;
      }

      this.fim = true;
      this.vencedor = this.jogadores[uid].nome;
      this.ultimoVencedor = uid;
      const pontosStr = `+${pontos} ponto${pontos !== 1 ? "s" : ""}`;
      this.mensagem = `${this.vencedor} bateu! ${tipo} (${pontosStr})`;
    }

    return { ok: true, mensagem: this.mensagem };
  }

  private jogadorTemJogada(uid: number): boolean {
    return this.jogadores[uid].mao.some(p => this.validarJogada(p, "E") || this.validarJogada(p, "D"));
  }

  private passar(uid: number): void {
    this.passesSequidos++;
    this.mensagem = `${this.jogadores[uid].nome} passou.`;

    if (this.passesSequidos >= 4) {
      let somaA = 0, somaB = 0;
      for (let i = 0; i < 4; i++) {
        const soma = this.jogadores[i].mao.reduce((acc, [a, b]) => acc + a + b, 0);
        if (i === 0 || i === 2) somaA += soma; else somaB += soma;
      }
      const time: "A" | "B" = somaA <= somaB ? "A" : "B";
      this.placar[time] += 1;
      this.tipoVitoria = "Trancado";
      this.pontosMao = 1;
      this.vencedorTime = time;

      if (this.placar.A >= SCORE_LIMIT || this.placar.B >= SCORE_LIMIT) {
        this.jogoFinalizado = true;
      }

      const teamPlayers = time === "A" ? [0, 2] : [1, 3];
      const [p1, p2] = teamPlayers;
      const s1 = this.jogadores[p1].mao.reduce((s, [a, b]) => s + a + b, 0);
      const s2 = this.jogadores[p2].mao.reduce((s, [a, b]) => s + a + b, 0);
      this.ultimoVencedor = s1 <= s2 ? p1 : p2;

      this.fim = true;
      const nomeVencedor = time === "A" ? "Você/CPU 2" : "CPU 1/CPU 3";
      this.vencedor = nomeVencedor;
      this.mensagem = `Trancado! Menor pedra: ${nomeVencedor} (+1 ponto)`;
    }
  }

  private proximoTurno(): void {
    this.turnoAtual = (this.turnoAtual + 1) % 4;
  }

  // ─── CPU AI ─────────────────────────────────────────────────────────────────

  private vezCpuFacil(uid: number): void {
    const plays = this.getValidPlays(uid);
    if (plays.length === 0) { this.passar(uid); return; }
    // Random pick
    const chosen = plays[Math.floor(Math.random() * plays.length)];
    this.realizarJogadaInterna(uid, chosen.i, chosen.lado);
  }

  private vezCpuMedio(uid: number): void {
    const plays = this.getValidPlays(uid);
    if (plays.length === 0) { this.passar(uid); return; }
    const [eAtual, dAtual] = this.pontas();

    plays.sort((a, b) => {
      const scorePlay = (v: ValidPlay): number => {
        let s = v.peca[0] + v.peca[1]; // higher sum → priority
        // Penalty for creating equal ends (enables cruzada/la-e-lo for anyone)
        const newEnd = v.lado === "E"
          ? (v.peca[0] === eAtual ? v.peca[1] : v.peca[0])
          : (v.peca[1] === dAtual ? v.peca[0] : v.peca[1]);
        const otherEnd = v.lado === "E" ? dAtual : eAtual;
        if (newEnd !== null && otherEnd !== null && newEnd === otherEnd) s -= 8;
        return s;
      };
      return scorePlay(b) - scorePlay(a);
    });

    this.realizarJogadaInterna(uid, plays[0].i, plays[0].lado);
  }

  private vezCpuDificil(uid: number): void {
    const mao = this.jogadores[uid].mao;
    const plays = this.getValidPlays(uid);
    if (plays.length === 0) { this.passar(uid); return; }

    const [eAtual, dAtual] = this.pontas();

    // Count how many times each number appears on board (0..6)
    const boardCount = new Array(7).fill(0);
    for (const [a, b] of this.board) {
      boardCount[a]++;
      boardCount[b]++;
    }

    const score = (v: ValidPlay): number => {
      let s = 0;

      // Base: higher sum pieces → shed them first
      s += v.peca[0] + v.peca[1];

      // Big bonus for batida setup (1 piece left after this play)
      if (mao.length === 2) s += 25;

      // Compute new end value after play
      const newEnd = v.lado === "E"
        ? (v.peca[0] === eAtual ? v.peca[1] : v.peca[0])
        : (v.peca[1] === dAtual ? v.peca[0] : v.peca[1]);
      const otherEnd = v.lado === "E" ? dAtual : eAtual;

      // Heavy penalty for creating equal ends (enables cruzada for opponent)
      if (newEnd !== null && otherEnd !== null && newEnd === otherEnd) s -= 20;

      // Bonus for playing to an end that's heavily represented on board
      // (means adversary is less likely to have pieces that connect there)
      if (newEnd !== null) {
        const saturation = boardCount[newEnd] ?? 0;
        s += saturation * 2;
      }

      return s;
    };

    plays.sort((a, b) => score(b) - score(a));
    this.realizarJogadaInterna(uid, plays[0].i, plays[0].lado);
  }

  private vezCpu(uid: number): void {
    const mao = this.jogadores[uid].mao;

    // 1ª rodada, mesa vazia → obrigatório abrir com a maior carroça
    if (this.board.length === 0 && this.ehPrimeiraRodada) {
      const d = this.maiorCarrocaNaMao(uid);
      if (d !== null) {
        const idx = mao.findIndex(([a, b]) => a === d && b === d);
        if (idx !== -1) { this.realizarJogadaInterna(uid, idx, "D"); return; }
      }
    }

    switch (this.dificuldade) {
      case "facil":  this.vezCpuFacil(uid);  break;
      case "medio":  this.vezCpuMedio(uid);  break;
      case "dificil": this.vezCpuDificil(uid); break;
    }
  }

  private jogarCpusAteHumano(): void {
    while (!this.fim && this.turnoAtual !== 0) {
      this.vezCpu(this.turnoAtual);
      if (!this.fim) this.proximoTurno();
    }
  }

  jogar(indexPeca: number, lado: Lado): { ok: boolean; mensagem: string } {
    if (this.aguardandoEscolha) return { ok: false, mensagem: "Escolha quem começa a rodada." };
    if (this.fim) return { ok: false, mensagem: "A partida terminou." };
    if (this.turnoAtual !== 0) return { ok: false, mensagem: "Ainda não é sua vez." };

    if (this.board.length === 0 && this.ehPrimeiraRodada) {
      const peca = this.jogadores[0].mao[indexPeca];
      const d = this.maiorCarrocaNaMao(0);
      if (!peca || peca[0] !== peca[1] || peca[0] !== d) {
        return { ok: false, mensagem: `Você deve abrir com a carroça [${d}|${d}]!` };
      }
    }

    const resultado = this.realizarJogadaInterna(0, indexPeca, lado);
    if (resultado.ok && !this.fim) this.proximoTurno();
    return resultado;
  }

  passarHumano(): void {
    if (this.aguardandoEscolha || this.fim || this.turnoAtual !== 0) return;
    this.passar(0);
    if (!this.fim) this.proximoTurno();
  }

  jogarUmCpu(): { jogou: boolean; fim: boolean; proximoTurnoId: number } {
    if (this.aguardandoEscolha || this.fim || this.turnoAtual === 0) return { jogou: false, fim: this.fim, proximoTurnoId: this.turnoAtual };
    this.vezCpu(this.turnoAtual);
    if (!this.fim) this.proximoTurno();
    return { jogou: true, fim: this.fim, proximoTurnoId: this.turnoAtual };
  }

  pecaValidaParaEsquerda(peca: Peca): boolean {
    if (this.board.length === 0 && this.ehPrimeiraRodada) {
      const d = this.maiorCarrocaNaMao(0);
      return peca[0] === peca[1] && peca[0] === d;
    }
    return this.validarJogada(peca, "E");
  }
  pecaValidaParaDireita(peca: Peca): boolean {
    if (this.board.length === 0 && this.ehPrimeiraRodada) {
      const d = this.maiorCarrocaNaMao(0);
      return peca[0] === peca[1] && peca[0] === d;
    }
    return this.validarJogada(peca, "D");
  }
  podePasarHumano(): boolean { return !this.jogadorTemJogada(0); }

  estado(): EstadoJogo {
    const [esquerda, direita] = this.pontas();
    const ehBuchuda = this.jogoFinalizado && (this.placar.A === 0 || this.placar.B === 0);
    return {
      mao: [...this.jogadores[0].mao],
      board: [...this.board],
      turno: this.jogadores[this.turnoAtual].nome,
      turnoId: this.turnoAtual,
      mensagem: this.mensagem,
      fim: this.fim,
      vencedor: this.vencedor,
      esquerda,
      direita,
      qtdCpu: {
        "CPU 1": this.jogadores[1].mao.length,
        "CPU 2": this.jogadores[2].mao.length,
        "CPU 3": this.jogadores[3].mao.length,
      },
      podePasse: this.podePasarHumano(),
      placar: { ...this.placar },
      jogoFinalizado: this.jogoFinalizado,
      tipoVitoria: this.tipoVitoria,
      pontosMao: this.pontosMao,
      vencedorTime: this.vencedorTime,
      aguardandoEscolha: this.aguardandoEscolha,
      timeEscolha: this.timeEscolha,
      lastPlayedSide: this.lastPlayedSide,
      ehBuchuda,
      dificuldade: this.dificuldade,
      sleeping: [...this.sleeping],
    };
  }
}
