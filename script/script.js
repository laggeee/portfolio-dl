// Efeito irado dos números ----------------------------------------------------------------------------------------------------------------------------------------

  const field = document.getElementById('numberField');
  const fibonacci = ['1','2','3','5','8','13','21','34','55','89','144','233','377','610'];
  const count = window.innerWidth < 720 ? 16 : 30;
  for(let i=0; i<count; i++){
    const el = document.createElement('div');
    el.className = 'drift';
    el.textContent = fibonacci[Math.floor(Math.random()*fibonacci.length)];
    el.style.left = Math.random()*100 + '%';
    el.style.fontSize = (0.8 + Math.random()*1.6) + 'rem';
    el.style.animationDuration = (18 + Math.random()*22) + 's';
    el.style.animationDelay = (-Math.random()*30) + 's';
    field.appendChild(el);
  }

  // Barra de progesso do dado ------------------------------------------------------------------------------------------------------------------

  const track = document.querySelector('.scroll-track');
  const trackLine = document.getElementById('trackLine');
  const die = document.getElementById('scrollDie');
  const fill = document.getElementById('scrollFill');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TOP_RESERVE = 60;
  const BOTTOM_RESERVE = 21;

  function updateDie(){
    const trackHeight = track.clientHeight;
    const dieSize = 18;
    const lineTop = TOP_RESERVE;

    const lineBottomReserve = 27;
    const lineHeight = trackHeight - TOP_RESERVE - lineBottomReserve;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    const travel = trackHeight - TOP_RESERVE - BOTTOM_RESERVE - dieSize;

    trackLine.style.top = lineTop + 'px';
    trackLine.style.height = lineHeight + 'px';
    fill.style.top = lineTop + 'px';
    fill.style.height = Math.min(progress * travel, lineHeight) + 'px';

    die.style.top = (lineTop + progress * travel) + 'px';

    if(!reduceMotion){
      const rotation = window.scrollY * 0.35;
      die.style.transform = `translate(-50%, 0) rotate(${rotation}deg)`;
    }
  }

  window.addEventListener('scroll', updateDie, { passive:true });
  window.addEventListener('resize', updateDie);
  updateDie();

  // Atalhos da navbar -----------------------------------------------------------------------------------------------------------------------------

  document.querySelectorAll('.nav-links button[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.target);
      if(!target) return;
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      customScrollTo(targetY, 650);
    });
  });

  function customScrollTo(targetY, duration){
    return new Promise(resolve => {
      const startY = window.scrollY;
      const diff = targetY - startY;
      const startTime = performance.now();
      function step(now){
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
        window.scrollTo({ top: startY + diff * eased, left: 0, behavior: 'auto' });
        updateDie();
        if(t < 1){ requestAnimationFrame(step); } else { resolve(); }
      }
      requestAnimationFrame(step);
    });
  }

  // EE do d20 -----------------------------------------------------------------------------------------------------------------

  const rollBtn = document.getElementById('rollBtn');
  let rolling = false;

  const DIE_SVG = `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="#08070C" stroke="currentColor" stroke-width="1.2"/>
      <polygon points="20,12 32,30 8,30" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.65"/>
      <path d="M20,2 L20,12 M4,11 L20,12 M36,11 L20,12 M4,29 L8,30 M36,29 L32,30 M20,38 L8,30 M20,38 L32,30"
            stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
      <text class="roll-face" x="20" y="25" text-anchor="middle" font-size="10">20</text>
    </svg>`;

  function rollLabel(value){
    if(value === 20) return 'Critical hit';
    if(value === 1) return 'Critical fail';
    if(value >= 15) return 'Sucesso';
    if(value >= 10) return 'Sucesso parcial';
    return 'Falha';
  }

  function showRoll(){
    const overlay = document.createElement('div');
    overlay.className = 'roll-overlay';
    overlay.innerHTML = `<div class="roll-die spinning">${DIE_SVG}</div><div class="roll-label"></div>`;
    document.body.appendChild(overlay);

    const dieEl = overlay.querySelector('.roll-die');
    const faceEl = overlay.querySelector('.roll-face');
    const labelEl = overlay.querySelector('.roll-label');

    requestAnimationFrame(() => overlay.classList.add('show'));

    const shuffle = setInterval(() => {
      faceEl.textContent = Math.floor(Math.random() * 20) + 1;
    }, 60);

    setTimeout(() => {
      clearInterval(shuffle);
      const value = Math.floor(Math.random() * 20) + 1;
      faceEl.textContent = value;
      labelEl.textContent = `d20 — ${rollLabel(value)}`;
      dieEl.classList.remove('spinning');
      dieEl.classList.add('landed');
      if(value === 20) overlay.classList.add('crit');
      if(value === 1) overlay.classList.add('fumble');

      setTimeout(() => {
        overlay.classList.remove('show');
        setTimeout(() => {
          overlay.remove();
          rolling = false;
          rollBtn.disabled = false;
        }, 350);
      }, 1600);
    }, reduceMotion ? 200 : 1400);
  }

  if(rollBtn){
    rollBtn.addEventListener('click', () => {
      if(rolling) return;
      rolling = true;
      rollBtn.disabled = true;
      showRoll();
    });
  }