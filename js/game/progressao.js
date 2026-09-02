/* ==========================================================================
   PROGRESSÃO — o estado que atravessa combates.

   Uma jornada guarda classe, nível, XP, fragmentos e a vida com que você
   saiu do último encontro. É esse último ponto que dá peso às escolhas:
   sem atrito, todo combate é isolado e curar nunca importa.
   ========================================================================== */

import { NIVEIS, CLASSES } from './classes.js';
import { criarHeroi } from './combate.js';

const CHAVE = 'grimorio:jornada';

/* Com atrito, a vida perdida acompanha você até um Altar. Desligar isto
   transforma a campanha numa sequência de duelos independentes — é a
   pergunta que o Códice deixou em aberto, e a resposta está aqui. */
export const ATRITO = true;

export function nivelPorXp(xp) {
  let n = NIVEIS[0];
  for (const faixa of NIVEIS) if (xp >= faixa.xp) n = faixa;
  return n.nivel;
}

export function proximoNivel(xp) {
  const atual = nivelPorXp(xp);
  return NIVEIS.find((n) => n.nivel === atual + 1) ?? null;
}

/** Quanto falta, em fração, para o próximo nível. */
export function progressoNoNivel(xp) {
  const atual = NIVEIS.find((n) => n.nivel === nivelPorXp(xp));
  const prox = proximoNivel(xp);
  if (!prox) return { fracao: 1, faltam: 0, base: atual.xp, alvo: atual.xp };
  const vao = prox.xp - atual.xp;
  return {
    fracao: (xp - atual.xp) / vao,
    faltam: prox.xp - xp,
    base: atual.xp,
    alvo: prox.xp,
  };
}

/* --------------------------------------------------------------------------
   A jornada
   -------------------------------------------------------------------------- */

export function novaJornada(classeId) {
  const heroi = criarHeroi(classeId, 1);
  return {
    classeId,
    nivel: 1,
    xp: 0,
    fragmentos: 0,
    pv: heroi.pvMax,
    pocoes: heroi.pocoes,
    andar: 1,
    encontrosVencidos: 0,
  };
}

export function carregarJornada() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const j = JSON.parse(bruto);
    return CLASSES[j?.classeId] ? j : null;
  } catch { return null; }
}

export function salvarJornada(j) {
  try { localStorage.setItem(CHAVE, JSON.stringify(j)); } catch { /* modo privado */ }
}

export function apagarJornada() {
  try { localStorage.removeItem(CHAVE); } catch { /* modo privado */ }
}

/* --------------------------------------------------------------------------
   Montar o herói a partir da jornada
   -------------------------------------------------------------------------- */

export function heroiDaJornada(j) {
  const h = criarHeroi(j.classeId, j.nivel);
  if (ATRITO) {
    h.pv = Math.max(1, Math.min(h.pvMax, j.pv ?? h.pvMax));
    h.pocoes = j.pocoes ?? h.pocoes;
  }
  return h;
}

/* --------------------------------------------------------------------------
   Recompensa de um encontro
   -------------------------------------------------------------------------- */

/**
 * Aplica XP e fragmentos, e devolve o que mudou para a tela contar.
 * A subida de nível cura a diferença de PV máximo: o ganho tem que ser
 * sentido na hora, não só no próximo combate.
 */
export function concluirEncontro(j, { xp = 0, fragmentos = 0, pvFinal, pocoesRestantes }) {
  const antes = { nivel: j.nivel, xp: j.xp, fragmentos: j.fragmentos };

  j.xp += xp;
  j.fragmentos += fragmentos;
  j.encontrosVencidos += 1;
  j.andar += 1;
  if (pvFinal != null) j.pv = Math.max(1, pvFinal);
  if (pocoesRestantes != null) j.pocoes = pocoesRestantes;

  const nivelNovo = nivelPorXp(j.xp);
  const subiu = nivelNovo > j.nivel;
  let ganhoDePv = 0;

  if (subiu) {
    const pvAntigo = criarHeroi(j.classeId, j.nivel).pvMax;
    const pvNovo = criarHeroi(j.classeId, nivelNovo).pvMax;
    ganhoDePv = pvNovo - pvAntigo;
    j.pv = Math.min(pvNovo, j.pv + ganhoDePv);
    j.nivel = nivelNovo;
  }

  salvarJornada(j);

  return {
    xpGanho: xp,
    fragmentosGanhos: fragmentos,
    subiu,
    nivelAntes: antes.nivel,
    nivelAgora: j.nivel,
    ganhoDePv,
    habilidadesNovas: subiu ? habilidadesEntre(j.classeId, antes.nivel, j.nivel) : [],
    progresso: progressoNoNivel(j.xp),
  };
}

function habilidadesEntre(classeId, de, ate) {
  return (CLASSES[classeId]?.habilidades ?? [])
    .filter((h) => h.nivel > de && h.nivel <= ate)
    .map((h) => h.nome);
}
