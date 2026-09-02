/* Varre combinações de fatores e reporta média, amplitude e duração.
   O alvo: vitória média ~65%, diferença entre classes < 25 pontos,
   e combate entre 8 e 14 rodadas. */
import { BAL, ajustar } from '../js/game/balanceamento.js';
import { simularTodas } from '../js/game/simulador.js';

const nivel = Number(process.argv[process.argv.indexOf('--nivel') + 1] || 3);
const vezes = 200;

console.log(`\n  varredura · nivel ${nivel} · ${vezes} sims por classe\n`);
console.log('  dano  pvInim  danoInim   media  amplitude   dif   rodadas');
console.log('  ' + '-'.repeat(62));

for (const fatorDano of [3, 4]) {
  for (const fatorPvInimigo of [0.7, 0.55, 0.45]) {
    for (const fatorDanoInimigo of [0.8, 0.65, 0.55]) {
      ajustar({ fatorDano, fatorPvInimigo, fatorDanoInimigo });
      const r = simularTodas({ nivel, vezes });
      const taxas = r.map((x) => x.taxaVitoria);
      const media = taxas.reduce((a, b) => a + b, 0) / taxas.length;
      const min = Math.min(...taxas), max = Math.max(...taxas);
      const rod = r.reduce((s, x) => s + x.rodadasMedia, 0) / r.length;
      console.log(
        '  ' + String(fatorDano).padStart(4) +
        String(fatorPvInimigo).padStart(8) +
        String(fatorDanoInimigo).padStart(10) +
        (media * 100).toFixed(0).padStart(8) + '%' +
        `  ${(min * 100).toFixed(0)}-${(max * 100).toFixed(0)}%`.padStart(11) +
        ((max - min) * 100).toFixed(0).padStart(6) +
        rod.toFixed(1).padStart(10));
    }
  }
}
console.log();
