/* ==========================================================================
   AS OITO CLASSES — Códice da Arena, Capítulo VI

   Habilidade é DADO, não código. O motor lê estes campos e resolve; o HUD
   lê os mesmos campos para desenhar custo, alvo e descrição. Os poucos
   casos que não cabem no formato têm um `especial`, resolvido num switch
   em combate.js — um DSL completo seria mais caro que os oito casos.

   armadura: escolhida para bater a Defesa do Códice, já que
   Defesa = 10 + mod DES + armadura.
   ========================================================================== */

/** alvo: 'inimigo' | 'todos-inimigos' | 'proprio' */

export const CLASSES = {

  guerreiro: {
    nome: 'Guerreiro', chave: 'FOR', dadoVida: 12, armadura: 5,
    atributos: { FOR: 15, DES: 12, CON: 14, INT: 8, SAB: 13, CAR: 10 },
    habilidades: [
      { id: 'machado', nome: 'Machado', nivel: 1, custo: 0, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '1d10' },
      { id: 'estilhacante', nome: 'Golpe Estilhaçante', nivel: 1, custo: 2, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '2d10',
        efeitos: [{ cond: 'vulneravel', turnos: 2, em: 'alvo' }] },
      { id: 'varredura', nome: 'Varredura', nivel: 3, custo: 3, tipo: 'acao',
        alvo: 'todos-inimigos', ataque: true, dano: '1d10' },
      { id: 'bastiao', nome: 'Último Bastião', nivel: 5, custo: 4, tipo: 'acao',
        alvo: 'proprio', cura: '3d10', usaChaveNaCura: false,
        efeitos: [{ cond: 'defendendo', turnos: 2, em: 'proprio' }] },
    ],
  },

  arcanista: {
    nome: 'Arcanista', chave: 'INT', dadoVida: 6, armadura: 2,
    atributos: { FOR: 8, DES: 14, CON: 13, INT: 15, SAB: 12, CAR: 10 },
    habilidades: [
      { id: 'dardo', nome: 'Dardo Arcano', nivel: 1, custo: 0, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '1d8' },
      { id: 'raio', nome: 'Raio Perfurante', nivel: 1, custo: 2, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '4d6' },
      { id: 'bola-de-fogo', nome: 'Bola de Fogo', nivel: 3, custo: 3, tipo: 'acao',
        alvo: 'todos-inimigos', ataque: true, dano: '3d6',
        efeitos: [{ cond: 'queimadura', valor: 3, em: 'alvo' }] },
      { id: 'fenda', nome: 'Fenda Temporal', nivel: 5, custo: 4, tipo: 'acao',
        alvo: 'todos-inimigos', ataque: false,
        efeitos: [{ cond: 'atordoado', turnos: 1, em: 'alvo' }] },
    ],
  },

  ladino: {
    nome: 'Ladino', chave: 'DES', dadoVida: 10, armadura: 3,
    atributos: { FOR: 8, DES: 15, CON: 13, INT: 14, SAB: 10, CAR: 12 },
    habilidades: [
      { id: 'adagas', nome: 'Adagas Gêmeas', nivel: 1, custo: 0, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '1d6', especial: 'ataque-duplo' },
      { id: 'corte', nome: 'Corte Profundo', nivel: 1, custo: 2, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '2d6',
        efeitos: [{ cond: 'sangramento', valor: 4, turnos: 3, em: 'alvo' }] },
      { id: 'furtivo', nome: 'Ataque Furtivo', nivel: 5, custo: 2, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '3d6', especial: 'critico-19' },
      { id: 'sombra-dupla', nome: 'Sombra Dupla', nivel: 3, custo: 4, tipo: 'acao',
        alvo: 'proprio', especial: 'acao-extra' },   // concede 2 Ações extras
    ],
  },

  clerigo: {
    nome: 'Clérigo', chave: 'SAB', dadoVida: 8, armadura: 7,
    atributos: { FOR: 12, DES: 8, CON: 14, INT: 10, SAB: 15, CAR: 13 },
    habilidades: [
      { id: 'maca', nome: 'Maça Sagrada', nivel: 1, custo: 0, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '1d10' },
      { id: 'luz-curativa', nome: 'Luz Curativa', nivel: 1, custo: 2, tipo: 'acao',
        alvo: 'proprio', cura: '2d8', usaChaveNaCura: true },
      { id: 'bencao', nome: 'Bênção', nivel: 5, custo: 2, tipo: 'acao',
        alvo: 'proprio',
        efeitos: [{ cond: 'abencoado', turnos: 3, em: 'proprio' }] },
      { id: 'julgamento', nome: 'Julgamento', nivel: 3, custo: 3, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '4d8', especial: 'dobra-se-vulneravel' },
    ],
  },

  cacador: {
    nome: 'Caçador', chave: 'DES', dadoVida: 10, armadura: 2,
    atributos: { FOR: 10, DES: 15, CON: 13, INT: 12, SAB: 14, CAR: 8 },
    habilidades: [
      { id: 'tiro-certeiro', nome: 'Tiro Certeiro', nivel: 1, custo: 0, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '1d10' },
      { id: 'marca', nome: 'Marca do Caçador', nivel: 1, custo: 1, tipo: 'bonus',
        alvo: 'inimigo', ataque: false,
        efeitos: [{ cond: 'marcado', turnos: 3, em: 'alvo' }] },
      { id: 'chuva', nome: 'Chuva de Flechas', nivel: 3, custo: 3, tipo: 'acao',
        alvo: 'todos-inimigos', ataque: true, dano: '1d8' },
      { id: 'perfurante', nome: 'Tiro Perfurante', nivel: 5, custo: 3, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '5d10', especial: 'exige-marcado' },
    ],
  },

  druida: {
    nome: 'Druida', chave: 'SAB', dadoVida: 10, armadura: 3,
    atributos: { FOR: 8, DES: 13, CON: 14, INT: 12, SAB: 15, CAR: 10 },
    habilidades: [
      { id: 'cajado', nome: 'Cajado', nivel: 1, custo: 0, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '1d8' },
      { id: 'raizes', nome: 'Raízes Famintas', nivel: 1, custo: 2, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '3d6',
        efeitos: [{ cond: 'enraizado', turnos: 2, em: 'alvo' }] },
      { id: 'renovar', nome: 'Renovar', nivel: 5, custo: 3, tipo: 'acao',
        alvo: 'proprio', especial: 'regeneracao' },
      { id: 'forma-fera', nome: 'Forma de Fera', nivel: 3, custo: 2, tipo: 'acao',
        alvo: 'proprio', especial: 'forma-fera' },
    ],
  },

  paladino: {
    nome: 'Paladino', chave: 'CAR', dadoVida: 12, armadura: 7,
    atributos: { FOR: 14, DES: 10, CON: 13, INT: 8, SAB: 12, CAR: 15 },
    habilidades: [
      { id: 'espada', nome: 'Espada Sagrada', nivel: 1, custo: 0, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '1d10' },
      { id: 'punicao', nome: 'Punição Divina', nivel: 1, custo: 2, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '1d10', danoExtra: '3d8' },
      { id: 'escudo-juramento', nome: 'Escudo de Juramento', nivel: 3, custo: 2, tipo: 'acao',
        alvo: 'proprio', especial: 'espinhos',
        efeitos: [{ cond: 'defendendo', turnos: 3, em: 'proprio' }] },
      { id: 'brado', nome: 'Brado Consagrado', nivel: 5, custo: 4, tipo: 'acao',
        alvo: 'todos-inimigos', ataque: true, dano: '2d8',
        efeitos: [{ cond: 'atordoado', turnos: 1, em: 'alvo' }] },
    ],
  },

  bruxo: {
    nome: 'Bruxo', chave: 'CAR', dadoVida: 8, armadura: 2,
    atributos: { FOR: 8, DES: 12, CON: 14, INT: 13, SAB: 10, CAR: 15 },
    habilidades: [
      { id: 'rajada', nome: 'Rajada Mística', nivel: 1, custo: 0, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '1d10', especial: 'ataque-duplo' },
      { id: 'toque-pacto', nome: 'Toque do Pacto', nivel: 1, custo: 2, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '4d6', especial: 'custo-vida' },
      { id: 'fome', nome: 'Fome do Patrono', nivel: 3, custo: 3, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '3d8', especial: 'roubo-vida' },
      { id: 'preco', nome: 'Preço Cobrado', nivel: 5, custo: 4, tipo: 'acao',
        alvo: 'inimigo', ataque: true, dano: '6d6',
        efeitos: [{ cond: 'vulneravel', turnos: 2, em: 'proprio' }] },
    ],
  },
};

/** Tabela de progressão — Capítulo IX. */
export const NIVEIS = [
  { nivel: 1,  xp: 0,    proficiencia: 2 },
  { nivel: 2,  xp: 30,   proficiencia: 2 },
  { nivel: 3,  xp: 75,   proficiencia: 2 },
  { nivel: 4,  xp: 140,  proficiencia: 2 },
  { nivel: 5,  xp: 230,  proficiencia: 3 },
  { nivel: 6,  xp: 350,  proficiencia: 3 },
  { nivel: 7,  xp: 500,  proficiencia: 3 },
  { nivel: 8,  xp: 700,  proficiencia: 3 },
  { nivel: 9,  xp: 950,  proficiencia: 4 },
  { nivel: 10, xp: 1250, proficiencia: 4 },
];

export const IDS_CLASSES = Object.keys(CLASSES);
