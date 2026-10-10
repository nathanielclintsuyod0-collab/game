// KnownAsNeo portfolio interactions and dynamic background.
document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile navigation.
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('.topbar nav');
  if (menu && nav) {
    menu.setAttribute('aria-expanded', 'false');
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
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
    const value = selector => document.querySelector(selector)?.value?.trim() || '';
    const name = value('#name');
    const email = value('#email');
    const topic = document.querySelector('#topic')?.value || 'Portfolio enquiry';
    const message = value('#message');
    const recipient = 'YOUR_EMAIL@example.com';
    if (recipient === 'YOUR_EMAIL@example.com') {
      alert('To activate this form, open script.js and replace YOUR_EMAIL@example.com with your contact email.');
      return;
    }
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent('[Portfolio] ' + topic + ' — ' + name)}&body=${encodeURIComponent(message + '\n\nFrom: ' + name + '\nReply to: ' + email)}`;
  });

  // Scroll reveal animations. Elements remain visible if JS or observers are unavailable.
  const revealSelector = '.section .heading, .panel, .principles article, .skill, .service-card, .project, .callout-inner, .contact-grid > div';
  const revealItems = [...document.querySelectorAll(revealSelector)];
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(item => item.classList.add('is-visible'));
  } else {
    revealItems.forEach((item, index) => {
      item.classList.add('js-reveal');
      item.style.setProperty('--reveal-delay', `${(index % 4) * 75}ms`);
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -24px 0px' });
    revealItems.forEach(item => observer.observe(item));
  }

  // Header gains depth as the page scrolls.
  const topbar = document.querySelector('.topbar');
  const updateTopbar = () => topbar?.classList.toggle('scrolled', window.scrollY > 12);
  updateTopbar();
  window.addEventListener('scroll', updateTopbar, { passive: true });

  // Pointer glow + subtle 3D card tilt on desktop.
  if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let queued = false;
    window.addEventListener('pointermove', event => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--neo-pointer-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--neo-pointer-y', `${event.clientY}px`);
        queued = false;
      });
    }, { passive: true });

    document.querySelectorAll('.skill, .service-card, .project').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        if (card.matches('.project')) {
          card.style.setProperty('--tilt-x', `${(0.5 - y) * 3}deg`);
          card.style.setProperty('--tilt-y', `${(x - 0.5) * 4}deg`);
        }
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
      });
    });
  }

  // Tiny terminal cursor blink.
  const cursor = document.querySelector('.cursor');
  if (cursor && !reduceMotion) cursor.classList.add('cursor-live');
});

// Animated particle network. IMPORTANT: start the animation loop after every resize.
(() => {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0, dpr = 1, points = [], raf = 0;
  let pointer = { x: -1000, y: -1000 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(100, Math.max(28, Math.floor(width * height / 12500)));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: .7 + Math.random() * 1.5,
      vx: (Math.random() - .5) * .42,
      vy: (Math.random() - .5) * .42,
      alpha: .25 + Math.random() * .55,
      phase: Math.random() * Math.PI * 2
    }));
    cancelAnimationFrame(raf);
    draw(); // Previously this was draw(true), which rendered one still frame and stopped.
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const time = performance.now() * .001;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!reduceMotion) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;
        if (p.y < -8) p.y = height + 8;
        if (p.y > height + 8) p.y = -8;
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 115 && distance > 0) {
          p.x += (dx / distance) * .45;
          p.y += (dy / distance) * .45;
        }
      }
      const pulse = reduceMotion ? 1 : .72 + Math.sin(time * 1.8 + p.phase) * .28;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(211, 174, 255, ${p.alpha})`;
      ctx.fill();

      for (let j = i + 1; j < points.length; j++) {
        const q = points[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 125 * 125) {
          const alpha = .16 * (1 - distanceSquared / (125 * 125));
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(164, 119, 207, ${alpha})`;
          ctx.lineWidth = .7;
          ctx.stroke();
        }
      }
    }
    if (!reduceMotion) raf = requestAnimationFrame(draw);
  }

  if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', event => {
      pointer = { x: event.clientX, y: event.clientY };
    }, { passive: true });
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();
})();


// Cosmic purple cursor v5: use viewport coordinates via translate3d only.
(() => {
  const initCosmicCursor = () => {
    if (document.querySelector('.neo-cursor')) return;

    const cursor = document.createElement('div');
    cursor.className = 'neo-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<span class="neo-cursor-moon"></span><span class="neo-cursor-label"></span>';
    document.documentElement.appendChild(cursor);

    const label = cursor.querySelector('.neo-cursor-label');
    let lastTrail = 0;
    let lastX = -100, lastY = -100;

    const spawnTrail = (x, y) => {
      const now = performance.now();
      if (now - lastTrail < 65) return;
      lastTrail = now;
      const star = document.createElement('span');
      star.className = 'neo-cursor-trail';
      star.textContent = Math.random() > .65 ? '✧' : '·';
      star.style.left = x + 'px';
      star.style.top = y + 'px';
      star.style.fontSize = (8 + Math.random() * 8) + 'px';
      document.documentElement.appendChild(star);
      star.addEventListener('animationend', () => star.remove(), { once: true });
    };

    const move = event => {
      if (event.pointerType === 'touch') return;
      lastX = event.clientX;
      lastY = event.clientY;
      cursor.style.left = '0px';
      cursor.style.top = '0px';
      cursor.style.transform = `translate3d(${lastX}px, ${lastY}px, 0) translate(-50%, -50%)`;
      cursor.classList.add('is-visible');
      document.documentElement.classList.add('neo-custom-cursor');
      spawnTrail(lastX, lastY);
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('pointerdown', () => cursor.classList.add('is-clicking'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-clicking'));
    window.addEventListener('blur', () => cursor.classList.remove('is-visible'));
    window.addEventListener('focus', () => {
      if (lastX >= 0 && lastY >= 0) cursor.classList.add('is-visible');
    });

    const interactive = 'a, button, input, textarea, select, [role="button"], .project, .skill, .service-card, .btn';
    document.querySelectorAll(interactive).forEach(element => {
      element.addEventListener('pointerenter', () => {
        cursor.classList.add('is-hovering');
        label.textContent = element.matches('a, button, [role="button"], .btn') ? 'WARP' : 'COSMIC';
      });
      element.addEventListener('pointerleave', () => {
        cursor.classList.remove('is-hovering');
        label.textContent = '';
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCosmicCursor, { once: true });
  } else {
    initCosmicCursor();
  }
})();
