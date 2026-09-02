/* ==========================================================================
   EXPLICAR — decompõe as contas do combate em partes legíveis.

   Mora junto do motor de propósito: só ele sabe de onde vem cada parcela.
   Se a regra mudar em combate.js e a explicação ficar para trás, o jogador
   passa a ler uma mentira — então as duas leem as mesmas constantes.
   ========================================================================== */

import { modificador, defesaDe, CONDICOES } from './combate.js';
import { BAL } from './balanceamento.js';
import { lerNotacao } from './dados.js';
import { INIMIGOS } from './inimigos.js';

const ALVO_TEXTO = {
  'inimigo': 'Um inimigo',
  'todos-inimigos': 'Todos os inimigos',
  'proprio': 'Você',
};

const media = (notacao) => {
  const { quantidade, faces, bonus } = lerNotacao(notacao);
  return quantidade * (faces + 1) / 2 + bonus;
};

const faixa = (notacao, vezes) => {
  const { quantidade, faces, bonus } = lerNotacao(notacao);
  const n = quantidade * vezes;
  return [n + bonus, n * faces + bonus];
};

/* --------------------------------------------------------------------------
   Uma ação do herói
   -------------------------------------------------------------------------- */

export function explicarAcao(combate, acao, alvo = null) {
  const h = combate.heroi;
  const modAtr = modificador(h.atributos[h.chave]);
  const escala = BAL.fatorDano;

  const exp = {
    nome: acao.nome,
    custo: acao.custo ?? 0,
    tipo: acao.tipo === 'bonus' ? 'Ação bônus' : 'Ação',
    alvo: ALVO_TEXTO[acao.alvo] ?? '—',
    parcelas: [],
    notas: [],
  };

  /* ---- Teste de ataque ---- */
  if (acao.ataque) {
    const bonus = modAtr + h.proficiencia;
    exp.ataque = {
      formula: `d20 +${modAtr} +${h.proficiencia}`,
      parcelas: [
        { rotulo: `Modificador de ${h.chave}`, valor: `+${modAtr}` },
        { rotulo: 'Proficiência', valor: `+${h.proficiencia}` },
      ],
      total: bonus,
    };
    if (h.condicoes.abencoado) {
      exp.ataque.parcelas.push({ rotulo: 'Abençoado', valor: '+1d4' });
      exp.ataque.formula += ' +1d4';
    }

    if (alvo) {
      const def = defesaDe(alvo);
      const precisa = Math.max(2, def - bonus);
      let chance = Math.max(0, Math.min(100, (21 - precisa) * 5));
      const comVantagem = !!alvo.condicoes.marcado;
      if (comVantagem) chance = Math.round((1 - (1 - chance / 100) ** 2) * 100);
      exp.ataque.contra = {
        nome: alvo.nome,
        defesa: def,
        precisaTirar: precisa,
        chance: Math.round(chance),
        vantagem: comVantagem,
      };
    }
  }

  /* ---- Dano ---- */
  if (acao.dano) {
    const vezes = acao.especial === 'ataque-duplo' ? 2 : 1;
    const { quantidade, faces } = lerNotacao(acao.dano);
    const dadosFinais = quantidade * escala;

    const parcelas = [
      { rotulo: 'Dados da habilidade', valor: acao.dano },
      { rotulo: `Escala do herói (×${escala})`, valor: `${dadosFinais}d${faces}` },
      { rotulo: `Modificador de ${h.chave}`, valor: `+${modAtr}` },
    ];
    if (acao.danoExtra) parcelas.push({ rotulo: 'Dano extra', valor: `+${acao.danoExtra} (×${escala})` });

    const [min, max] = faixa(acao.dano, escala);
    let medio = media(acao.dano) * escala + modAtr;
    if (acao.danoExtra) medio += media(acao.danoExtra) * escala;

    exp.dano = {
      formula: `${dadosFinais}d${faces} +${modAtr}`,
      parcelas,
      medio: Math.round(medio * vezes),
      minimo: (min + modAtr) * vezes,
      maximo: (max + modAtr) * vezes,
      golpes: vezes,
    };

    if (alvo?.condicoes.vulneravel) {
      exp.dano.parcelas.push({ rotulo: 'Alvo Vulnerável', valor: '×1,5' });
      exp.dano.medio = Math.floor(exp.dano.medio * 1.5);
    }
    if (alvo?.condicoes.defendendo) {
      exp.dano.parcelas.push({ rotulo: 'Alvo Defendendo', valor: '−2' });
      exp.dano.medio -= 2;
    }
  }

  /* ---- Cura ---- */
  if (acao.cura) {
    const mod = acao.usaChaveNaCura ? modAtr : 0;
    exp.cura = {
      formula: acao.cura + (mod ? ` +${mod}` : ''),
      medio: Math.round(media(acao.cura) + mod),
      parcelas: [
        { rotulo: 'Dados', valor: acao.cura },
        ...(mod ? [{ rotulo: `Modificador de ${h.chave}`, valor: `+${mod}` }] : []),
      ],
    };
  }

  /* ---- Condições aplicadas ---- */
  exp.efeitos = (acao.efeitos ?? []).map((e) => ({
    nome: CONDICOES[e.cond]?.nome ?? e.cond,
    em: e.em === 'proprio' ? 'em você' : 'no alvo',
    verbo: 'Aplica',
    detalhe: e.valor != null
      ? `valor ${e.valor}`
      : `${e.turnos ?? 1} turno${(e.turnos ?? 1) > 1 ? 's' : ''}`,
    tipo: CONDICOES[e.cond]?.tipo ?? 'ruim',
  }));

  /* ---- Regras especiais ---- */
  const ESPECIAL = {
    'ataque-duplo': 'Dois ataques separados: cada um rola para acertar.',
    'critico-19': 'Crítico já em 19, não só em 20.',
    'acao-extra': 'Concede outra ação neste mesmo turno.',
    'dobra-se-vulneravel': 'Dobra o dano se o alvo estiver Vulnerável.',
    'exige-marcado': 'Só pode ser usada contra um alvo Marcado.',
    'regeneracao': 'Cura 1d8 + modificador por turno, durante 3 turnos.',
    'forma-fera': 'Dobra os dados do ataque básico e soma +2 de Defesa por 3 turnos.',
    'espinhos': 'Devolve 1d6 a quem atacar você.',
    'custo-vida': 'Você perde 1d6 de vida ao usar.',
    'roubo-vida': 'Cura metade do dano causado.',
  };
  if (ESPECIAL[acao.especial]) exp.notas.push(ESPECIAL[acao.especial]);
  if ((acao.custo ?? 0) === 0 && acao.dano) exp.notas.push('Ataque básico: gera +1 Foco ao acertar.');
  if (acao.geraFoco) exp.notas.push(`Gera +${acao.geraFoco} de Foco.`);
  if (acao.consumivel) exp.notas.push(`Consome uma poção (restam ${h.pocoes}).`);

  return exp;
}

/* --------------------------------------------------------------------------
   Uma condição em vigor
   -------------------------------------------------------------------------- */

const REGRA_CONDICAO = {
  queimadura:  'Causa dano no início do turno. O valor cai 1 por turno e some ao chegar a zero.',
  sangramento: 'Causa dano sempre que o afetado age. Não dispara se ele perder o turno.',
  vulneravel:  'Todo dano recebido é multiplicado por 1,5, arredondando para baixo.',
  marcado:     'Ataques contra ele são feitos com vantagem: rola-se dois d20 e usa-se o maior.',
  atordoado:   'Perde a Ação, mas mantém a ação bônus. Cancela um golpe que estivesse sendo preparado.',
  enraizado:   'Perde a ação bônus. Mantém a Ação.',
  defendendo:  '+3 de Defesa e −2 em todo dano recebido.',
  abencoado:   'Soma 1d4 a todos os testes de ataque.',
  preparando:  'Está carregando um golpe que sai no próximo turno. Atordoar cancela.',
  regeneracao: 'Recupera vida no início de cada turno.',
  formaFera:   'Os dados do ataque básico dobram e a Defesa sobe 2.',
  espinhos:    'Quem atacar sofre 1d6 de volta.',
};

export function explicarCondicao(id, dados) {
  const meta = CONDICOES[id];
  return {
    nome: meta?.nome ?? id,
    tipo: meta?.tipo ?? 'ruim',
    regra: REGRA_CONDICAO[id] ?? '',
    valor: dados?.valor ?? null,
    turnos: dados?.turnos === Infinity ? null : (dados?.turnos ?? null),
  };
}

/* --------------------------------------------------------------------------
   A ficha de um inimigo
   -------------------------------------------------------------------------- */

export function explicarInimigo(inim) {
  const molde = INIMIGOS[inim.tipoId] ?? {};
  const ataques = Object.entries(inim.acoes ?? {})
    .filter(([, a]) => !a.oculta)
    .map(([id, a]) => ({
      nome: a.nome,
      dano: a.dano ? `${a.dano} (médio ${Math.round(media(a.dano))})` : null,
      // "aplica Enraizado", não só "Enraizado": o nome sozinho não diz
      // se a ação causa a condição ou se protege dela.
      efeito: (a.efeitos ?? []).length
        ? 'aplica ' + a.efeitos.map((e) => CONDICOES[e.cond]?.nome ?? e.cond).join(' e ')
        : null,
      recarga: a.recarga ? `recarrega em ${a.recarga}` : null,
      pronta: a.recarga ? (inim.recargas?.[id] ?? 0) <= 0 : null,
      usos: a.usos != null ? (inim.usos?.[id] ?? 0) : null,
    }));

  return {
    nome: inim.nome,
    papel: inim.papel,
    pv: inim.pv, pvMax: inim.pvMax,
    defesa: defesaDe(inim),
    bonusAtaque: inim.bonusAtaque,
    iniciativa: inim.iniciativaMod,
    xp: inim.xp,
    chefe: !!inim.chefe,
    fase: molde.fase ? molde.fase(inim) : null,
    ataques,
    condicoes: Object.entries(inim.condicoes ?? {})
      .map(([id, d]) => explicarCondicao(id, d)),
  };
}
