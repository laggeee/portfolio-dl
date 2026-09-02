/* ==========================================================================
   COMBATE — a máquina de estados do encontro
   Códice da Arena, Capítulos I a VIII.

   Nada aqui toca o DOM. O mesmo arquivo roda no Node (simulador) e no
   navegador (arena) — é o que garante que o simulador esteja balanceando
   o jogo de verdade, e não uma cópia parecida das regras.
   ========================================================================== */

import { criarRng, rolarD20, rolarNotacao, rolar, mediaDoDado } from './dados.js';
import { CLASSES, NIVEIS } from './classes.js';
import { INIMIGOS } from './inimigos.js';
import { BAL } from './balanceamento.js';

/* --------------------------------------------------------------------------
   Condições — Capítulo V
   -------------------------------------------------------------------------- */

export const CONDICOES = {
  queimadura:  { nome: 'Queimadura',  tipo: 'ruim' },
  sangramento: { nome: 'Sangramento', tipo: 'ruim' },
  vulneravel:  { nome: 'Vulnerável',  tipo: 'ruim' },
  marcado:     { nome: 'Marcado',     tipo: 'ruim' },
  atordoado:   { nome: 'Atordoado',   tipo: 'ruim' },
  enraizado:   { nome: 'Enraizado',   tipo: 'ruim' },
  defendendo:  { nome: 'Defendendo',  tipo: 'bom' },
  abencoado:   { nome: 'Abençoado',   tipo: 'bom' },
  preparando:  { nome: 'Preparando',  tipo: 'aviso' },
  regeneracao: { nome: 'Renovação',   tipo: 'bom' },
  formaFera:   { nome: 'Forma de Fera', tipo: 'bom' },
  espinhos:    { nome: 'Espinhos',    tipo: 'bom' },
};

export const modificador = (valor) => Math.floor((valor - 10) / 2);

/* Ações que toda classe tem, sem custo. Defender é o que sustenta o
   ritmo do Foco: é o turno "pequeno" que paga o golpe grande. */
export const ACOES_COMUNS = [
  { id: 'defender', nome: 'Defender', custo: 0, tipo: 'acao', alvo: 'proprio',
    efeitos: [{ cond: 'defendendo', turnos: 1, em: 'proprio' }], geraFoco: 1 },
  { id: 'pocao', nome: 'Poção', custo: 0, tipo: 'bonus', alvo: 'proprio',
    cura: '4d4+2', usaChaveNaCura: false, consumivel: true },
  { id: 'encerrar', nome: 'Encerrar turno', custo: 0, tipo: 'fim', alvo: 'proprio' },
];

/* --------------------------------------------------------------------------
   Construção de combatentes
   -------------------------------------------------------------------------- */

export function criarHeroi(classeId, nivel = 1) {
  const c = CLASSES[classeId];
  if (!c) throw new Error('Classe desconhecida: ' + classeId);

  const atributos = { ...c.atributos };
  const modCon = modificador(atributos.CON);
  const faixa = NIVEIS.find((n) => n.nivel === nivel) ?? NIVEIS[0];

  // PV: dado cheio no nível 1, média + CON nos seguintes (Capítulo II),
  // tudo multiplicado pelo fator solo.
  let base = c.dadoVida + modCon;
  for (let n = 2; n <= nivel; n++) base += mediaDoDado(c.dadoVida) + modCon;
  const pvMax = base * BAL.fatorPv;

  return {
    id: 'heroi', lado: 'heroi',
    classeId, nome: c.nome, chave: c.chave,
    nivel, proficiencia: faixa.proficiencia,
    atributos,
    pvMax, pv: pvMax,
    defesaBase: 10 + modificador(atributos.DES) + c.armadura,
    focoMax: nivel >= 7 ? 6 : 5,
    foco: 2,
    limiarCritico: nivel >= 9 ? 19 : 20,
    habilidades: c.habilidades.filter((h) => h.nivel <= nivel),
    pocoes: BAL.pocoes,
    condicoes: {},
    recargas: {}, usos: {}, marcas: {},
    vivo: true,
  };
}

export function criarInimigo(tipoId, indice = 0) {
  const t = INIMIGOS[tipoId];
  if (!t) throw new Error('Inimigo desconhecido: ' + tipoId);

  const recargas = {};
  const usos = {};
  for (const [id, a] of Object.entries(t.acoes)) {
    if (a.recarga) recargas[id] = 0;      // disponível já no primeiro turno
    if (a.usos) usos[id] = a.usos;
  }

  return {
    id: `${tipoId}-${indice}`, lado: 'inimigo', tipoId,
    nome: t.nome, papel: t.papel,
    // Chefes têm escala própria: a global existe para encurtar encontros
    // de vários inimigos, e aplicá-la a eles os tornava mais frágeis que
    // o grupo que substituem.
    pvMax: Math.round(t.pv * (t.chefe ? 1 : BAL.fatorPvInimigo)),
    pv: Math.round(t.pv * (t.chefe ? 1 : BAL.fatorPvInimigo)),
    defesaBase: t.defesa,
    iniciativaMod: t.iniciativa,
    bonusAtaque: t.bonusAtaque,
    xp: t.xp, chefe: !!t.chefe,
    acoes: t.acoes, decidir: t.decidir,
    condicoes: {}, recargas, usos, marcas: {},
    vivo: true,
  };
}

/* --------------------------------------------------------------------------
   Leitura de estado
   -------------------------------------------------------------------------- */

const modChave = (c) => c.lado === 'heroi' ? modificador(c.atributos[c.chave]) : 0;

export function defesaDe(c) {
  let d = c.defesaBase;
  if (c.condicoes.defendendo) d += 3;
  if (c.condicoes.formaFera) d += 2;
  return d;
}

function bonusAtaqueDe(c, estado) {
  if (c.lado === 'heroi') return modChave(c) + c.proficiencia + BAL.bonusAtaqueHeroi;
  let b = c.bonusAtaque;
  if (estado?.canticoAtivo) b += 2;   // Cântico do Arauto
  return b;
}

/* --------------------------------------------------------------------------
   Condições
   -------------------------------------------------------------------------- */

/*
 * `nova` só é marcada quando a condição vai para OUTRO combatente.
 *
 * Um Atordoado aplicado no inimigo precisa sobreviver ao tick do turno
 * seguinte dele, senão ele nunca perde a ação. Já um Defendendo que você
 * lança em si mesmo tem o próximo tick só na sua próxima rodada — marcar
 * como nova o faria durar uma rodada a mais do que o Códice manda.
 */
function aplicarCondicao(alvo, ef, origem) {
  const atual = alvo.condicoes[ef.cond];
  const nova = origem !== alvo;

  if (ef.cond === 'queimadura' || ef.cond === 'sangramento') {
    alvo.condicoes[ef.cond] = {
      valor: Math.max(atual?.valor ?? 0, ef.valor ?? 0),
      turnos: ef.turnos ?? Infinity,
      nova,
    };
    return;
  }
  alvo.condicoes[ef.cond] = {
    turnos: Math.max(atual?.turnos ?? 0, ef.turnos ?? 1),
    nova,
    ...(ef.extra ?? {}),
  };
}

/* --------------------------------------------------------------------------
   Dano — Capítulo IV, na ordem exata
   -------------------------------------------------------------------------- */

export function aplicarDano(alvo, bruto) {
  let d = bruto;
  if (alvo.condicoes.vulneravel) d = Math.floor(d * 1.5);
  if (alvo.condicoes.defendendo) d -= 2;
  d = Math.max(1, d);

  alvo.pv = Math.max(0, alvo.pv - d);
  if (alvo.pv === 0) alvo.vivo = false;
  return d;
}

export function curar(alvo, quanto) {
  const antes = alvo.pv;
  alvo.pv = Math.min(alvo.pvMax, alvo.pv + quanto);
  return alvo.pv - antes;
}

/* ==========================================================================
   O combate
   ========================================================================== */

export class Combate {
  constructor({ heroi, inimigos, semente = 1, aoEvento = null }) {
    this.heroi = heroi;
    this.inimigos = inimigos;
    this.rng = criarRng(semente);
    this.semente = semente;
    this.aoEvento = aoEvento;
    this.log = [];

    this.rodada = 1;
    this.canticoAtivo = 0;      // turnos restantes
    this.ordem = [];
    this.indice = 0;
    this.terminado = null;      // 'vitoria' | 'derrota'

    /* O turno do herói tem fases explícitas, nesta ordem:
       Ação -> Ação extra -> Ação bônus. Sem separá-las, a Sombra Dupla
       gastava a Ação para devolver uma Ação: saldo zero. */
    this.fase = 'acao';         // 'acao' | 'extra' | 'bonus' | 'fim'
    this.acoesExtras = 0;
    this.bonusUsado = false;
  }

  evento(tipo, dados) {
    const e = { tipo, rodada: this.rodada, ...dados };
    this.log.push(e);
    this.aoEvento?.(e);
    return e;
  }

  get combatentes() { return [this.heroi, ...this.inimigos]; }
  get inimigosVivos() { return this.inimigos.filter((i) => i.vivo); }
  get atual() { return this.ordem[this.indice]; }

  estado() {
    return {
      heroi: this.heroi,
      inimigos: this.inimigos,
      rodada: this.rodada,
      canticoAtivo: this.canticoAtivo > 0,
    };
  }

  /* ---- Início ---------------------------------------------------------- */

  iniciar() {
    for (const c of this.combatentes) {
      const mod = c.lado === 'heroi' ? modificador(c.atributos.DES) : c.iniciativaMod;
      c.iniciativa = rolarD20(this.rng).valor + mod;
      c.desempate = mod;
    }
    this.ordem = [...this.combatentes].sort((a, b) =>
      b.iniciativa - a.iniciativa || b.desempate - a.desempate ||
      (a.lado === 'heroi' ? -1 : 1));

    this.indice = 0;
    this.evento('inicio', { ordem: this.ordem.map((c) => c.nome) });
    this.abrirTurno();
    return this;
  }

  /* ---- Ciclo do turno --------------------------------------------------- */

  /** Início do turno: queimadura, tick de durações, checagem de Atordoado. */
  abrirTurno() {
    const c = this.atual;
    if (!c || !c.vivo) return this.passar();

    // 1. Queimadura antes de tudo — pode derrubar o combatente
    const q = c.condicoes.queimadura;
    if (q) {
      const d = aplicarDano(c, q.valor);
      this.evento('queimadura', { alvo: c.nome, dano: d, pv: c.pv });
      q.valor -= 1;
      if (q.valor <= 0) delete c.condicoes.queimadura;
    }

    // 2. Regeneração do Druida
    const r = c.condicoes.regeneracao;
    if (r && c.vivo) {
      const cura = rolarNotacao(this.rng, '1d8').total + modChave(c);
      const feito = curar(c, cura);
      this.evento('cura', { alvo: c.nome, valor: feito, origem: 'Renovar', pv: c.pv });
    }

    if (!c.vivo) { this.checarFim(); return this.passar(); }

    // 3. Tick das durações. Quem acabou de receber pula este tick.
    for (const [id, cond] of Object.entries(c.condicoes)) {
      if (cond.nova) { cond.nova = false; continue; }
      if (cond.turnos === Infinity) continue;
      cond.turnos -= 1;
      if (cond.turnos <= 0) delete c.condicoes[id];
    }

    // 4. Recargas contam no turno de quem as tem
    for (const k of Object.keys(c.recargas)) {
      if (c.recargas[k] > 0) c.recargas[k] -= 1;
    }

    // 5. Foco: piso de cortesia para não travar o herói em zero
    if (c.lado === 'heroi' && c.foco === 0) {
      c.foco = 1;
      this.evento('foco', { valor: c.foco, motivo: 'piso' });
    }

    if (c.lado === 'heroi') {
      this.fase = 'acao';
      this.acoesExtras = 0;
      this.bonusUsado = false;
    }

    if (c.condicoes.atordoado) {
      this.evento('atordoado', { alvo: c.nome });
      // Perde a Ação. Preparando é cancelado — Capítulo V.
      if (c.condicoes.preparando) {
        delete c.condicoes.preparando;
        c.preparado = null;
        this.evento('interrompido', { alvo: c.nome });
      }
      return this.passar();
    }

    if (c.lado === 'inimigo') this.turnoDoInimigo(c);
  }

  passar() {
    if (this.terminado) return;
    this.indice += 1;
    if (this.indice >= this.ordem.length) {
      this.indice = 0;
      this.rodada += 1;
      if (this.canticoAtivo > 0) this.canticoAtivo -= 1;
    }
    this.abrirTurno();
  }

  /** Avança até ser a vez do herói (ou o combate acabar). */
  avancarAteHeroi(limite = 200) {
    let voltas = 0;
    while (!this.terminado && this.atual !== this.heroi && voltas++ < limite) {
      this.passar();
    }
    return this.terminado;
  }

  /* ---- Turno do herói --------------------------------------------------- */

  acoesDisponiveis() {
    const h = this.heroi;
    const lista = [...h.habilidades, ...ACOES_COMUNS];
    return lista.map((a) => ({
      ...a,
      disponivel: this.podeUsar(a).ok,
      motivo: this.podeUsar(a).motivo,
    }));
  }

  podeUsar(acao) {
    const h = this.heroi;

    if (acao.tipo === 'fim') return { ok: true };
    if (acao.tipo === 'bonus' && this.fase !== 'bonus') {
      return { ok: false, motivo: 'Só na fase de ação bônus' };
    }
    if (acao.tipo === 'acao' && this.fase !== 'acao' && this.fase !== 'extra') {
      return { ok: false, motivo: 'A Ação deste turno já foi usada' };
    }
    if (acao.tipo === 'bonus' && this.bonusUsado) {
      return { ok: false, motivo: 'Ação bônus já usada' };
    }
    if ((acao.custo ?? 0) > h.foco) return { ok: false, motivo: 'Foco insuficiente' };
    if (acao.consumivel && h.pocoes <= 0) return { ok: false, motivo: 'Sem poções' };
    if (acao.tipo === 'bonus' && h.condicoes.enraizado) return { ok: false, motivo: 'Enraizado' };
    if (acao.especial === 'exige-marcado' &&
        !this.inimigosVivos.some((i) => i.condicoes.marcado)) {
      return { ok: false, motivo: 'Exige alvo Marcado' };
    }
    return { ok: true };
  }

  /** Executa uma ação do herói. Devolve o resultado para o HUD animar. */
  agir(idAcao, alvoId = null) {
    const h = this.heroi;
    const acao = [...h.habilidades, ...ACOES_COMUNS].find((a) => a.id === idAcao);
    if (!acao) throw new Error('Ação desconhecida: ' + idAcao);

    const pode = this.podeUsar(acao);
    if (!pode.ok) return { erro: pode.motivo };

    if (acao.tipo === 'fim') { this.fase = 'fim'; return { tipo: 'fim' }; }

    const alvo = alvoId
      ? this.inimigos.find((i) => i.id === alvoId)
      : this.inimigosVivos[0];

    h.foco -= acao.custo ?? 0;
    if (acao.consumivel) h.pocoes -= 1;

    const res = this.resolver(h, acao, alvo);

    if (acao.geraFoco) {
      h.foco = Math.min(h.focoMax, h.foco + acao.geraFoco);
      this.evento('foco', { valor: h.foco, motivo: acao.nome });
    }

    if (acao.tipo === 'bonus') this.bonusUsado = true;
    this.avancarFase(acao);
    this.checarFim();
    return res;
  }

  /* Ação -> Ação extra -> Ação bônus, nesta ordem. */
  avancarFase(acao) {
    if (acao.tipo === 'bonus') { this.fase = 'fim'; return; }
    if (acao.tipo !== 'acao') return;

    if (this.acoesExtras > 0) {
      this.acoesExtras -= 1;
      this.fase = 'extra';
      this.evento('fase', { fase: 'extra', restantes: this.acoesExtras });
      return;
    }
    this.fase = this.bonusUsado ? 'fim' : 'bonus';
    this.evento('fase', { fase: this.fase });
  }

  /** Fecha o turno do herói. */
  encerrarTurno() {
    this.fase = 'fim';
    this.passar();
  }

  /** O turno acabou sozinho? (nada mais a fazer nesta fase) */
  get turnoTerminou() {
    if (this.fase === 'fim') return true;
    if (this.fase !== 'bonus') return false;
    // sem ação bônus possível, não faz sentido prender o jogador na fase
    return !this.acoesDisponiveis().some((a) => a.tipo === 'bonus' && a.disponivel);
  }

  /* ---- Turno do inimigo ------------------------------------------------- */

  turnoDoInimigo(inim) {
    const idAcao = inim.decidir(inim, this.estado());
    const acao = inim.acoes[idAcao];

    if (acao) {
      if (acao.recarga) inim.recargas[idAcao] = acao.recarga;
      if (acao.usos) inim.usos[idAcao] = (inim.usos[idAcao] ?? 0) - 1;
      this.resolver(inim, { ...acao, id: idAcao }, this.heroi);
    }

    this.checarFim();
    if (!this.terminado) this.passar();
  }

  /* ---- Resolução de uma ação -------------------------------------------- */

  resolver(quem, acao, alvoPrincipal) {
    const alvos = acao.alvo === 'todos-inimigos'
      ? this.inimigosVivos
      : acao.alvo === 'proprio' ? [quem] : [alvoPrincipal].filter(Boolean);

    // Especiais que não são "ataque em alvo"
    if (acao.especial === 'preparar') {
      quem.preparado = acao.danoPreparado;
      aplicarCondicao(quem, { cond: 'preparando', turnos: acao.turnosPreparo ?? 1 }, quem);
      if (quem.marcas) quem.marcas.rupturaFeita = true;
      this.evento('preparando', { quem: quem.nome, acao: acao.nome, dano: acao.danoPreparado });
      return { tipo: 'preparar' };
    }
    if (acao.especial === 'cantico') {
      this.canticoAtivo = 2;
      this.evento('buff', { quem: quem.nome, acao: acao.nome });
      return { tipo: 'buff' };
    }
    if (acao.especial === 'invocar') {
      const imp = criarInimigo('imp', this.inimigos.length);
      imp.iniciativa = -99;                       // entra no fim da ordem
      this.inimigos.push(imp);
      this.ordem.push(imp);
      this.evento('invocar', { quem: quem.nome, alvo: imp.nome });
      return { tipo: 'invocar' };
    }
    if (acao.especial === 'acao-extra') {
      /* Duas, não uma: gastar a Ação para receber UMA Ação é saldo zero,
         e a habilidade custava 4 de Foco para não fazer nada. */
      this.acoesExtras += 2;
      this.evento('acao-extra', { quem: quem.nome });
      return { tipo: 'acao-extra' };
    }
    if (acao.especial === 'regeneracao') {
      aplicarCondicao(quem, { cond: 'regeneracao', turnos: 3 }, quem);
      this.evento('buff', { quem: quem.nome, acao: acao.nome });
      return { tipo: 'buff' };
    }
    if (acao.especial === 'forma-fera') {
      aplicarCondicao(quem, { cond: 'formaFera', turnos: 3 }, quem);
      this.evento('buff', { quem: quem.nome, acao: acao.nome });
      return { tipo: 'buff' };
    }
    if (acao.especial === 'espinhos') {
      aplicarCondicao(quem, { cond: 'espinhos', turnos: 3 }, quem);
    }

    const resultados = [];

    // Cura
    if (acao.cura) {
      const base = rolarNotacao(this.rng, acao.cura).total
        + (acao.usaChaveNaCura ? modChave(quem) : 0);
      const feito = curar(quem, base);
      this.evento('cura', { alvo: quem.nome, valor: feito, origem: acao.nome, pv: quem.pv });
    }

    for (const alvo of alvos) {
      if (!alvo || !alvo.vivo) continue;

      // Efeitos sem ataque (Marca, Olhar, Fenda, Acorrentar…)
      if (!acao.ataque) {
        for (const ef of acao.efeitos ?? []) {
          const destino = ef.em === 'proprio' ? quem : alvo;
          aplicarCondicao(destino, ef, quem);
          this.evento('condicao', { alvo: destino.nome, cond: ef.cond, origem: acao.nome });
        }
        continue;
      }

      const vezes = acao.especial === 'ataque-duplo' ? 2 : 1;
      for (let i = 0; i < vezes; i++) {
        if (!alvo.vivo) break;
        resultados.push(this.atacar(quem, alvo, acao));
      }
    }

    // Preço Cobrado e afins: efeitos em si mesmo mesmo com ataque
    if (acao.ataque) {
      for (const ef of (acao.efeitos ?? []).filter((e) => e.em === 'proprio')) {
        aplicarCondicao(quem, ef, quem);
        this.evento('condicao', { alvo: quem.nome, cond: ef.cond, origem: acao.nome });
      }
    }

    return { tipo: 'ataque', resultados };
  }

  /* ---- Um ataque -------------------------------------------------------- */

  atacar(quem, alvo, acao) {
    const vantagem = !!alvo.condicoes.marcado;
    const eraMarcado = vantagem;
    const d20 = rolarD20(this.rng, { vantagem });

    const limiar = acao.especial === 'critico-19'
      ? 19
      : (quem.limiarCritico ?? 20);

    const critico = d20.valor >= limiar;
    const erroAutomatico = d20.valor === 1;

    let bonus = bonusAtaqueDe(quem, this.estado());
    if (quem.condicoes.abencoado) bonus += rolarNotacao(this.rng, '1d4').total;

    const total = d20.valor + bonus;
    const defesa = defesaDe(alvo);
    const acertou = !erroAutomatico && (critico || total >= defesa);

    if (!acertou) {
      this.evento('erro', { quem: quem.nome, alvo: alvo.nome, acao: acao.nome, d20: d20.valor, total, defesa });
      return { acertou: false, critico: false, d20: d20.valor };
    }

    // Dano — Capítulo IV
    let escala = quem.lado === 'heroi' ? BAL.fatorDano : 1;
    // Forma de Fera: o básico do Druida vira 2d8. Sem isto a condição era
    // só +2 de Defesa, e a classe ficava sem resposta para vários alvos.
    if (quem.condicoes.formaFera && (acao.custo ?? 0) === 0) escala *= 2;
    const mult = (critico ? 2 : 1) * escala;
    let bruto = rolarNotacao(this.rng, acao.dano, mult).total + modChave(quem);
    if (acao.danoExtra) bruto += rolarNotacao(this.rng, acao.danoExtra, mult).total;
    if (acao.especial === 'dobra-se-vulneravel' && alvo.condicoes.vulneravel) bruto *= 2;

    if (quem.lado === 'inimigo') bruto = Math.round(bruto * BAL.fatorDanoInimigo);

    const dano = aplicarDano(alvo, bruto);
    this.evento('dano', {
      quem: quem.nome, alvo: alvo.nome, acao: acao.nome,
      dano, critico, d20: d20.valor, pv: alvo.pv,
    });

    // Efeitos que pegam carona no acerto
    for (const ef of (acao.efeitos ?? []).filter((e) => e.em !== 'proprio')) {
      aplicarCondicao(alvo, ef, quem);
      this.evento('condicao', { alvo: alvo.nome, cond: ef.cond, origem: acao.nome });
    }

    // Ganchos do Bruxo
    if (acao.especial === 'custo-vida') {
      const perda = rolarNotacao(this.rng, '1d6').total;
      aplicarDano(quem, perda);
      this.evento('autodano', { quem: quem.nome, dano: perda, pv: quem.pv });
    }
    if (acao.especial === 'roubo-vida') {
      const feito = curar(quem, Math.floor(dano / 2));
      this.evento('cura', { alvo: quem.nome, valor: feito, origem: acao.nome, pv: quem.pv });
    }

    // Espinhos do Paladino: devolve dano a quem o atacou
    if (alvo.condicoes.espinhos && quem !== alvo) {
      const volta = rolarNotacao(this.rng, '1d6').total;
      aplicarDano(quem, volta);
      this.evento('espinhos', { quem: alvo.nome, alvo: quem.nome, dano: volta, pv: quem.pv });
    }

    // Sangramento dispara quando o afetado AGE — Capítulo V
    const s = quem.condicoes.sangramento;
    if (s && quem.vivo) {
      const d = aplicarDano(quem, s.valor);
      this.evento('sangramento', { alvo: quem.nome, dano: d, pv: quem.pv });
    }

    // Ataque básico que acerta gera Foco; derrubar inimigo gera mais
    if (quem.lado === 'heroi') {
      if ((acao.custo ?? 0) === 0 && acao.id !== 'defender') {
        quem.foco = Math.min(quem.focoMax, quem.foco + 1);
      }
      if (!alvo.vivo) {
        quem.foco = Math.min(quem.focoMax, quem.foco + 2);
        this.evento('abatido', { alvo: alvo.nome });

        /* Caçador: abater a própria presa devolve fôlego e uma nova marca.
           É o que faz a rotação dele girar em vez de acabar no primeiro
           alvo derrubado. */
        if (quem.classeId === 'cacador' && eraMarcado) {
          quem.foco = Math.min(quem.focoMax, quem.foco + 2);
          this.bonusUsado = false;
          this.evento('presa', { quem: quem.nome, alvo: alvo.nome, foco: quem.foco });
        }
      }
    }

    // Golpe preparado descarregou: limpa o telegrama
    if (acao.oculta) {
      delete quem.condicoes.preparando;
      quem.preparado = null;
    }

    return { acertou: true, critico, dano, d20: d20.valor };
  }

  /* ---- Fim -------------------------------------------------------------- */

  checarFim() {
    if (this.terminado) return this.terminado;
    if (!this.heroi.vivo) {
      this.terminado = 'derrota';
      this.evento('fim', { resultado: 'derrota', rodada: this.rodada });
    } else if (this.inimigosVivos.length === 0) {
      this.terminado = 'vitoria';
      this.evento('fim', { resultado: 'vitoria', rodada: this.rodada });
    }
    return this.terminado;
  }

  xpGanho() {
    return this.inimigos.filter((i) => !i.vivo).reduce((s, i) => s + i.xp, 0);
  }
}
