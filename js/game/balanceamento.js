/* ==========================================================================
   BALANCEAMENTO — todos os números de ajuste num lugar só.

   Estes valores NÃO vieram do Códice: vieram de medição. O Códice v0.1
   descreveu as regras, mas suas escalas de PV e dano foram escritas no
   papel e nunca testadas — a primeira simulação deu 0% de vitória nas oito
   classes, com morte na rodada 2.

   Ficam agrupados aqui, e mutáveis, para o simulador poder varrer valores
   sem editar o motor. Quem joga nunca muda nada disto.
   ========================================================================== */

export const BAL = {
  /* O herói enfrenta quatro inimigos sozinho, agindo uma vez para as quatro
     ações deles. Estes dois fatores são a compensação, e são o primeiro
     lugar a olhar quando o jogo ficar fácil ou impossível demais. */
  fatorPv: 8,

  /* Multiplica a QUANTIDADE de dados, não o total: 1d10 vira 2d10. Mantém a
     notação do Códice intacta e estreita a variância, que é a sensação certa
     para quem carrega o combate sozinho. */
  fatorDano: 2.478992,

  /* Escala aplicada ao PV dos inimigos. Serve para encurtar o encontro sem
     mexer nas fichas individuais do Códice. */
  fatorPvInimigo: 0.6,

  /* Escala do dano dos inimigos. */
  fatorDanoInimigo: 1.5,

  /* O dano do herói escala ×4, mas o bônus de ataque ficava no +4 fixo de
     mesa contra inimigos com Defesa 13 a 16 — 40% de erro contra um Imp.
     Este bônus põe o acerto na faixa de 60% a 75%, que é onde um jogo de
     turno precisa estar para o combate não parecer sorteio. */
  bonusAtaqueHeroi: 3,

  /* Poções por encontro. */
  pocoes: 2,
};

/** Aplica um conjunto de ajustes. Usado só pelo simulador. */
export function ajustar(mudancas) {
  Object.assign(BAL, mudancas);
  return BAL;
}
