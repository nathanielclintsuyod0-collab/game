// Navigation, footer year, placeholder, and contact form.
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('.topbar nav');
  if (menu && nav) {
    menu.setAttribute('aria-expanded', 'false');
    menu.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }));
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  const discordPlaceholder = document.querySelector('#discord-placeholder');
  if (discordPlaceholder) discordPlaceholder.addEventListener('click', event => {
    event.preventDefault();
    const hint = document.querySelector('#hint');
    if (hint) hint.textContent = 'Edit index.html to replace this placeholder with your actual Discord username.';
  });

  const form = document.querySelector('#contactForm');
  if (form) form.addEventListener('submit', event => {
    event.preventDefault();
    const getValue = selector => document.querySelector(selector)?.value?.trim() || '';
    const name = getValue('#name');
    const email = getValue('#email');
    const topic = document.querySelector('#topic')?.value || 'Portfolio enquiry';
    const message = getValue('#message');
    const recipient = 'YOUR_EMAIL@example.com';
    if (recipient === 'YOUR_EMAIL@example.com') {
      alert('To activate this form, open script.js and replace YOUR_EMAIL@example.com with your contact email.');
      return;
    }
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent('[Portfolio] ' + topic + ' — ' + name)}&body=${encodeURIComponent(message + '\n\nFrom: ' + name + '\nReply to: ' + email)}`;
  });

  // Reveal content as it enters the viewport.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealSelector = '.section .heading, .panel, .principles article, .skill, .service-card, .project, .callout-inner, .contact-grid > div';
  const revealItems = [...document.querySelectorAll(revealSelector)];
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(item => item.classList.add('is-visible'));
  } else {
    revealItems.forEach((item, index) => {
      item.classList.add('js-reveal');
      item.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -28px 0px' });
    revealItems.forEach(item => observer.observe(item));
  }

  // Make the sticky navigation feel more responsive while scrolling.
  const topbar = document.querySelector('.topbar');
  const updateTopbar = () => {
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 12);
  };
  updateTopbar();
  window.addEventListener('scroll', updateTopbar, { passive: true });

  // Subtle pointer-following ambient glow on devices with a fine pointer.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    let pending = false;
    window.addEventListener('pointermove', event => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--neo-pointer-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--neo-pointer-y', `${event.clientY}px`);
        pending = false;
      });
    }, { passive: true });
  }
});

// Lightweight animated particle field. Respects reduced-motion preferences.
(()=>{const canvas=document.getElementById('particleCanvas');if(!canvas)return;const ctx=canvas.getContext('2d');const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;let w=0,h=0,dpr=1,points=[],raf=0;function resize(){dpr=Math.min(window.devicePixelRatio||1,2);w=window.innerWidth;h=window.innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(85,Math.floor(w*h/18000));points=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,r:.5+Math.random()*1.5,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,a:.15+Math.random()*.45}));draw(true)}function draw(staticOnly=false){ctx.clearRect(0,0,w,h);for(let i=0;i<points.length;i++){const p=points[i];if(!staticOnly&&!reduced){p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0}ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(205,164,255,${p.a})`;ctx.fill();if(!reduced){for(let j=i+1;j<points.length;j++){const q=points[j],dx=p.x-q.x,dy=p.y-q.y,d=dx*dx+dy*dy;if(d<105*105){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(164,119,207,${.08*(1-d/(105*105))})`;ctx.lineWidth=.6;ctx.stroke()}}}}if(!staticOnly&&!reduced)raf=requestAnimationFrame(()=>draw(false))}window.addEventListener('resize',()=>{cancelAnimationFrame(raf);resize()},{passive:true});if(!reduced)resize();else resize()})();
