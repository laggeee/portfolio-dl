/* ==========================================================================
   INIMIGOS — Códice da Arena, Capítulos VII e VIII

   Cada um tem UMA função clara, para o jogador priorizar olhando. A IA é
   uma função `decidir` que devolve o id da ação: mantê-la como código (e
   não como tabela de pesos) deixa o comportamento legível, que é o que
   importa num jogo onde o inimigo precisa ser previsível o bastante para
   ser jogado contra.

   LACUNA DO CÓDICE: ele define o dano dos inimigos mas não o bônus de
   ataque deles. Preenchi abaixo mirando ~50% de acerto contra as Defesas
   médias do herói (12 a 17). É o primeiro número a revisar se o combate
   sair fácil ou impossível demais.
   ========================================================================== */

export const INIMIGOS = {

  carcereiro: {
    nome: 'Carcereiro', papel: 'Bruto', pv: 64, defesa: 14, bonusAtaque: 5, iniciativa: 1, xp: 16,
    acoes: {
      corrente: { nome: 'Corrente Pesada', ataque: true, dano: '1d10+4' },
      acorrentar: { nome: 'Acorrentar', ataque: false, recarga: 3,
        efeitos: [{ cond: 'enraizado', turnos: 2, em: 'alvo' }] },
    },
    // Prende assim que puder; no resto do tempo, martela.
    decidir: (eu) => (eu.recargas.acorrentar ?? 0) <= 0 ? 'acorrentar' : 'corrente',
  },

  automato: {
    nome: 'Autômato', papel: 'Artilharia', pv: 47, defesa: 16, bonusAtaque: 4, iniciativa: 0, xp: 12,
    acoes: {
      pistao: { nome: 'Pistão', ataque: true, dano: '1d8+3' },
      sobrecarga: { nome: 'Sobrecarga', ataque: false, recarga: 3,
        especial: 'preparar', danoPreparado: '4d8' },
      descarga: { nome: 'Descarga', ataque: true, dano: '4d8', oculta: true },
    },
    // A razão de ele existir: telegrafa um golpe grande que pode ser
    // interrompido. Se está Preparando, descarrega. Senão, tenta carregar.
    decidir: (eu) => {
      if (eu.condicoes.preparando) return 'descarga';
      if ((eu.recargas.sobrecarga ?? 0) <= 0) return 'sobrecarga';
      return 'pistao';
    },
  },

  vigia: {
    nome: 'Vigia', papel: 'Debuff', pv: 52, defesa: 13, bonusAtaque: 4, iniciativa: 3, xp: 13,
    acoes: {
      lamina: { nome: 'Lâmina Curta', ataque: true, dano: '1d6+3' },
      olhar: { nome: 'Olhar Debilitante', ataque: false,
        efeitos: [{ cond: 'vulneravel', turnos: 2, em: 'alvo' }] },
    },
    // Só reaplica se o alvo estiver limpo — senão gastaria o turno à toa.
    decidir: (eu, estado) => estado.heroi.condicoes.vulneravel ? 'lamina' : 'olhar',
  },

  arauto: {
    nome: 'Arauto', papel: 'Suporte', pv: 58, defesa: 15, bonusAtaque: 4, iniciativa: 2, xp: 15,
    acoes: {
      baculo: { nome: 'Báculo', ataque: true, dano: '1d8+3' },
      cantico: { nome: 'Cântico', ataque: false, especial: 'cantico' },
      chamado: { nome: 'Chamado', ataque: false, especial: 'invocar', usos: 1 },
    },
    decidir: (eu, estado) => {
      if (!estado.canticoAtivo) return 'cantico';
      if ((eu.usos.chamado ?? 0) > 0 && estado.rodada >= 3) return 'chamado';
      return 'baculo';
    },
  },

  imp: {
    nome: 'Imp', papel: 'Invocação', pv: 18, defesa: 13, bonusAtaque: 3, iniciativa: 4, xp: 4,
    acoes: {
      garras: { nome: 'Garras', ataque: true, dano: '1d4+2' },
    },
    decidir: () => 'garras',
  },

  guardiao: {
    /* Um chefe sozinho troca uma ação por uma ação com o herói — troca justa
       que favorece MUITO quem tem 300 PV. Medido: 100% de vitória em 6,7
       rodadas. Ele precisa da massa de um encontro inteiro, e não da de um
       inimigo. Por isso `chefe` também o isenta da escala global de PV. */
    nome: 'Guardião do Selo', papel: 'Chefe', pv: 420, defesa: 16, bonusAtaque: 7, iniciativa: 2, xp: 120,
    chefe: true,
    acoes: {
      elo: { nome: 'Golpe de Elo', ataque: true, dano: '3d8+8' },
      prender: { nome: 'Prender', ataque: false, recarga: 3,
        efeitos: [{ cond: 'enraizado', turnos: 2, em: 'alvo' }] },
      ruptura: { nome: 'Ruptura', ataque: false, especial: 'preparar',
        turnosPreparo: 2, danoPreparado: '8d8' },
      ruptura_desc: { nome: 'Ruptura', ataque: true, dano: '8d8', oculta: true },
    },
    /* Fases por limiar de PV, não por contagem de turnos: assim o ritmo
       responde ao que o jogador está fazendo, em vez de correr num
       relógio paralelo. */
    fase: (eu) => eu.pv > eu.pvMax * 0.66 ? 1 : eu.pv > eu.pvMax * 0.33 ? 2 : 3,
    decidir: (eu) => {
      const fase = eu.pv > eu.pvMax * 0.66 ? 1 : eu.pv > eu.pvMax * 0.33 ? 2 : 3;
      if (fase === 3) {
        if (eu.condicoes.preparando) return 'ruptura_desc';
        if (!eu.marcas.rupturaFeita) return 'ruptura';
        return 'elo';
      }
      if ((eu.recargas.prender ?? 0) <= 0) return 'prender';
      return 'elo';
    },
  },
};

/** O encontro de abertura da Câmara do Selo. */
export const ENCONTRO_ABERTURA = ['carcereiro', 'automato', 'vigia', 'arauto'];

/*
 * O grupo cresce com o andar, e não de uma vez.
 *
 * Medido: quatro inimigos contra um herói de nível 1 dá 35% de vitória —
 * quase nenhuma classe tem habilidade de área antes do nível 3. Começar a
 * jornada com dois e abrir para quatro acompanha o destrave do kit.
 */
export const ANDARES = [
  { ate: 2,        inimigos: ['vigia', 'automato'] },
  { ate: 4,        inimigos: ['vigia', 'automato', 'carcereiro'] },
  { ate: 7,        inimigos: ['carcereiro', 'automato', 'vigia', 'arauto'] },
  { ate: Infinity, inimigos: ['carcereiro', 'carcereiro', 'arauto', 'automato'] },
];

export function encontroDoAndar(andar) {
  return (ANDARES.find((f) => andar <= f.ate) ?? ANDARES.at(-1)).inimigos;
}
