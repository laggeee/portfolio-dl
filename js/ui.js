import { PERFIS, PERFIL_PADRAO, aplicarPerfil, perfilGravado, gravarPerfil } from './perfis.js';
import { aplicarIdioma, idiomaGravado, gravarIdioma, rotulos } from './i18n.js';

/* ==========================================================================
   UI — só o mínimo para a camada visual funcionar.
   A engine de combate virá em js/game/ e não deve tocar neste arquivo.
   ========================================================================== */

(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Ritual de escolha de classe
     ------------------------------------------------------------------ */

  const STORAGE_KEY = 'grimorio:classe';
  const ritual = document.getElementById('ritual');
  const sheetClass = document.getElementById('sheetClass');

  const CLASS_NAMES = {
    guerreiro: 'Guerreiro',
    arcanista: 'Arcanista',
    ladino: 'Ladino',
    clerigo: 'Clérigo',
    cacador: 'Caçador',
    druida: 'Druida',
    paladino: 'Paladino',
    bruxo: 'Bruxo',
  };

  const readStored = () => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  };
  const writeStored = (v) => {
    try { localStorage.setItem(STORAGE_KEY, v); } catch { /* modo privado */ }
  };

  function applyClass(pick) {
    root.dataset.class = pick;
    const label = CLASS_NAMES[pick];
    if (label && sheetClass) {
      sheetClass.querySelector('[data-class-name]').textContent = label;
      sheetClass.hidden = false;
    } else if (sheetClass) {
      sheetClass.hidden = true;
    }
  }

  let perfilEscolhido = perfilGravado() ?? null;
  let idioma = idiomaGravado() ?? 'pt';

  function openRitual(etapa = 'classe') {
    if (!ritual) return;
    ritual.dataset.etapa = etapa;
    ritual.hidden = false;
    document.body.classList.add('is-locked');
    ritual.querySelector(etapa === 'classe' ? '.class-card' : '.perfil-card')?.focus();
  }

  function closeRitual() {
    if (!ritual) return;
    document.body.classList.remove('is-locked');
    if (reduced) { ritual.hidden = true; return; }
    ritual.querySelector('.ritual__content').style.animation =
      'ritual-out 420ms var(--ease-parchment) forwards';
    ritual.style.transition = 'opacity 420ms';
    ritual.style.opacity = '0';
    setTimeout(() => {
      ritual.hidden = true;
      ritual.style.opacity = '';
      ritual.style.transition = '';
      ritual.querySelector('.ritual__content').style.animation = '';
    }, 420);
  }

  ritual?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick]');
    if (!btn) return;
    applyClass(btn.dataset.pick);
    writeStored(btn.dataset.pick);
    for (const c of ritual.querySelectorAll('.class-card')) {
      c.classList.toggle('is-picked', c === btn);
    }
    ritual.dataset.etapa = 'perfil';        // segunda pergunta
    ritual.querySelector('.perfil-card')?.focus();
  });

  /* ---- Etapa 2: perfil de acesso e idioma ---- */

  const entrarBtn = document.getElementById('entrarPortfolio');

  ritual?.addEventListener('click', (e) => {
    const p = e.target.closest('[data-perfil]');
    if (!p) return;
    perfilEscolhido = p.dataset.perfil;
    for (const c of ritual.querySelectorAll('.perfil-card')) {
      const eu = c === p;
      c.classList.toggle('is-picked', eu);
      c.setAttribute('aria-pressed', String(eu));
    }
    entrarBtn.disabled = false;
  });

  ritual?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-idioma]');
    if (!b) return;
    idioma = b.dataset.idioma;
    gravarIdioma(idioma);
    for (const o of ritual.querySelectorAll('.idioma__opcao')) {
      const eu = o === b;
      o.classList.toggle('is-ativo', eu);
      o.setAttribute('aria-pressed', String(eu));
    }
    aplicarIdioma(idioma);
    aplicarPerfil(perfilEscolhido ?? PERFIL_PADRAO, { rotulos: rotulos(idioma) });
  });

  document.getElementById('voltarClasse')?.addEventListener('click', () => {
    ritual.dataset.etapa = 'classe';
  });

  entrarBtn?.addEventListener('click', () => {
    if (!perfilEscolhido) return;
    gravarPerfil(perfilEscolhido);
    aplicarPerfil(perfilEscolhido, { rotulos: rotulos(idioma) });
    closeRitual();
  });

  document.getElementById('reclassBtn')?.addEventListener('click', openRitual);

  // Valida contra as classes reais em vez de aceitar qualquer valor gravado:
  // quem entrou "sem classe" antes tem 'none' no localStorage e, sem esta
  // checagem, nunca mais seria perguntado agora que a opção não existe.
  aplicarIdioma(idioma);
  for (const o of ritual?.querySelectorAll('.idioma__opcao') ?? []) {
    const eu = o.dataset.idioma === idioma;
    o.classList.toggle('is-ativo', eu);
    o.setAttribute('aria-pressed', String(eu));
  }

  const stored = readStored();
  if (stored && CLASS_NAMES[stored] && perfilEscolhido && PERFIS[perfilEscolhido]) {
    applyClass(stored);
    aplicarPerfil(perfilEscolhido, { rotulos: rotulos(idioma) });
  } else if (stored && CLASS_NAMES[stored]) {
    applyClass(stored);
    openRitual('perfil');                   // só falta a segunda pergunta
  } else {
    openRitual('classe');
  }

  /* ------------------------------------------------------------------
     Reveal ao entrar no viewport
     ------------------------------------------------------------------ */

  const revealables = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach((el) => el.classList.add('is-revealed'));
  } else {
    // Dois observers com responsabilidades separadas.
    //
    // O de revelar dispara cedo (12% da dobra recuados) para o elemento já
    // estar assentado quando chega ao centro da tela. O de rearmar usa a
    // borda real do viewport, sem recuo: se ele herdasse o mesmo rootMargin,
    // desfaria a animação de um elemento ainda visível no rodapé.
    const showObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        if (el.classList.contains('is-revealed')) continue;
        reveal(el);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    // Rearma quando o elemento sai inteiro da tela, para que a animação
    // aconteça de novo na próxima passagem. O reset é instantâneo (sem
    // transição de volta), e acontece fora de vista.
    const resetObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) continue;
        rearm(entry.target);
      }
    }, { threshold: 0 });

    revealables.forEach((el) => {
      showObserver.observe(el);
      resetObserver.observe(el);
    });

    // Rede de segurança: se por qualquer motivo o observer não entregar
    // (aba em segundo plano na hora do load, throttling, erro isolado),
    // nada pode ficar preso em opacity:0. Conteúdo invisível é pior que
    // conteúdo sem animação.
    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.is-revealed)').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) reveal(el);
      });
    }, 3000);
  }

  /* Revela o elemento e garante que o will-change saia depois.
     transitionend é o caminho rápido, mas não é confiável sozinho: a
     transição pode ser cancelada, ou congelar se a aba for para segundo
     plano. O timeout fecha a conta em qualquer cenário. */
  const REVEAL_MAX_MS = 1400; // maior duração + maior delay, com folga
  const pendentes = new WeakMap();

  function reveal(el) {
    limparPendente(el);
    el.classList.add('is-animating', 'is-revealed');

    const encerrar = () => {
      el.classList.remove('is-animating');
      limparPendente(el);
    };
    const onEnd = (e) => { if (e.target === el) encerrar(); };

    el.addEventListener('transitionend', onEnd);
    const delay = Number(el.style.getPropertyValue('--i') || 0) * 90;
    const timer = setTimeout(encerrar, REVEAL_MAX_MS + delay);

    pendentes.set(el, { timer, onEnd });

    if (el.dataset.reveal === 'roll') rollScore(el);
  }

  /* Devolve o elemento ao estado inicial. Como a transição está declarada
     em .is-revealed, tirar a classe faz o reset ser instantâneo — nada de
     animação ao contrário. */
  function rearm(el) {
    if (!el.classList.contains('is-revealed')) return;
    limparPendente(el);
    cancelarRolagem(el);
    el.classList.remove('is-revealed', 'is-animating');
  }

  function limparPendente(el) {
    const p = pendentes.get(el);
    if (!p) return;
    clearTimeout(p.timer);
    el.removeEventListener('transitionend', p.onEnd);
    pendentes.delete(el);
  }

  /* Os atributos "rolam" antes de assentar no valor final.
     O número só troca a cada ~55ms: a 60fps seriam 6 escritas de DOM por
     frame (uma por perícia), cada uma invalidando layout do grid inteiro.
     O olho não distingue mais que ~18 trocas por segundo num dado girando,
     então o efeito é idêntico por um vigésimo do custo. */
  const ROLL_STEP_MS = 55;
  const rolagens = new WeakMap();

  function cancelarRolagem(attr) {
    const id = rolagens.get(attr);
    if (id === undefined) return;
    cancelAnimationFrame(id);
    rolagens.delete(attr);
  }

  function rollScore(attr) {
    const el = attr.querySelector('[data-count]');
    if (!el) return;

    // Uma rolagem anterior pode estar viva se o usuário voltou e desceu
    // rápido; dois loops no mesmo número brigariam pelo textContent.
    cancelarRolagem(attr);

    const target = Number(el.dataset.count);
    const start = performance.now();
    const duration = 900 + Number(attr.style.getPropertyValue('--i') || 0) * 90;
    let lastPaint = 0;

    const tick = (now) => {
      if (now - start >= duration) {
        el.textContent = target;
        rolagens.delete(attr);
        return;
      }
      if (now - lastPaint >= ROLL_STEP_MS) {
        lastPaint = now;
        el.textContent = 1 + Math.floor(Math.random() * target);
      }
      rolagens.set(attr, requestAnimationFrame(tick));
    };
    rolagens.set(attr, requestAnimationFrame(tick));
  }

  /* ------------------------------------------------------------------
     Trilha de XP
     ------------------------------------------------------------------ */

  const xpFill = document.getElementById('xpFill');
  const xpLabel = document.getElementById('xpLabel');
  let ticking = false;

  function updateXP() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? Math.min(scrollY / max, 1) : 0;

    xpFill.style.width = (pct * 100).toFixed(2) + '%';

    const level = 1 + Math.floor(pct * 9); // nível 1 -> 10 ao longo da página
    const next = xpLabel.dataset.level;
    if (next !== String(level)) {
      xpLabel.dataset.level = level;
      const emIngles = document.documentElement.dataset.idioma === 'en';
      xpLabel.textContent = level >= 10
        ? (emIngles ? 'Max Level' : 'Nível Máximo')
        : (emIngles ? 'Level ' : 'Nível ') + level;
    }
    ticking = false;
  }

  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateXP);
  }, { passive: true });
  updateXP();

  /* ------------------------------------------------------------------
     Quebrar o selo — as correntes tomam a tela e levam para a Arena.

     A transição atravessa duas páginas. O corte acontece no instante em
     que a tela está totalmente preta, então a emenda é invisível: aqui
     termina no breu, e arena.html começa no breu.
     ------------------------------------------------------------------ */

  const SEIZE_MS = reduced ? 260 : 1650;

  const seal = document.getElementById('seal');
  const sealChains = document.getElementById('sealChains');
  const breakSealBtn = document.getElementById('breakSealBtn');

  breakSealBtn?.addEventListener('click', () => {
    if (!seal || seal.dataset.phase !== 'idle') return;

    window.Grimorio.buildChains(sealChains);
    seal.dataset.phase = 'seizing';
    document.body.classList.add('is-sealing');
    breakSealBtn.disabled = true;

    setTimeout(() => { location.href = 'arena.html'; }, SEIZE_MS);
  });

  /* ------------------------------------------------------------------
     Miudezas
     ------------------------------------------------------------------ */

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
