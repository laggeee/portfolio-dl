/* ==========================================================================
   ARENA — sequência do selo e condução do combate.

   O motor resolve o turno inteiro dos inimigos de uma vez. Para o jogador
   conseguir acompanhar, os eventos emitidos durante essa resolução são
   guardados numa fila e reproduzidos com ritmo depois. O estado já é o
   final; o que é encenado é a narrativa até ele.
   ========================================================================== */

import { Combate, criarHeroi, criarInimigo, CONDICOES } from './game/combate.js';
import { CLASSES } from './game/classes.js';
import { encontroDoAndar } from './game/inimigos.js';
import { Hud } from './game/hud.js';
import { Dicas, ligarModais } from './game/dicas.js';
import { explicarCondicao } from './game/explicar.js';
import { novaJornada, carregarJornada, salvarJornada, apagarJornada,
         heroiDaJornada, concluirEncontro, progressoNoNivel } from './game/progressao.js';

(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const espera = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  const NIVEL_ABERTURA = 3;   // medido: no nível 1 quase ninguém tem área

  const CLASS_KITS = {
    guerreiro: 'Machado e força bruta', arcanista: 'Grimório e fogo arcano',
    ladino: 'Adagas e sombra',          clerigo: 'Símbolo sagrado e bênçãos',
    cacador: 'Arco longo e armadilhas', druida: 'Cajado e mudança de forma',
    paladino: 'Escudo e juramento',     bruxo: 'Pacto e preço',
  };

  const seal = document.getElementById('seal');
  const askEl = document.getElementById('sealAsk');
  const chosenEl = document.getElementById('sealChosen');
  const continueBtn = document.getElementById('sealContinue');

  let escolhida = null;
  let combate = null;
  let hud = null;
  let dicas = null;
  let jornada = null;
  let fila = [];
  let ocupado = false;

  window.Grimorio.buildChains(document.getElementById('sealChains'));

  /* ------------------------------------------------------------------
     Escolha de classe
     ------------------------------------------------------------------ */

  askEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick]');
    if (!btn || seal.dataset.phase !== 'sealed') return;

    escolhida = btn.dataset.pick;
    for (const card of askEl.querySelectorAll('.class-card')) {
      const eu = card === btn;
      card.classList.toggle('is-picked', eu);
      card.setAttribute('aria-pressed', String(eu));
    }
    chosenEl.innerHTML = 'Pacto selado como <b>' + CLASSES[escolhida].nome + '</b>';
    continueBtn.disabled = false;
  });

  const ASK_OUT_MS = reduced ? 0 : 440;
  const BREAK_MS = reduced ? 220 : 1250;

  continueBtn?.addEventListener('click', () => {
    if (!escolhida || seal.dataset.phase !== 'sealed') return;

    root.dataset.class = escolhida;
    try { localStorage.setItem('grimorio:arena-classe', escolhida); } catch {}

    continueBtn.disabled = true;
    seal.classList.add('is-dismissing');

    setTimeout(() => {
      seal.dataset.phase = 'breaking';
      setTimeout(() => {
        seal.dataset.phase = 'idle';
        seal.classList.remove('is-dismissing');
        const salva = carregarJornada();
        jornada = (salva && salva.classeId === escolhida) ? salva : novaJornada(escolhida);
        salvarJornada(jornada);
        iniciarCombate();
      }, BREAK_MS);
    }, ASK_OUT_MS);
  });

  /* ------------------------------------------------------------------
     Início do combate
     ------------------------------------------------------------------ */

  function iniciarCombate() {
    const heroi = heroiDaJornada(jornada);
    const inimigos = encontroDoAndar(jornada.andar).map((t, i) => criarInimigo(t, i));

    combate = new Combate({
      heroi, inimigos,
      semente: (Math.random() * 1e9) | 0,
      aoEvento: (e) => fila.push(e),
    });

    hud = new Hud(combate, { aoEscolherAlvo: mirarEm });
    hud.montar();

    if (dicas) dicas.atualizarCombate(combate);
    else { dicas = new Dicas(combate); ligarModais(); preencherModalCondicoes(); }

    document.getElementById('turnKit').textContent = CLASS_KITS[jornada.classeId] ?? '';
    pintarJornada();

    combate.iniciar();
    fila = [];   // a ordem de iniciativa não precisa ser encenada
    hud.linha(`A ordem foi lançada. ${combate.ordem.map((c) => c.nome).join(' · ')}`, 'sys');
    hud.pintar();

    ligarHotbar();
    ligarTeclado();
    seguirAteHeroi();
  }

  /* ------------------------------------------------------------------
     Encenação: drena a fila de eventos com ritmo
     ------------------------------------------------------------------ */

  const TEXTO = {
    dano: (e) => `${e.quem} usa ${e.acao} em ${e.alvo}: ${e.dano}${e.critico ? ' — CRÍTICO!' : ''}`,
    erro: (e) => `${e.quem} erra ${e.acao} contra ${e.alvo}.`,
    cura: (e) => `${e.alvo} recupera ${e.valor} (${e.origem}).`,
    queimadura: (e) => `${e.alvo} queima: ${e.dano}.`,
    sangramento: (e) => `${e.alvo} sangra: ${e.dano}.`,
    autodano: (e) => `${e.quem} paga ${e.dano} de vida.`,
    espinhos: (e) => `${e.alvo} se fere nos espinhos: ${e.dano}.`,
    condicao: (e) => `${e.alvo} recebe ${CONDICOES[e.cond]?.nome ?? e.cond}.`,
    atordoado: (e) => `${e.alvo} está atordoado e perde a ação.`,
    interrompido: (e) => `O golpe de ${e.alvo} foi interrompido!`,
    preparando: (e) => `${e.quem} prepara ${e.acao}. Interrompa!`,
    buff: (e) => `${e.quem} usa ${e.acao}.`,
    invocar: (e) => `${e.quem} invoca ${e.alvo}!`,
    abatido: (e) => `${e.alvo} caiu.`,
    'acao-extra': (e) => `${e.quem} ganha ações extras.`,
    presa: (e) => `${e.quem} abate a presa marcada: Foco recuperado e nova marca liberada.`,
    fase: () => null,
  };

  const RITMO = {
    dano: 620, erro: 480, cura: 520, preparando: 720, invocar: 720,
    abatido: 560, atordoado: 560, interrompido: 700,
  };

  async function encenar() {
    while (fila.length) {
      const e = fila.shift();

      if (e.tipo === 'fim' || e.tipo === 'inicio' || e.tipo === 'foco') continue;

      const texto = TEXTO[e.tipo]?.(e);
      if (texto) hud.linha(texto, e.critico ? 'crit' : e.tipo);

      if (e.tipo === 'dano') {
        const id = idPorNome(e.alvo);
        hud.mostrarDado(e.d20, { critico: e.critico });
        hud.impacto(id, { critico: e.critico });
        hud.flutuar(id, '-' + e.dano, e.critico ? 'crit' : 'dano');
      }
      if (e.tipo === 'erro') {
        const id = idPorNome(e.alvo);
        hud.mostrarDado(e.d20, { falha: e.d20 === 1, precisa: e.defesa - (e.total - e.d20) });
        hud.impacto(id, { errou: true });
        hud.flutuar(id, 'errou', 'erro');
      }
      if (e.tipo === 'cura') hud.flutuar(idPorNome(e.alvo), '+' + e.valor, 'cura');
      if (e.tipo === 'queimadura' || e.tipo === 'sangramento' || e.tipo === 'autodano' || e.tipo === 'espinhos')
        hud.flutuar(idPorNome(e.alvo ?? e.quem), '-' + e.dano, 'dano');

      hud.pintar();
      await espera(RITMO[e.tipo] ?? 260);
    }
  }

  /* O log traz nome, não id — os nomes são únicos por combatente aqui. */
  function idPorNome(nome) {
    return combate.combatentes.find((c) => c.nome === nome)?.id;
  }

  /* ------------------------------------------------------------------
     Laço de turnos
     ------------------------------------------------------------------ */

  async function seguirAteHeroi() {
    ocupado = true;
    hud.pintarHotbar();

    combate.avancarAteHeroi();
    await encenar();

    if (combate.terminado) return encerrar();

    hud.garantirAlvo();
    hud.pintar();
    pintarFase();
    hud.anunciarTurno('Sua vez', `Rodada ${combate.rodada}`);
    hud.linha('Sua vez.', 'sys');
    await espera(reduced ? 0 : 850);
    ocupado = false;
    hud.pintarHotbar();
  }

  async function usar(idAcao, alvoId = null) {
    if (ocupado || combate.terminado) return;
    if (combate.atual !== combate.heroi) return;

    const acao = combate.acoesDisponiveis().find((a) => a.id === idAcao);
    if (!acao?.disponivel) return;

    if (idAcao === 'encerrar') { await passarAVez(); return; }

    // O alvo vem da seleção permanente; se ele caiu, a mira anda sozinha.
    const alvo = acao.alvo === 'inimigo' ? (alvoId ?? hud.garantirAlvo()) : null;

    ocupado = true;
    hud.pintarHotbar();

    // A investida sai ANTES de resolver, para o impacto chegar junto do golpe.
    if (acao.ataque && alvo) {
      const atraso = hud.golpear(combate.heroi.id, alvo);
      await espera(atraso);
    }

    combate.agir(idAcao, alvo);
    await encenar();

    if (combate.terminado) return encerrar();

    hud.garantirAlvo();
    hud.pintar();
    pintarFase();

    if (combate.turnoTerminou) { await passarAVez(); return; }

    ocupado = false;
    hud.pintarHotbar();
  }

  async function passarAVez() {
    ocupado = true;
    combate.encerrarTurno();
    await seguirAteHeroi();
  }

  const NOME_FASE = { acao: 'Ação', extra: 'Ação extra', bonus: 'Ação bônus', fim: '—' };
  function pintarFase() {
    const el = document.getElementById('fase');
    if (el) el.textContent = NOME_FASE[combate.fase] ?? '';
  }

  /* ---- Alvo -------------------------------------------------------------- */

  /* Escolhido ANTES da habilidade e permanente: clicar num inimigo troca a
     mira e a seta acompanha. Nada de escolher a ação para só então
     descobrir em quem ela vai cair. */
  function mirarEm(alvoId) {
    if (!hud) return;
    hud.selecionar(alvoId);
    const alvo = combate.inimigos.find((i) => i.id === alvoId);
    if (alvo) hud.linha(`Mira em ${alvo.nome}.`, 'sys');
  }

  /* ---- Entradas --------------------------------------------------------- */

  function ligarHotbar() {
    document.getElementById('hotbar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-acao]');
      if (b && !b.disabled) usar(b.dataset.acao);
    });
  }

  function ligarTeclado() {
    addEventListener('keydown', (e) => {
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      const b = document.querySelector(`#hotbar li:nth-child(${n}) .ability`);
      if (b && !b.disabled) usar(b.dataset.acao);
    });
  }

  /* ---- Fim -------------------------------------------------------------- */

  function encerrar() {
    ocupado = true;
    hud.pintar();

    const venceu = combate.terminado === 'vitoria';
    const fim = document.getElementById('desfecho');
    const premio = fim.querySelector('.desfecho__premio');

    if (venceu) {
      // Fragmentos e XP são o mesmo número: o Códice paga a dificuldade
      // do encontro uma vez, em duas moedas.
      const ganho = combate.xpGanho();
      const r = concluirEncontro(jornada, {
        xp: ganho, fragmentos: ganho,
        pvFinal: combate.heroi.pv,
        pocoesRestantes: combate.heroi.pocoes,
      });

      hud.linha(`Vitória na rodada ${combate.rodada}. +${ganho} XP, +${ganho} fragmentos.`, 'crit');
      if (r.subiu) hud.linha(`Você alcançou o nível ${r.nivelAgora}.`, 'crit');

      premio.innerHTML =
        `<span class="premio__item"><b>+${r.xpGanho}</b> experiência</span>` +
        `<span class="premio__item"><b>+${r.fragmentosGanhos}</b> fragmentos</span>` +
        (r.subiu
          ? `<span class="premio__nivel">Nível ${r.nivelAntes} → <b>${r.nivelAgora}</b>` +
            (r.ganhoDePv ? ` · +${r.ganhoDePv} PV máximo` : '') +
            (r.habilidadesNovas.length
              ? `<em>Nova habilidade: ${r.habilidadesNovas.join(', ')}</em>` : '') +
            `</span>`
          : `<span class="premio__falta">faltam <b>${r.progresso.faltam}</b> XP para o próximo nível</span>`);

      pintarJornada();
    } else {
      hud.linha(`Você caiu na rodada ${combate.rodada}. A jornada termina aqui.`, 'sys');
      premio.innerHTML =
        `<span class="premio__falta">A jornada chegou ao andar ${jornada.andar} ` +
        `com ${jornada.encontrosVencidos} encontro(s) vencido(s).</span>`;
      apagarJornada();
    }

    fim.hidden = false;
    fim.dataset.resultado = combate.terminado;
    fim.querySelector('.desfecho__titulo').textContent = venceu ? 'Vitória' : 'Derrota';
    fim.querySelector('.desfecho__texto').textContent = venceu
      ? `Os guardiões caíram na rodada ${combate.rodada}.`
      : `O selo se refez. Os guardiões seguem de pé.`;
    fim.querySelector('#reiniciar').textContent = venceu ? 'Próximo encontro' : 'Nova jornada';
  }

  /** Nível, fragmentos e barra de XP no topo da arena. */
  function pintarJornada() {
    const p = progressoNoNivel(jornada.xp);
    document.getElementById('fragmentos').textContent = jornada.fragmentos;
    document.getElementById('nivelJornada').textContent = jornada.nivel;
    document.getElementById('xpBarra').style.setProperty('--xp-fill', (p.fracao * 100).toFixed(1) + '%');
    document.getElementById('xpTexto').textContent =
      p.faltam ? `${p.faltam} XP para o nível ${jornada.nivel + 1}` : 'nível máximo';
    document.getElementById('andar').textContent = jornada.andar;
  }

  document.getElementById('reiniciar')?.addEventListener('click', () => {
    document.getElementById('desfecho').hidden = true;
    document.getElementById('registro').replaceChildren();
    fila = [];
    if (combate.terminado === 'derrota') jornada = novaJornada(jornada.classeId);
    salvarJornada(jornada);
    iniciarCombate();
  });

  /* ------------------------------------------------------------------
     Modal de condições — montado a partir do próprio catálogo do motor,
     para nunca descrever uma condição que deixou de existir.
     ------------------------------------------------------------------ */

  function preencherModalCondicoes() {
    const lista = document.getElementById('listaCondicoes');
    if (!lista) return;
    const ids = ['queimadura','sangramento','vulneravel','marcado','atordoado',
                 'enraizado','defendendo','abencoado','preparando'];
    lista.replaceChildren(...ids.map((id) => {
      const x = explicarCondicao(id, null);
      const li = document.createElement('li');
      li.className = 'modal__cond-item modal__cond-item--' + x.tipo;
      li.innerHTML = `<b>${x.nome}</b><span>${x.regra}</span>`;
      return li;
    }));
  }

  /* ------------------------------------------------------------------
     Rede de segurança
     ------------------------------------------------------------------ */

  setTimeout(() => {
    if (seal.dataset.phase === 'breaking') seal.dataset.phase = 'idle';
  }, 10000);
})();
