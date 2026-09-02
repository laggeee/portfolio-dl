/* ==========================================================================
   CORRENTES — gerador compartilhado entre o portfólio e a arena.
   Posições, ângulos e espessuras são dados, não marcação: ficam aqui para
   poderem ser afinados num lugar só.
   ========================================================================== */

window.Grimorio = window.Grimorio || {};

window.Grimorio.buildChains = function buildChains(host, opts = {}) {
  if (!host) return 0;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;

  host.textContent = '';

  /* Três famílias de inclinação. Misturar as direções é o que faz a tela
     parecer amarrada por correntes em vez de listrada por elas. */
  const familias = opts.familias || [
    { qtd: 13, base:   0, variacao: 14 },  // verticais
    { qtd:  7, base:  90, variacao: 10 },  // horizontais
    { qtd:  6, base:  44, variacao: 12 },  // diagonais descendo
    { qtd:  6, base: -44, variacao: 12 },  // diagonais subindo
  ];

  /* Gerador determinístico: as correntes precisam cair no mesmo lugar a
     cada carregamento, senão o efeito muda de composição a cada visita. */
  let semente = opts.semente || 20260902;
  const rnd = () => {
    semente = (semente * 1664525 + 1013904223) % 4294967296;
    return semente / 4294967296;
  };

  const frag = document.createDocumentFragment();
  let total = 0;

  for (const fam of familias) {
    for (let i = 0; i < fam.qtd; i++) {
      const strand = document.createElement('i');
      strand.className = 'chain';

      // espalha ao longo do eixo perpendicular à inclinação da família
      const passo = 100 / fam.qtd;
      const eixo = passo * (i + .5) + (rnd() - .5) * passo * .7;
      const transversal = 12 + rnd() * 76;

      const horizontal = Math.abs(fam.base) === 90;
      strand.style.setProperty('--x', (horizontal ? transversal : eixo).toFixed(1) + '%');
      strand.style.setProperty('--y', (horizontal ? eixo : transversal).toFixed(1) + '%');
      strand.style.setProperty('--rot',
        (fam.base + (rnd() - .5) * fam.variacao).toFixed(1) + 'deg');

      // profundidade: as mais grossas parecem à frente, as finas ao fundo
      const escala = 0.55 + rnd() * 0.85;
      strand.style.setProperty('--w', (34 * escala).toFixed(1) + 'px');
      strand.style.setProperty('--op', (0.30 + escala * 0.42).toFixed(2));
      strand.style.setProperty('--d', Math.round(rnd() * 420) + 'ms');

      strand.innerHTML = '<b class="chain__half chain__half--a"></b>' +
                         '<b class="chain__half chain__half--b"></b>';
      frag.append(strand);
      total++;
    }
  }

  host.append(frag);
  return total;
};
