/* ==========================================================================
   DADOS — gerador determinístico e rolagens
   Códice da Arena, Capítulo I.

   Toda aleatoriedade do jogo passa por aqui. O gerador é semeado de
   propósito: com a mesma semente, o mesmo combate acontece igual. Sem isso
   não há como investigar "aquela luta em que o Bruxo morreu na rodada 2".
   ========================================================================== */

/** mulberry32 — pequeno, rápido e com distribuição boa o suficiente. */
export function criarRng(semente = Date.now()) {
  let a = semente >>> 0;
  return function rng() {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Um dado de N faces: 1..N. */
export function rolar(rng, faces) {
  return 1 + Math.floor(rng() * faces);
}

/** N dados de F faces. Devolve o total e cada face, para o log. */
export function rolarDados(rng, quantidade, faces) {
  const faces_ = [];
  let total = 0;
  for (let i = 0; i < quantidade; i++) {
    const v = rolar(rng, faces);
    faces_.push(v);
    total += v;
  }
  return { total, faces: faces_ };
}

/* Notação "2d10+3" -> { quantidade: 2, faces: 10, bonus: 3 }.
   Cacheada porque a mesma string é lida a cada ataque de cada simulação. */
const cacheNotacao = new Map();

export function lerNotacao(notacao) {
  if (cacheNotacao.has(notacao)) return cacheNotacao.get(notacao);

  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(String(notacao).trim());
  if (!m) throw new Error('Notação de dado inválida: ' + notacao);

  const lido = {
    quantidade: Number(m[1]),
    faces: Number(m[2]),
    bonus: m[3] ? Number(m[3]) : 0,
  };
  cacheNotacao.set(notacao, lido);
  return lido;
}

/** Rola uma notação inteira. `multiplicador` serve ao crítico (dobra os dados). */
export function rolarNotacao(rng, notacao, multiplicador = 1) {
  const { quantidade, faces, bonus } = lerNotacao(notacao);
  const r = rolarDados(rng, quantidade * multiplicador, faces);
  return { total: r.total + bonus, faces: r.faces, bonus };
}

/**
 * O d20 do Capítulo I.
 * Vantagem e desvantagem se cancelam — se as duas estiverem presentes,
 * rola-se um d20 limpo. É regra do Códice, não detalhe de implementação.
 */
export function rolarD20(rng, { vantagem = false, desvantagem = false } = {}) {
  if (vantagem && desvantagem) {
    const v = rolar(rng, 20);
    return { valor: v, rolagens: [v], modo: 'normal' };
  }
  if (!vantagem && !desvantagem) {
    const v = rolar(rng, 20);
    return { valor: v, rolagens: [v], modo: 'normal' };
  }

  const a = rolar(rng, 20);
  const b = rolar(rng, 20);
  const valor = vantagem ? Math.max(a, b) : Math.min(a, b);
  return { valor, rolagens: [a, b], modo: vantagem ? 'vantagem' : 'desvantagem' };
}

/** Média de um dado, usada no ganho de PV por nível. */
export function mediaDoDado(faces) {
  return Math.floor((faces + 1) / 2);
}
