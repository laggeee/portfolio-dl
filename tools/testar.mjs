/* Provas de que o motor implementa o Códice. Cada teste cita o capítulo. */
import { criarHeroi, criarInimigo, Combate, aplicarDano, modificador, defesaDe } from '../js/game/combate.js';

let ok = 0, falhou = 0;
const teste = (nome, fn) => {
  try { fn(); console.log('  ok    ' + nome); ok++; }
  catch (e) { console.log('  FALHA ' + nome + '\n        ' + e.message); falhou++; }
};
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg}: esperado ${b}, veio ${a}`); };

console.log('\n  Motor vs Códice\n');

teste('Cap. II — modificador = floor((valor-10)/2)', () => {
  eq(modificador(15), 2, '15'); eq(modificador(8), -1, '8'); eq(modificador(10), 0, '10');
});

teste('Cap. IV — Vulnerável multiplica por 1,5 arredondando para baixo', () => {
  const alvo = criarInimigo('imp');
  alvo.condicoes.vulneravel = { turnos: 2 };
  eq(aplicarDano(alvo, 7), 10, '7 vulnerável');   // 10.5 -> 10
});

teste('Cap. IV — Defendendo subtrai 2 DEPOIS do Vulnerável', () => {
  const alvo = criarInimigo('imp');
  alvo.condicoes.vulneravel = { turnos: 2 };
  alvo.condicoes.defendendo = { turnos: 1 };
  eq(aplicarDano(alvo, 10), 13, 'ordem');          // 10*1.5=15, -2 = 13
});

teste('Cap. IV — piso de 1 de dano', () => {
  const alvo = criarInimigo('imp');
  alvo.condicoes.defendendo = { turnos: 1 };
  eq(aplicarDano(alvo, 1), 1, 'piso');
});

teste('Cap. V — Atordoado faz perder exatamente UM turno', () => {
  const h = criarHeroi('guerreiro', 3);
  const inim = criarInimigo('imp');
  const c = new Combate({ heroi: h, inimigos: [inim], semente: 5 });
  c.iniciar();
  inim.condicoes.atordoado = { turnos: 1, nova: true };
  const antes = h.pv;
  // roda duas rodadas do imp
  for (let i = 0; i < 40 && !c.terminado; i++) c.passar();
  if (h.pv === antes) throw new Error('o imp nunca atacou — perdeu mais de um turno');
});

teste('Cap. V — Atordoado cancela Preparando', () => {
  const h = criarHeroi('guerreiro', 3);
  const aut = criarInimigo('automato');
  const c = new Combate({ heroi: h, inimigos: [aut], semente: 9 });
  c.iniciar();
  aut.condicoes.preparando = { turnos: 1 };
  aut.preparado = '4d8';
  aut.condicoes.atordoado = { turnos: 1, nova: true };
  c.indice = c.ordem.indexOf(aut);
  c.abrirTurno();
  if (aut.condicoes.preparando) throw new Error('Preparando sobreviveu ao Atordoado');
});

teste('Cap. II — Defesa = 10 + mod DES + armadura', () => {
  eq(defesaDe(criarHeroi('paladino', 1)), 17, 'paladino');
  eq(defesaDe(criarHeroi('ladino', 1)), 15, 'ladino');
});

teste('Cap. II — Defendendo soma +3 de Defesa', () => {
  const h = criarHeroi('ladino', 1);
  const base = defesaDe(h);
  h.condicoes.defendendo = { turnos: 1 };
  eq(defesaDe(h), base + 3, 'defendendo');
});

teste('Cap. II — ataque básico que acerta gera Foco', () => {
  const h = criarHeroi('guerreiro', 1);
  const inim = criarInimigo('imp');
  const c = new Combate({ heroi: h, inimigos: [inim], semente: 2 });
  c.iniciar();
  h.foco = 0;
  c.indice = c.ordem.indexOf(h);
  for (let i = 0; i < 12; i++) {
    const antes = h.foco;
    const r = c.agir('machado', inim.id);
    if (r?.resultados?.[0]?.acertou) {
      if (h.foco <= antes) throw new Error('acertou e não gerou Foco');
      return;
    }
    inim.pv = inim.pvMax; inim.vivo = true;
  }
  throw new Error('nenhum acerto em 12 tentativas');
});

teste('Cap. II — Defender gera Foco', () => {
  const h = criarHeroi('guerreiro', 1);
  const c = new Combate({ heroi: h, inimigos: [criarInimigo('imp')], semente: 3 });
  c.iniciar();
  h.foco = 1;
  c.agir('defender');
  eq(h.foco, 2, 'foco após defender');
  if (!h.condicoes.defendendo) throw new Error('Defender não aplicou a condição');
});

teste('Determinismo — mesma semente, mesmo combate', () => {
  const rodar = () => {
    const c = new Combate({ heroi: criarHeroi('bruxo', 3), inimigos: [criarInimigo('vigia')], semente: 42 });
    c.iniciar();
    for (let i = 0; i < 30 && !c.terminado; i++) { c.avancarAteHeroi(); if (!c.terminado) { c.agir('rajada'); c.encerrarTurno(); } }
    return JSON.stringify(c.log);
  };
  eq(rodar(), rodar(), 'logs divergiram');
});

console.log(`\n  ${ok} passaram, ${falhou} falharam\n`);
process.exit(falhou ? 1 : 0);
