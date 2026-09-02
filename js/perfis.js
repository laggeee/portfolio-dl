/* ==========================================================================
   PERFIS DE ACESSO — a mesma informação, em ordens diferentes.

   Ninguém lê um portfólio inteiro. Quem contrata quer saber se dá para
   conversar; quem é da área quer ver código; quem veio pelo jogo quer
   jogar. Em vez de escrever três sites, o visitante diz o que veio fazer
   e a ordem se ajusta.

   Nada é escondido: só reordenado. Todas as seções continuam acessíveis.
   ========================================================================== */

export const PERFIS = {
  recrutador: {
    nome: 'Recrutador',
    tag: 'Decisão rápida',
    desc: 'Contato, experiência e certificações primeiro. A história vem depois.',
    ordem: ['pacto', 'diario', 'selos', 'pericias', 'feitos', 'origem', 'arena'],
  },
  tecnico: {
    nome: 'Time técnico',
    tag: 'Ver o código',
    desc: 'Projetos e perícias na frente, com a experiência logo atrás.',
    ordem: ['feitos', 'pericias', 'diario', 'selos', 'origem', 'arena', 'pacto'],
  },
  curioso: {
    nome: 'Curioso',
    tag: 'Vim pelo jogo',
    desc: 'A Arena e a história de origem primeiro. O currículo pode esperar.',
    ordem: ['arena', 'origem', 'feitos', 'pericias', 'diario', 'selos', 'pacto'],
  },
  completo: {
    nome: 'Aventureiro',
    tag: 'Ordem do grimório',
    desc: 'A jornada inteira, na ordem em que foi escrita.',
    ordem: ['origem', 'pericias', 'feitos', 'diario', 'selos', 'arena', 'pacto'],
  },
};

export const PERFIL_PADRAO = 'completo';

const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/**
 * Reordena seções e navegação, e renumera os capítulos.
 *
 * A renumeração não é enfeite: sem ela o visitante vê "Capítulo VII" em
 * segundo lugar e conclui, com razão, que a página está quebrada.
 */
export function aplicarPerfil(id, { rotulos = {} } = {}) {
  const perfil = PERFIS[id] ?? PERFIS[PERFIL_PADRAO];
  document.documentElement.dataset.perfil = id;

  perfil.ordem.forEach((secaoId, i) => {
    const secao = document.getElementById(secaoId);
    if (secao) secao.style.order = String(i + 1);

    const link = document.querySelector(`.topbar__nav a[href="#${secaoId}"]`);
    if (link) {
      link.style.order = String(i + 1);
      const numeral = link.querySelector('i');
      if (numeral) numeral.textContent = ROMANOS[i + 1] ?? String(i + 1);
    }

    const num = secao?.querySelector('.chapter__num');
    if (num) num.textContent = `${rotulos.capitulo ?? 'Capítulo'} ${ROMANOS[i + 1] ?? i + 1}`;
  });

  return perfil;
}

export function perfilGravado() {
  try { return localStorage.getItem('grimorio:perfil'); } catch { return null; }
}

export function gravarPerfil(id) {
  try { localStorage.setItem('grimorio:perfil', id); } catch { /* modo privado */ }
}
