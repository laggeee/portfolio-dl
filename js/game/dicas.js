/* ==========================================================================
   DICAS — a caixa que aparece ao repousar o mouse, e os modais de ajuda.

   Só desenha o que explicar.js calcula. A regra de posicionamento é uma
   só: a caixa nunca sai da tela, e nunca cobre o que está sendo explicado.
   ========================================================================== */

import { explicarAcao, explicarCondicao, explicarInimigo } from './explicar.js';

const ATRASO = 420;   // repouso antes de aparecer

const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export class Dicas {
  constructor(combate) {
    this.combate = combate;
    this.caixa = document.getElementById('dica');
    this.timer = null;
    this.ancora = null;

    // um só ouvinte na página inteira: os alvos entram e saem do DOM o
    // tempo todo, e re-registrar ouvinte a cada repintura vazaria memória
    document.addEventListener('pointerover', (e) => this.aoEntrar(e));
    document.addEventListener('pointerout', (e) => this.aoSair(e));
    document.addEventListener('pointerdown', () => this.esconder());
    addEventListener('scroll', () => this.esconder(), true);
    addEventListener('keydown', (e) => { if (e.key === 'Escape') this.esconder(); });
  }

  atualizarCombate(combate) { this.combate = combate; }

  aoEntrar(e) {
    const alvo = e.target.closest?.('[data-acao], .pip, .effect, .token--foe, .portrait--foe');
    if (!alvo || alvo === this.ancora) return;
    clearTimeout(this.timer);
    this.ancora = alvo;
    this.timer = setTimeout(() => this.mostrar(alvo), ATRASO);
  }

  aoSair(e) {
    if (this.ancora && !this.ancora.contains(e.relatedTarget)) this.esconder();
  }

  esconder() {
    clearTimeout(this.timer);
    this.ancora = null;
    this.caixa.hidden = true;
  }

  mostrar(alvo) {
    const html = this.conteudo(alvo);
    if (!html) return;

    this.caixa.innerHTML = html;
    this.caixa.hidden = false;
    this.posicionar(alvo);
  }

  /** Acima do elemento; abaixo se não couber; sempre dentro da tela. */
  posicionar(alvo) {
    const a = alvo.getBoundingClientRect();
    const c = this.caixa.getBoundingClientRect();
    const margem = 10;

    let topo = a.top - c.height - margem;
    if (topo < margem) topo = a.bottom + margem;
    topo = Math.min(topo, innerHeight - c.height - margem);
    topo = Math.max(margem, topo);

    let esquerda = a.left + a.width / 2 - c.width / 2;
    esquerda = Math.max(margem, Math.min(esquerda, innerWidth - c.width - margem));

    this.caixa.style.top = Math.round(topo) + 'px';
    this.caixa.style.left = Math.round(esquerda) + 'px';
  }

  /* ---- Conteúdo por tipo de alvo ---------------------------------------- */

  conteudo(alvo) {
    if (alvo.dataset?.acao) return this.deAcao(alvo.dataset.acao);

    const cond = [...alvo.classList].find((c) => c.startsWith('pip--') || c.startsWith('effect--'));
    if (cond) {
      const id = cond.replace(/^(pip|effect)--/, '');
      if (id === 'bom' || id === 'ruim' || id === 'aviso') return null;
      const dono = alvo.closest('.token');
      const combatente = dono
        ? this.combate.combatentes.find((c) => c.id === dono.dataset.id)
        : this.combate.heroi;
      return this.deCondicao(id, combatente?.condicoes?.[id]);
    }

    const no = alvo.closest('.token--foe');
    if (no) {
      const inim = this.combate.inimigos.find((i) => i.id === no.dataset.id);
      if (inim) return this.deInimigo(inim);
    }
    return null;
  }

  /* ---- Habilidade ------------------------------------------------------- */

  deAcao(id) {
    const acao = this.combate.acoesDisponiveis().find((a) => a.id === id);
    if (!acao) return null;

    // Explica contra o alvo mais provável, para os números serem os reais
    const alvo = acao.alvo === 'inimigo' || acao.alvo === 'todos-inimigos'
      ? this.combate.inimigosVivos[0] : null;
    const x = explicarAcao(this.combate, acao, alvo);

    const linhas = [];
    linhas.push(`<h3 class="dica__nome">${esc(x.nome)}</h3>`);
    linhas.push(`<p class="dica__meta">${esc(x.tipo)} · ${esc(x.alvo)}${
      x.custo ? ` · <b>${x.custo} Foco</b>` : ' · sem custo'}</p>`);

    if (!acao.disponivel && acao.motivo) {
      linhas.push(`<p class="dica__aviso">${esc(acao.motivo)}</p>`);
    }

    if (x.ataque) {
      linhas.push(`<div class="dica__bloco"><span class="dica__titulo">Teste de ataque</span>`);
      linhas.push(`<p class="dica__formula">${esc(x.ataque.formula)}</p>`);
      linhas.push(this.parcelas(x.ataque.parcelas));
      if (x.ataque.contra) {
        const c = x.ataque.contra;
        linhas.push(`<p class="dica__contra">Contra <b>${esc(c.nome)}</b> (Defesa ${c.defesa}): precisa tirar <b>${c.precisaTirar}+</b> — <b>${c.chance}%</b>${c.vantagem ? ' <em>com vantagem</em>' : ''}</p>`);
      }
      linhas.push(`</div>`);
    }

    if (x.dano) {
      linhas.push(`<div class="dica__bloco"><span class="dica__titulo">Dano${x.dano.golpes > 1 ? ` · ${x.dano.golpes} golpes` : ''}</span>`);
      linhas.push(`<p class="dica__formula">${esc(x.dano.formula)} &nbsp;<span class="dica__medio">médio ${x.dano.medio}</span></p>`);
      linhas.push(this.parcelas(x.dano.parcelas));
      linhas.push(`<p class="dica__faixa">faixa ${x.dano.minimo} a ${x.dano.maximo}</p>`);
      linhas.push(`</div>`);
    }

    if (x.cura) {
      linhas.push(`<div class="dica__bloco"><span class="dica__titulo">Cura</span>`);
      linhas.push(`<p class="dica__formula">${esc(x.cura.formula)} &nbsp;<span class="dica__medio">médio ${x.cura.medio}</span></p>`);
      linhas.push(this.parcelas(x.cura.parcelas));
      linhas.push(`</div>`);
    }

    if (x.efeitos.length) {
      linhas.push(`<div class="dica__bloco"><span class="dica__titulo">Aplica</span><ul class="dica__efeitos">`);
      for (const e of x.efeitos) {
        linhas.push(`<li class="dica__efeito dica__efeito--${e.tipo}">${esc(e.verbo)} <b>${esc(e.nome)}</b> ${esc(e.em)} · ${esc(e.detalhe)}</li>`);
      }
      linhas.push(`</ul></div>`);
    }

    for (const n of x.notas) linhas.push(`<p class="dica__nota">${esc(n)}</p>`);
    return linhas.join('');
  }

  parcelas(lista) {
    return '<ul class="dica__parcelas">' + lista.map((p) =>
      `<li><span>${esc(p.rotulo)}</span><b>${esc(p.valor)}</b></li>`).join('') + '</ul>';
  }

  /* ---- Condição --------------------------------------------------------- */

  deCondicao(id, dados) {
    const x = explicarCondicao(id, dados);
    const partes = [];
    if (x.valor != null) partes.push(`valor <b>${x.valor}</b>`);
    if (x.turnos != null) partes.push(`<b>${x.turnos}</b> turno${x.turnos > 1 ? 's' : ''} restante${x.turnos > 1 ? 's' : ''}`);

    return `<h3 class="dica__nome dica__nome--${x.tipo}">${esc(x.nome)}</h3>` +
      (partes.length ? `<p class="dica__meta">${partes.join(' · ')}</p>` : '') +
      `<p class="dica__regra">${esc(x.regra)}</p>`;
  }

  /* ---- Ficha do inimigo ------------------------------------------------- */

  deInimigo(inim) {
    const x = explicarInimigo(inim);
    const l = [];

    l.push(`<h3 class="dica__nome dica__nome--foe">${esc(x.nome)}</h3>`);
    l.push(`<p class="dica__meta">${esc(x.papel)}${x.chefe ? ' · Chefe' : ''}${
      x.fase ? ` · Fase ${x.fase}` : ''} · ${x.xp} XP</p>`);

    l.push(`<ul class="dica__parcelas dica__parcelas--ficha">
      <li><span>Vida</span><b>${x.pv} / ${x.pvMax}</b></li>
      <li><span>Defesa</span><b>${x.defesa}</b></li>
      <li><span>Bônus de ataque</span><b>+${x.bonusAtaque}</b></li>
      <li><span>Iniciativa</span><b>${x.iniciativa >= 0 ? '+' : ''}${x.iniciativa}</b></li>
    </ul>`);

    if (x.ataques.length) {
      l.push(`<div class="dica__bloco"><span class="dica__titulo">Ações</span><ul class="dica__efeitos">`);
      for (const a of x.ataques) {
        const extra = [
          a.dano, a.efeito, a.recarga,
          a.pronta === true ? 'pronta' : a.pronta === false ? 'recarregando' : null,
          a.usos != null ? `${a.usos} uso(s)` : null,
        ].filter(Boolean).join(' · ');
        l.push(`<li><b>${esc(a.nome)}</b>${extra ? ` — ${esc(extra)}` : ''}</li>`);
      }
      l.push(`</ul></div>`);
    }

    if (x.condicoes.length) {
      l.push(`<div class="dica__bloco"><span class="dica__titulo">Condições</span><ul class="dica__efeitos">`);
      for (const c of x.condicoes) {
        l.push(`<li class="dica__efeito--${c.tipo}"><b>${esc(c.nome)}</b>${
          c.valor != null ? ` ${c.valor}` : ''}${c.turnos != null ? ` · ${c.turnos}t` : ''}</li>`);
      }
      l.push(`</ul></div>`);
    }

    return l.join('');
  }
}

/* ==========================================================================
   Modais de ajuda
   ========================================================================== */

export function ligarModais() {
  const abrir = (id) => {
    const m = document.getElementById(id);
    if (!m) return;
    m.hidden = false;
    m.querySelector('.modal__fechar')?.focus();
  };
  const fechar = (m) => { m.hidden = true; };

  for (const b of document.querySelectorAll('[data-modal]')) {
    b.addEventListener('click', () => abrir(b.dataset.modal));
  }
  for (const m of document.querySelectorAll('.modal')) {
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('.modal__fechar')) fechar(m);
    });
  }
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const m of document.querySelectorAll('.modal:not([hidden])')) fechar(m);
  });
}
