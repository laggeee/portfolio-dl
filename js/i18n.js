/* ==========================================================================
   IDIOMA — português é a fonte, inglês é a tradução.

   O texto em PT vive no HTML e é fotografado ao carregar. O dicionário
   guarda só o EN. Assim o português nunca fica desatualizado em relação a
   si mesmo, e uma chave sem tradução simplesmente continua em português
   em vez de sumir da tela.
   ========================================================================== */

export const EN = {
  /* --- topo e navegação --- */
  'doc.titulo': 'Campaign Grimoire — Davi Lage Braga',
  'nav.origem': 'Origin',
  'nav.pericias': 'Skills',
  'nav.feitos': 'Deeds',
  'nav.diario': 'Journal',
  'nav.selos': 'Seals',
  'nav.arena': 'Arena',
  'nav.pacto': 'Pact',
  'nav.nivel': 'Level',
  'cap': 'Chapter',

  /* --- ritual: classe --- */
  'ritual.kicker': 'Before opening the grimoire',
  'ritual.titulo': 'Choose your class',
  'ritual.lead': 'Your choice sets the colour of the pact, the tone of the journey — and, later on, the abilities you take into the Arena.',

  'classe.guerreiro.nome': 'Warrior', 'classe.guerreiro.tag': 'Steel &amp; Discipline',
  'classe.guerreiro.desc': 'Reliable damage, high resilience. Wins by attrition.',
  'classe.guerreiro.stat': '<b>+2</b> Strength',
  'classe.arcanista.nome': 'Arcanist', 'classe.arcanista.tag': 'Ink &amp; Theory',
  'classe.arcanista.desc': 'Explosive area damage, fragile body. High risk.',
  'classe.arcanista.stat': '<b>+2</b> Intelligence',
  'classe.ladino.nome': 'Rogue', 'classe.ladino.tag': 'Shadow &amp; Precision',
  'classe.ladino.desc': 'Devastating crits, high evasion. Wins on timing.',
  'classe.ladino.stat': '<b>+2</b> Dexterity',
  'classe.clerigo.nome': 'Cleric', 'classe.clerigo.tag': 'Light &amp; Bond',
  'classe.clerigo.desc': 'Healing, blessings and staying power. Wins the long game.',
  'classe.clerigo.stat': '<b>+2</b> Wisdom',
  'classe.cacador.nome': 'Hunter', 'classe.cacador.tag': 'Trail &amp; Patience',
  'classe.cacador.desc': 'Strikes from afar, marks the target. Wins before contact.',
  'classe.cacador.stat': '<b>+2</b> Perception',
  'classe.druida.nome': 'Druid', 'classe.druida.tag': 'Root &amp; Cycle',
  'classe.druida.desc': 'Shifts shape as the fight demands. Adaptable.',
  'classe.druida.stat': '<b>+2</b> Constitution',
  'classe.paladino.nome': 'Paladin', 'classe.paladino.tag': 'Oath &amp; Shield',
  'classe.paladino.desc': 'Protects the line and punishes whoever breaks it.',
  'classe.paladino.stat': '<b>+2</b> Charisma',
  'classe.bruxo.nome': 'Warlock', 'classe.bruxo.tag': 'Pact &amp; Price',
  'classe.bruxo.desc': 'Power borrowed from something greater. It always collects.',
  'classe.bruxo.stat': '<b>+2</b> Will',

  /* --- ritual: perfil --- */
  'ritual.perfil.kicker': 'Second question',
  'ritual.perfil.titulo': 'How do you read best?',
  'ritual.perfil.lead': 'Nobody reads a whole portfolio. Tell me what you came for and the sections reorder themselves — nothing gets hidden, it just moves out of the way.',
  'perfil.recrutador.nome': 'Recruiter', 'perfil.recrutador.tag': 'Quick decision',
  'perfil.recrutador.desc': 'Contact, experience and certifications first. The story comes later.',
  'perfil.tecnico.nome': 'Engineering team', 'perfil.tecnico.tag': 'Show me the code',
  'perfil.tecnico.desc': 'Projects and skills up front, experience right behind.',
  'perfil.curioso.nome': 'Just curious', 'perfil.curioso.tag': 'Here for the game',
  'perfil.curioso.desc': 'The Arena and the origin story first. The résumé can wait.',
  'perfil.completo.nome': 'Adventurer', 'perfil.completo.tag': 'Grimoire order',
  'perfil.completo.desc': 'The whole journey, in the order it was written.',
  'ritual.idioma': 'Language',
  'ritual.voltar': '&larr; change class',
  'ritual.entrar': 'Open the grimoire',

  /* --- ficha --- */
  'ficha.kicker': 'Character Sheet — Current Campaign',
  'ficha.titulo': 'Software Engineering <span class="dot">&middot;</span> Ethical Hacker <span class="dot">&middot;</span> Level <b>4</b>',
  'ficha.lead': 'Software Engineering student and Ethical Hacker, currently studying Offensive Security and Linux, focused on Web Pentesting and Bug Bounty.',
  'ficha.flags': 'Flags captured',
  'ficha.projetos': 'Active projects',
  'ficha.periodo': 'Term — Software Eng.',
  'ficha.inventario': 'Open Inventory',
  'ficha.arena': 'Go to the Arena',
  'ficha.pacto': 'Pact sealed as',
  'ficha.trocar': 'change',
  'ficha.rolar': 'scroll to turn the page',

  /* --- origem --- */
  'origem.titulo': 'Origin Story',
  'origem.p1': 'I have always been drawn to challenges that invited me to go past the usual, think differently and be creative.',
  'origem.p2': 'Pairing that with my love for computers, I decided to study Offensive Security, to push my reasoning and try to understand how a hacker thinks.',
  'origem.p3': 'To me Ethical Hacking is more than work — it is a passion.',
  'origem.perfil': 'Character Profile',
  'origem.local': 'Location', 'origem.localV': 'Belo Horizonte, Brazil',
  'origem.formacao': 'Education', 'origem.formacaoV': 'Software Eng. <span>(PUC Minas)</span>',
  'origem.foco': 'Focus', 'origem.focoV': 'Pentest / Web',
  'origem.status': 'Status', 'origem.statusV': 'Open to internships',
  'origem.alinhamento': 'Alignment', 'origem.alinhamentoV': 'Chaotic Methodical',

  /* --- perícias --- */
  'pericias.titulo': 'Skills',
  'pericias.lead': 'Skill checks on a scale of 99. Rolled on arrival.',
  'pericias.java': 'Java / Spring Boot', 'pericias.javaD': 'Building REST APIs',
  'pericias.web': 'Web Application Security', 'pericias.webD': 'XSS, IDOR, SSRF, Access Control',
  'pericias.burp': 'Burp Suite', 'pericias.burpD': 'Repeater, Intruder, Comparer',
  'pericias.logica': 'Logic / Problem Solving', 'pericias.logicaD': 'Data structures, algorithms, reasoning',
  'pericias.perito': 'Expert', 'pericias.adepto': 'Adept', 'pericias.mestre': 'Master',
  'pericias.prof': 'Proficiencies',

  /* --- feitos --- */
  'feitos.titulo': 'Grimoire of Deeds',
  'feitos.lead': 'Items forged in the field. Hover to inspect.',
  'feitos.clinplay.tipo': 'Team web app &middot; Two-Handed Weapon',
  'feitos.clinplay.desc': 'Management and gamification software for physiotherapy clinics. Academic project, shipped and maintained.',
  'feitos.recon.rar': 'Rare &middot; in the forge',
  'feitos.recon.tipo': 'Security toolkit &middot; Seer\'s Lens',
  'feitos.recon.desc': 'Passive reconnaissance tool that aggregates public sources to map attack surface.',
  'feitos.writeups.tipo': 'CTF repository &middot; Tome of Records',
  'feitos.writeups.desc': 'Every CTF I solve becomes a document: method, reasoning, and the path to the flags. It is the most honest sample of how I think.',
  'feitos.empunhar': 'Wield', 'feitos.codigo': 'Code', 'feitos.ler': 'Read the records',
  'rar.lendario': 'Legendary', 'rar.epico': 'Epic',

  /* --- diário --- */
  'diario.titulo': 'Campaign Journal',
  'diario.atual': '2025 — present',
  'diario.puc': 'BSc in Software Engineering',
  'diario.pucD': 'Since 2025, studying Software Engineering at PUC Minas.',
  'diario.rooms': 'Study Rooms',
  'diario.roomsD': 'Since the start of my studies I have completed more than 60 THM rooms, covering Networking, Operating Systems, Pentest Frameworks and Tooling.',
  'diario.labs': 'Pentest Labs',
  'diario.labsD': 'My practice includes more than 20 labs, studying and exploiting web vulnerabilities and exploit chains.',
  'diario.ctf': 'CTF &amp; Writeups',
  'diario.ctfD': 'Whenever I solve a CTF I document the method, the reasoning and the path to the flags. The writeup repository shows how I actually work.',

  /* --- selos --- */
  'selos.titulo': 'Guild Seals',
  'selos.lead': 'Certifications issued and verifiable by code.',

  /* --- arena --- */
  'arena.titulo': 'The Arena',
  'arena.selado': 'The gate is sealed',
  'arena.lead': 'Beyond it: turn-based combat, d20 checks, loot and levelling. The Arena has a screen of its own — no scrolling, no distraction, just the encounter.',
  'arena.turnos': 'Turns', 'arena.d20': 'd20',
  'arena.saque': 'Loot &amp; inventory', 'arena.nivel': 'Level progression',
  'arena.botao': 'Break the Seal',
  'arena.nota': 'The chains give way — and the Arena demands a choice.',

  /* --- pacto --- */
  'pacto.titulo': 'Seal the Pact',
  'pacto.lead': 'Open to internships. Got a quest, a dungeon, or just want to talk offensive security? Send a raven.',
  'pacto.email': 'E-mail',

  /* --- rodapé --- */
  'rodape.forjado': 'Handmade in HTML, CSS and JS',
  'rodape.flavor': 'Roll a d20. With luck, it crits.',
  'rodape.creditos': 'Icons by',
};

const IDIOMAS = { pt: 'pt-BR', en: 'en' };
let originais = null;

/** Fotografa o português do HTML uma única vez. */
function fotografar() {
  if (originais) return originais;
  originais = new Map();
  for (const el of document.querySelectorAll('[data-i18n]')) {
    originais.set(el, el.innerHTML);
  }
  return originais;
}

export function aplicarIdioma(lang) {
  const base = fotografar();

  for (const [el, pt] of base) {
    const chave = el.dataset.i18n;
    if (lang === 'en' && EN[chave] != null) el.innerHTML = EN[chave];
    else el.innerHTML = pt;               // sem tradução? volta ao português
  }

  document.documentElement.lang = IDIOMAS[lang] ?? 'pt-BR';
  document.documentElement.dataset.idioma = lang;

  if (lang === 'en' && EN['doc.titulo']) document.title = EN['doc.titulo'];

  return lang;
}

export function idiomaGravado() {
  try { return localStorage.getItem('grimorio:idioma'); } catch { return null; }
}

export function gravarIdioma(lang) {
  try { localStorage.setItem('grimorio:idioma', lang); } catch { /* modo privado */ }
}

/** O rótulo "Capítulo"/"Chapter" que a renumeração de perfis usa. */
export const rotulos = (lang) => ({ capitulo: lang === 'en' ? EN['cap'] : 'Capítulo' });
