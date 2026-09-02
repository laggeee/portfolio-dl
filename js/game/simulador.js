/* ==========================================================================
   SIMULADOR — roda o encontro sozinho, muitas vezes.

   O objetivo não é jogar bem: é jogar de forma CONSISTENTE, para que a
   diferença entre duas classes venha do balanceamento e não do humor da
   política. Por isso as regras abaixo são simples e fixas.
   ========================================================================== */

import { Combate, criarHeroi, criarInimigo, defesaDe } from './combate.js';
import { IDS_CLASSES } from './classes.js';
import { ENCONTRO_ABERTURA } from './inimigos.js';
import { lerNotacao } from './dados.js';

/* Dano médio esperado, já contando quantos alvos a ação atinge.
   Ordenar por CUSTO empatava Chuva de Flechas (3 Foco, 1d8 em área) com
   Tiro Perfurante (3 Foco, 5d10 num alvo) e escolhia por acaso — era o que
   derrubava o Caçador a 8% contra o Guardião sozinho. */
function danoEsperado(acao, numAlvos) {
  if (!acao.dano) return 0;
  const somar = (n) => {
    const { quantidade, faces, bonus } = lerNotacao(n);
    return quantidade * (faces + 1) / 2 + bonus;
  };
  let d = somar(acao.dano);
  if (acao.danoExtra) d += somar(acao.danoExtra);
  if (acao.especial === 'ataque-duplo') d *= 2;
  return d * (acao.alvo === 'todos-inimigos' ? numAlvos : 1);
}

/* --------------------------------------------------------------------------
   Política do herói
   -------------------------------------------------------------------------- */

/** Alvo preferido: o Arauto primeiro (ele multiplica os outros), depois o
    mais perto de morrer — focar fogo tira ações do inimigo do tabuleiro. */
function escolherAlvo(combate) {
  const vivos = combate.inimigosVivos;
  const arauto = vivos.find((i) => i.tipoId === 'arauto');
  if (arauto) return arauto;

  const preparando = vivos.find((i) => i.condicoes.preparando);
  if (preparando) return preparando;

  return vivos.slice().sort((a, b) => a.pv - b.pv)[0];
}

/* Buffs de manutenção: reaplicar enquanto já estão ativos é desperdício de
   Foco — era o que estava afundando o Druida na medição. */
const BUFFS = { 'forma-fera': 'formaFera', 'renovar': 'regeneracao',
                'escudo-juramento': 'defendendo', 'bencao': 'abencoado' };

function escolherAcao(combate, disp, alvo) {
  const h = combate.heroi;
  const acao = (id) => disp.find((a) => a.id === id);

  // 1. Sobreviver primeiro
  if (h.pv / h.pvMax < 0.4) {
    const cura = acao('luz-curativa') ?? acao('bastiao') ?? acao('renovar');
    if (cura && !(BUFFS[cura.id] && h.condicoes[BUFFS[cura.id]])) return { id: cura.id };
  }

  // 2. Interromper um golpe telegrafado vale mais que qualquer dano
  const preparando = combate.inimigosVivos.find((i) => i.condicoes.preparando);
  if (preparando) {
    const atordoa = acao('fenda') ?? acao('brado');
    if (atordoa) return { id: atordoa.id, alvo: preparando.id };
  }

  /* 3. Forma de Fera é o único buff mantido de forma proativa: ele DOBRA o
        dano do básico, então cada turno gasto nele se paga nos seguintes.
        Os defensivos (Escudo, Renovar) são reativos — mantê-los sempre
        custava metade dos turnos do Paladino, que foi de 18 para 28
        rodadas na medição. */
  if (!h.condicoes.formaFera && acao('forma-fera')) return { id: 'forma-fera' };

  if (h.pv / h.pvMax < 0.55) {
    const defensivo = acao('escudo-juramento') ?? acao('renovar');
    const cond = defensivo && BUFFS[defensivo.id];
    if (defensivo && !h.condicoes[cond]) return { id: defensivo.id };
  }

  // 4. Ação extra: só compensa se sobrar Foco para usá-la em algo
  const dupla = acao('sombra-dupla');
  if (dupla && h.foco >= dupla.custo + 2) return { id: dupla.id };

  // 6. A habilidade que mais machuca, dado o número de alvos em pé
  const vivos = combate.inimigosVivos.length;
  const ofensivas = disp
    .filter((a) => a.dano && a.tipo === 'acao' && a.custo > 0
                && !(a.especial === 'exige-marcado' && !alvo.condicoes.marcado))
    .sort((a, b) => danoEsperado(b, vivos) - danoEsperado(a, vivos));
  if (ofensivas.length) return { id: ofensivas[0].id, alvo: alvo.id };

  // 7. Sem Foco: básico gera Foco; Defender se estiver por um fio
  if (h.pv / h.pvMax < 0.25 && acao('defender')) return { id: 'defender' };
  const basico = disp.find((a) => a.custo === 0 && a.dano && a.tipo === 'acao');
  return basico ? { id: basico.id, alvo: alvo.id } : { id: 'defender' };
}

function jogarTurno(combate) {
  const h = combate.heroi;
  if (!combate.inimigosVivos.length) return;

  /* Segue as fases do motor: Ação -> Ação extra -> Ação bônus. */
  let guarda = 0;
  while (!combate.terminado && combate.fase !== 'fim' && guarda++ < 8) {
    const alvo = escolherAlvo(combate);
    if (!alvo) break;

    const disp = combate.acoesDisponiveis().filter((a) => a.disponivel && a.tipo !== 'fim');
    if (!disp.length) break;

    if (combate.fase === 'bonus') {
      // Marca antes de tudo; poção só se estiver mal
      const marca = disp.find((a) => a.id === 'marca');
      const pocao = disp.find((a) => a.id === 'pocao');
      if (marca && !alvo.condicoes.marcado) combate.agir('marca', alvo.id);
      else if (pocao && h.pv / h.pvMax < 0.35) combate.agir('pocao');
      else break;
      continue;
    }

    const escolha = escolherAcao(combate, disp, alvo);
    combate.agir(escolha.id, escolha.alvo ?? alvo.id);
  }

  if (!combate.terminado) combate.encerrarTurno();
}

/* --------------------------------------------------------------------------
   Um encontro
   -------------------------------------------------------------------------- */

export function simularEncontro({ classeId, nivel = 1, semente = 1,
                                  encontro = ENCONTRO_ABERTURA, limiteRodadas = 60 }) {
  const heroi = criarHeroi(classeId, nivel);
  const inimigos = encontro.map((t, i) => criarInimigo(t, i));
  const combate = new Combate({ heroi, inimigos, semente });

  combate.iniciar();

  let voltas = 0;
  while (!combate.terminado && combate.rodada <= limiteRodadas && voltas++ < 5000) {
    combate.avancarAteHeroi();
    if (combate.terminado) break;
    jogarTurno(combate);
  }

  return {
    resultado: combate.terminado ?? 'empate',
    rodadas: combate.rodada,
    pvFinal: heroi.pv,
    pvMax: heroi.pvMax,
    xp: combate.xpGanho(),
    log: combate.log,
    semente,
  };
}

/* --------------------------------------------------------------------------
   Muitos encontros
   -------------------------------------------------------------------------- */

export function simularClasse({ classeId, nivel = 1, vezes = 1000, encontro }) {
  let vitorias = 0, derrotas = 0, empates = 0;
  let somaRodadas = 0, somaPv = 0;
  let pior = Infinity, melhor = -Infinity;

  for (let i = 0; i < vezes; i++) {
    const r = simularEncontro({ classeId, nivel, semente: i + 1, encontro });
    if (r.resultado === 'vitoria') {
      vitorias++;
      somaPv += r.pvFinal;
      pior = Math.min(pior, r.pvFinal);
      melhor = Math.max(melhor, r.pvFinal);
    } else if (r.resultado === 'derrota') derrotas++;
    else empates++;
    somaRodadas += r.rodadas;
  }

  const heroi = criarHeroi(classeId, nivel);
  return {
    classeId, nome: heroi.nome, nivel,
    pvMax: heroi.pvMax, defesa: defesaDe(heroi),
    vezes, vitorias, derrotas, empates,
    taxaVitoria: vitorias / vezes,
    rodadasMedia: somaRodadas / vezes,
    pvMedioNaVitoria: vitorias ? somaPv / vitorias : 0,
    pvPiorVitoria: vitorias ? pior : 0,
  };
}

export function simularTodas({ nivel = 1, vezes = 1000, encontro } = {}) {
  return IDS_CLASSES.map((id) => simularClasse({ classeId: id, nivel, vezes, encontro }));
}
