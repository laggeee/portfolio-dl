/* ==========================================================================
   HUD — desenha o estado do combate na tela.

   Só lê o estado; nunca decide nada. Toda regra vive em combate.js, e é
   por isso que o simulador pode balancear o jogo sem abrir o navegador.
   ========================================================================== */

import { defesaDe, CONDICOES, modificador } from './combate.js';
import { BAL } from './balanceamento.js';

/* Cada inimigo herda um dos sigilos já embutidos no arena.html */
const SIGILO_INIMIGO = {
  carcereiro: 'sig-foe-c', automato: 'sig-foe-b',
  vigia: 'sig-foe-a', arauto: 'sig-foe-d',
  imp: 'sig-foe-a', guardiao: 'sig-foe-b',
};

const PIP = {
  queimadura: 'i-st-queimadura',
  sangramento: 'i-st-sangramento',
  vulneravel: 'i-st-vulneravel',
};

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const svg = (id, box = '0 0 512 512') =>
  `<svg viewBox="${box}" aria-hidden="true"><use href="#${id}"/></svg>`;

export class Hud {
  constructor(combate, { aoEscolherAlvo } = {}) {
    this.combate = combate;
    this.aoEscolherAlvo = aoEscolherAlvo;
    this.alvoSelecionado = null;

    this.ladoHeroi = document.getElementById('ladoHeroi');
    this.ladoInimigos = document.getElementById('ladoInimigos');
    this.retratos = document.getElementById('retratos');
    this.hotbar = document.getElementById('hotbar');
    this.efeitos = document.getElementById('efeitos');
    this.registro = document.getElementById('registro');
    this.rodada = document.getElementById('roundNum');
    this.turnName = document.getElementById('turnName');
    this.turnKit = document.getElementById('turnKit');
    this.foco = document.getElementById('foco');
    this.pocoes = document.getElementById('pocoes');
  }

  /* ---- Combatentes ------------------------------------------------------ */

  criarToken(c) {
    const li = el('li', 'token' + (c.lado === 'inimigo' ? ' token--foe' : ''));
    li.dataset.id = c.id;

    const sigilo = c.lado === 'heroi'
      ? 'sig-' + c.classeId
      : (SIGILO_INIMIGO[c.tipoId] ?? 'sig-foe-a');

    li.innerHTML =
      (c.lado === 'inimigo'
        ? `<span class="token__seta" aria-hidden="true">
             <svg viewBox="0 0 24 16"><path d="M12 16 2 2h20z" fill="currentColor"/></svg>
           </span>
           <span class="token__ca" aria-hidden="true"></span>` : '') +
      `<div class="token__body">${svg(sigilo)}</div>` +
      `<div class="token__gauge">` +
        `<div class="token__bar"><i></i><span></span></div>` +
        `<div class="token__pips"></div>` +
      `</div>` +
      `<span class="token__name">${c.nome}</span>`;

    if (c.lado === 'inimigo') {
      li.addEventListener('click', () => {
        if (!c.vivo) return;
        this.aoEscolherAlvo?.(c.id);
      });
    }
    return li;
  }

  montar() {
    this.ladoHeroi.replaceChildren(this.criarToken(this.combate.heroi));
    this.ladoInimigos.replaceChildren(
      ...this.combate.inimigos.map((i) => this.criarToken(i)));
    this.pintar();
  }

  /** Reconstrói se o elenco mudou (o Arauto invoca um Imp no meio da luta). */
  sincronizarElenco() {
    const naTela = new Set([...this.ladoInimigos.children].map((n) => n.dataset.id));
    for (const i of this.combate.inimigos) {
      if (!naTela.has(i.id)) this.ladoInimigos.append(this.criarToken(i));
    }
  }

  /* ---- Pintura ---------------------------------------------------------- */

  pintar() {
    this.sincronizarElenco();
    this.pintarCombatentes();
    this.pintarRetratos();
    this.pintarHotbar();
    this.pintarEfeitos();

    const h = this.combate.heroi;
    this.rodada.textContent = this.combate.rodada;
    this.turnName.textContent = h.nome;
    this.turnKit.textContent = `Defesa ${defesaDe(h)} · nível ${h.nivel}`;
    this.pintarFoco();
  }

  pintarCombatentes() {
    for (const c of this.combate.combatentes) {
      const no = document.querySelector(`.token[data-id="${c.id}"]`);
      if (!no) continue;

      no.classList.toggle('is-morto', !c.vivo);
      no.classList.toggle('is-active', this.combate.atual === c && c.vivo);
      no.classList.toggle('is-preparando', !!c.condicoes.preparando);
      no.classList.toggle('is-selecionado', c.id === this.alvoSelecionado);

      // "precisa tirar X+": a conta que decide o turno, à vista
      const ca = no.querySelector('.token__ca');
      if (ca && c.lado === 'inimigo') {
        const h = this.combate.heroi;
        const bonus = modificador(h.atributos[h.chave]) + h.proficiencia + BAL.bonusAtaqueHeroi;
        const precisa = Math.max(2, defesaDe(c) - bonus);
        ca.textContent = precisa + '+';
        ca.classList.toggle('is-facil', precisa <= 8);
        ca.classList.toggle('is-dificil', precisa >= 13);
      }

      const pct = Math.max(0, (c.pv / c.pvMax) * 100);
      no.querySelector('.token__bar i').style.setProperty('--hp-fill', pct + '%');
      no.querySelector('.token__bar span').innerHTML =
        `${c.pv}<small>/${c.pvMax}</small>`;

      const pips = no.querySelector('.token__pips');
      pips.replaceChildren(...this.criarPips(c));
    }
  }

  criarPips(c) {
    return Object.entries(c.condicoes).map(([id, dados]) => {
      const meta = CONDICOES[id];
      const p = el('span', 'pip pip--' + id);
      p.title = meta?.nome ?? id;
      const icone = PIP[id];
      p.innerHTML = (icone ? svg(icone) : '') +
        (dados.valor ?? dados.turnos ?? '');
      return p;
    });
  }

  pintarRetratos() {
    const todos = [this.combate.heroi, ...this.combate.inimigos];
    this.retratos.replaceChildren(...todos.map((c) => {
      const li = el('li', 'portrait' +
        (c.lado === 'inimigo' ? ' portrait--foe' : '') +
        (this.combate.atual === c ? ' is-active' : '') +
        (!c.vivo ? ' is-morto' : ''));
      const sigilo = c.lado === 'heroi'
        ? 'sig-' + c.classeId : (SIGILO_INIMIGO[c.tipoId] ?? 'sig-foe-a');
      li.innerHTML =
        `<span class="portrait__face">${svg(sigilo)}</span>` +
        `<span class="portrait__hp"><i style="--hp-fill:${(c.pv / c.pvMax) * 100}%"></i></span>` +
        `<span class="portrait__name">${c.nome}</span>`;
      return li;
    }));
  }

  pintarFoco() {
    const h = this.combate.heroi;
    this.foco.replaceChildren(...Array.from({ length: h.focoMax }, (_, i) =>
      el('i', 'foco__pip' + (i < h.foco ? ' is-cheio' : ''))));
    this.pocoes.textContent = h.pocoes;
  }

  pintarHotbar() {
    const acoes = this.combate.acoesDisponiveis();
    const emTurno = this.combate.atual === this.combate.heroi && !this.combate.terminado;

    this.hotbar.replaceChildren(...acoes.map((a, i) => {
      const li = el('li');
      const b = el('button', 'ability');
      b.type = 'button';
      b.dataset.acao = a.id;
      b.disabled = !a.disponivel || !emTurno;
      b.title = a.motivo
        ? `${a.nome} — ${a.motivo}`
        : `${a.nome}${a.custo ? ` — ${a.custo} Foco` : ''}`;

      const icone = ICONE_ACAO[a.id] ?? 'i-act-1';
      b.innerHTML =
        `<span class="ability__key">${i + 1}</span>` + svg(icone) +
        (a.custo ? `<span class="ability__custo">${a.custo}</span>` : '');
      li.append(b);
      return li;
    }));
  }

  pintarEfeitos() {
    const h = this.combate.heroi;
    const linhas = Object.entries(h.condicoes);
    if (!linhas.length) {
      this.efeitos.replaceChildren(
        el('li', 'effects__title', 'Efeitos ativos'),
        el('li', 'effects__vazio', 'nenhum'));
      return;
    }
    this.efeitos.replaceChildren(
      el('li', 'effects__title', 'Efeitos ativos'),
      ...linhas.map(([id, d]) => {
        const meta = CONDICOES[id];
        const li = el('li', `effect effect--${id} effect--${meta?.tipo ?? 'ruim'}`);
        li.innerHTML =
          `<span class="effect__icon">${PIP[id] ? svg(PIP[id]) : ''}</span>` +
          `<span class="effect__num">${d.valor ?? d.turnos ?? ''}</span>` +
          `<span class="effect__name">${meta?.nome ?? id}</span>` +
          `<span class="effect__turns">${d.turnos === Infinity ? '' :
            (d.turnos ?? 1) + (d.turnos === 1 ? ' turno' : ' turnos')}</span>`;
        return li;
      }));
  }

  /* ---- Registro --------------------------------------------------------- */

  linha(texto, tipo = '') {
    const li = el('li', 'registro__linha' + (tipo ? ' registro__linha--' + tipo : ''), texto);
    this.registro.append(li);
    this.registro.scrollTop = this.registro.scrollHeight;
    while (this.registro.children.length > 60) this.registro.firstChild.remove();
    return li;
  }

  /* ---- Alvos ------------------------------------------------------------ */

  /** O alvo fica escolhido ANTES da habilidade, e continua escolhido. */
  selecionar(id) {
    const alvo = this.combate.inimigos.find((i) => i.id === id);
    this.alvoSelecionado = alvo?.vivo ? id : null;
    this.pintarCombatentes();
    return this.alvoSelecionado;
  }

  /** Se o alvo morreu, passa a mira para o próximo vivo. */
  garantirAlvo() {
    const atual = this.combate.inimigos.find((i) => i.id === this.alvoSelecionado);
    if (atual?.vivo) return this.alvoSelecionado;
    return this.selecionar(this.combate.inimigosVivos[0]?.id ?? null);
  }

  /* ---- Números que sobem ------------------------------------------------ */

  flutuar(idAlvo, texto, tipo = 'dano') {
    const no = document.querySelector(`.token[data-id="${idAlvo}"]`);
    if (!no) return;
    const f = el('span', 'flutuante flutuante--' + tipo, texto);
    no.append(f);
    f.addEventListener('animationend', () => f.remove(), { once: true });
    no.classList.add('is-atingido');
    setTimeout(() => no.classList.remove('is-atingido'), 320);
  }

  /* ---- O golpe ----------------------------------------------------------- */

  /**
   * Avança o atacante até o alvo e volta.
   *
   * A distância é medida na hora: os combatentes mudam de posição quando
   * alguém cai, então um deslocamento fixo erraria o alvo. O movimento é
   * só transform, que o compositor resolve sem repintar nada.
   */
  golpear(idAtacante, idAlvo) {
    const a = document.querySelector(`.token[data-id="${idAtacante}"]`);
    const b = document.querySelector(`.token[data-id="${idAlvo}"]`);
    if (!a || !b) return 0;

    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const dx = (rb.left + rb.width / 2) - (ra.left + ra.width / 2);
    const dy = (rb.top + rb.height / 2) - (ra.top + ra.height / 2);

    // para antes de encostar: 62% do caminho lê como investida, 100% como sobreposição
    a.style.setProperty('--golpe-x', (dx * 0.62).toFixed(0) + 'px');
    a.style.setProperty('--golpe-y', (dy * 0.62).toFixed(0) + 'px');
    a.classList.remove('is-golpeando');
    void a.offsetWidth;
    a.classList.add('is-golpeando');
    a.addEventListener('animationend', () => a.classList.remove('is-golpeando'), { once: true });
    return 260;   // quando o impacto deve aparecer
  }

  /** Estrela de impacto sobre o alvo. */
  impacto(idAlvo, { critico = false, errou = false } = {}) {
    const no = document.querySelector(`.token[data-id="${idAlvo}"]`);
    if (!no) return;

    const marca = el('span', 'impacto' +
      (critico ? ' impacto--crit' : '') + (errou ? ' impacto--erro' : ''));
    marca.innerHTML = errou
      ? `<svg viewBox="0 0 64 64" aria-hidden="true">
           <path d="M14 14 50 50M50 14 14 50" stroke="currentColor" stroke-width="5"
                 stroke-linecap="round" fill="none"/>
         </svg>`
      : `<svg viewBox="0 0 64 64" aria-hidden="true">
           <path d="M32 2l7 19 19-7-11 18 15 12-19 3 4 19-15-13-15 13 4-19-19-3 15-12-11-18 19 7z"
                 fill="currentColor"/>
           <path d="M32 16v32M16 32h32" stroke="#000" stroke-width="3" opacity=".35"/>
         </svg>`;
    no.append(marca);
    marca.addEventListener('animationend', () => marca.remove(), { once: true });
  }

  /* ---- O dado ------------------------------------------------------------ */

  /** Mostra a rolagem no canto: o número que decidiu o golpe. */
  mostrarDado(valor, { critico = false, falha = false, precisa = null } = {}) {
    const caixa = document.getElementById('dado');
    if (!caixa) return;
    caixa.hidden = false;
    caixa.className = 'dado' + (critico ? ' is-crit' : '') + (falha ? ' is-falha' : '');
    caixa.querySelector('.dado__valor').textContent = valor;
    caixa.querySelector('.dado__alvo').textContent =
      precisa != null ? `precisava ${precisa}+` : '';
    caixa.classList.remove('is-rolando');
    void caixa.offsetWidth;
    caixa.classList.add('is-rolando');
  }

  /* ---- Aviso de turno ---------------------------------------------------- */

  anunciarTurno(texto, sub = '') {
    const av = document.getElementById('aviso');
    if (!av) return;
    av.querySelector('.aviso__texto').textContent = texto;
    av.querySelector('.aviso__sub').textContent = sub;
    av.hidden = false;
    av.classList.remove('is-entrando');
    void av.offsetWidth;
    av.classList.add('is-entrando');
    av.addEventListener('animationend', () => { av.hidden = true; }, { once: true });
  }
}

/* Ação -> ícone já embutido no arena.html */
const ICONE_ACAO = {
  machado: 'i-act-1', estilhacante: 'i-act-1', varredura: 'i-act-1',
  dardo: 'i-act-2', raio: 'i-act-2', 'bola-de-fogo': 'i-act-2', fenda: 'i-act-8',
  adagas: 'i-act-1', corte: 'i-act-3', furtivo: 'i-act-3', 'sombra-dupla': 'i-act-8',
  maca: 'i-act-1', 'luz-curativa': 'i-act-5', bencao: 'i-act-5', julgamento: 'i-act-8',
  'tiro-certeiro': 'i-act-6', marca: 'i-act-6', chuva: 'i-act-6', perfurante: 'i-act-6',
  cajado: 'i-act-2', raizes: 'i-act-3', renovar: 'i-act-5', 'forma-fera': 'i-act-8',
  espada: 'i-act-1', punicao: 'i-act-2', 'escudo-juramento': 'i-act-4', brado: 'i-act-8',
  rajada: 'i-act-2', 'toque-pacto': 'i-act-3', fome: 'i-act-3', preco: 'i-act-8',
  defender: 'i-act-4', pocao: 'i-act-5', bastiao: 'i-act-4',
};
