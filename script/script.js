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
    el.style.animationDelay = (-Math.random()*40) + 's';
    field.appendChild(el);
  }

  // Barra de progesso da bolinha ------------------------------------------------------------------------------------------------------------------

  const track = document.querySelector('.scroll-track');
  const trackLine = document.getElementById('trackLine');
  const ball = document.getElementById('scrollBall');
  const fill = document.getElementById('scrollFill');
  const goal = document.getElementById('scrollGoal');
  const receiver = document.getElementById('scrollReceiver');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hasReceived = false;
  let hasGoal = false;

  const TOP_RESERVE = 46;   
  const BOTTOM_RESERVE = 21; 
  const GOAL_REST_Y = 14;    
  const EXIT_GOAL = 0.045;   

  function updateBall(){
    const trackHeight = track.clientHeight;
    const ballSize = 16;
    const lineTop = TOP_RESERVE;

    const lineBottomReserve = 27;
    const lineHeight = trackHeight - TOP_RESERVE - lineBottomReserve;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    const travel = trackHeight - TOP_RESERVE - BOTTOM_RESERVE - ballSize;

    trackLine.style.top = lineTop + 'px';
    trackLine.style.height = lineHeight + 'px';
    fill.style.top = lineTop + 'px';

    let ballY;
    if(progress <= EXIT_GOAL){
      
      const t = progress / EXIT_GOAL;
      ballY = GOAL_REST_Y + t * (lineTop - GOAL_REST_Y);
      fill.style.height = '0px';
    } else {
      const p2 = (progress - EXIT_GOAL) / (1 - EXIT_GOAL);
      ballY = lineTop + p2 * travel;
      
      fill.style.height = Math.min(p2 * travel, lineHeight) + 'px';
    }
    ball.style.top = ballY + 'px';

    if(!reduceMotion){
      const rotation = window.scrollY * 0.6; 
      ball.style.transform = `translate(-50%, 0) rotate(${rotation}deg)`;
    }

    if(progress >= 0.99 && !hasReceived){
      hasReceived = true;
      ball.classList.add('received');
      receiver.classList.add('active');
    } else if(progress < 0.99 && hasReceived){
      hasReceived = false;
      ball.classList.remove('received');
      receiver.classList.remove('active');
    }

    if(progress <= EXIT_GOAL && !hasGoal){
      hasGoal = true;
      goal.classList.add('active');
      ball.classList.add('in-goal');
    } else if(progress > EXIT_GOAL && hasGoal){
      hasGoal = false;
      goal.classList.remove('active');
      ball.classList.remove('in-goal');
    }
  }

  window.addEventListener('scroll', updateBall, { passive:true });
  window.addEventListener('resize', updateBall);
  updateBall();

  // atalhos da navbar -----------------------------------------------------------------------------------------------------------------------------

  document.querySelectorAll('.nav-links button[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.target);
      if(!target) return;
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      customScrollTo(targetY, 650);
    });
  });

  // ee do gol -----------------------------------------------------------------------------------------------------------------

  const goalBtn = document.getElementById('goalBtn');
  let goalAnimating = false;

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
        updateBall(); 
        if(t < 1){ requestAnimationFrame(step); } else { resolve(); }
      }
      requestAnimationFrame(step);
    });
  }

  function showGoalCelebration(score){
    const overlay = document.createElement('div');
    overlay.className = 'goal-celebration';
    overlay.textContent = `${score}X0`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 400);
    }, 1800);
  }

  if(goalBtn){
    goalBtn.addEventListener('click', async () => {
      if(goalAnimating) return;
      if(!hasReceived) return; 

      goalAnimating = true;
      goalBtn.disabled = true;

      await customScrollTo(0, 320); // lança a bola

      let score = parseInt(localStorage.getItem('saeGoals') || '0', 10) + 1;
      localStorage.setItem('saeGoals', score);
      showGoalCelebration(score);

      goalAnimating = false;
      goalBtn.disabled = false;
    });
  }