/* ==========================================================================
   Roda o simulador e imprime a tabela de balanceamento.

     node tools/simular.mjs               # nivel 1, 1000 encontros
     node tools/simular.mjs --nivel 5
     node tools/simular.mjs --vezes 5000
     node tools/simular.mjs --detalhe bruxo --semente 7
   ========================================================================== */

import { simularTodas, simularEncontro } from '../js/game/simulador.js';

const arg = (nome, padrao) => {
  const i = process.argv.indexOf('--' + nome);
  return i > -1 ? process.argv[i + 1] : padrao;
};

const nivel = Number(arg('nivel', 1));
const vezes = Number(arg('vezes', 1000));
const detalhe = arg('detalhe', null);

if (detalhe) {
  const semente = Number(arg('semente', 1));
  const r = simularEncontro({ classeId: detalhe, nivel, semente });
  console.log(`\n  ${detalhe} · nivel ${nivel} · semente ${semente}\n`);
  for (const e of r.log) {
    const p = (s) => String(s ?? '').padEnd(14);
    if (e.tipo === 'dano')       console.log(`  R${e.rodada} ${p(e.quem)} -> ${p(e.alvo)} ${e.acao}: ${e.dano}${e.critico ? ' CRITICO' : ''} (d20 ${e.d20}, pv ${e.pv})`);
    else if (e.tipo === 'erro')  console.log(`  R${e.rodada} ${p(e.quem)} -> ${p(e.alvo)} ${e.acao}: errou (d20 ${e.d20}, total ${e.total} vs ${e.defesa})`);
    else if (e.tipo === 'cura')  console.log(`  R${e.rodada} ${p(e.alvo)} cura ${e.valor} (${e.origem}, pv ${e.pv})`);
    else if (e.tipo === 'fim')   console.log(`\n  ${e.resultado.toUpperCase()} na rodada ${e.rodada}\n`);
    else                         console.log(`  R${e.rodada} [${e.tipo}] ${JSON.stringify(e).slice(0, 120)}`);
  }
  process.exit(0);
}

const linhas = simularTodas({ nivel, vezes });

const barra = (t) => {
  const n = Math.round(t * 20);
  return '#'.repeat(n).padEnd(20, '.');
};

console.log(`\n  ENCONTRO DE ABERTURA · nivel ${nivel} · ${vezes} simulacoes por classe\n`);
console.log('  classe        PV  DEF   vitoria               rodadas  PV medio  pior');
console.log('  ' + '-'.repeat(76));

for (const l of linhas.sort((a, b) => b.taxaVitoria - a.taxaVitoria)) {
  console.log(
    '  ' + l.nome.padEnd(12) +
    String(l.pvMax).padStart(3) +
    String(l.defesa).padStart(5) + '  ' +
    ((l.taxaVitoria * 100).toFixed(1) + '%').padStart(6) + ' ' + barra(l.taxaVitoria) +
    l.rodadasMedia.toFixed(1).padStart(7) +
    l.pvMedioNaVitoria.toFixed(1).padStart(10) +
    String(l.pvPiorVitoria).padStart(6)
  );
}

const media = linhas.reduce((s, l) => s + l.taxaVitoria, 0) / linhas.length;
const min = Math.min(...linhas.map((l) => l.taxaVitoria));
const max = Math.max(...linhas.map((l) => l.taxaVitoria));
console.log('  ' + '-'.repeat(76));
console.log(`  media ${(media * 100).toFixed(1)}%   ·   amplitude ${(min * 100).toFixed(1)}% a ${(max * 100).toFixed(1)}%   ·   diferenca ${((max - min) * 100).toFixed(1)} pontos\n`);
