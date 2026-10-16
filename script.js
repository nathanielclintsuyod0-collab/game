document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lightweight animated starfield; capped for performance and disabled for reduced motion.
  const cosmicCanvas = document.getElementById('cosmic-background');
  const cosmicContext = cosmicCanvas?.getContext('2d', { alpha: true });
  if (cosmicCanvas && cosmicContext) {
    let cosmicWidth = 0;
    let cosmicHeight = 0;
    let cosmicStars = [];
    let cosmicFrame = 0;
    let cosmicPointerX = 0;
    let cosmicPointerY = 0;
    const cosmicDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cosmicCount = Math.min(150, Math.max(65, Math.floor((window.innerWidth * window.innerHeight) / 14000)));

    const resizeCosmic = () => {
      cosmicWidth = window.innerWidth;
      cosmicHeight = window.innerHeight;
      cosmicCanvas.width = Math.floor(cosmicWidth * cosmicDpr);
      cosmicCanvas.height = Math.floor(cosmicHeight * cosmicDpr);
      cosmicContext.setTransform(cosmicDpr, 0, 0, cosmicDpr, 0, 0);
      cosmicStars = Array.from({ length: cosmicCount }, () => ({
        x: Math.random() * cosmicWidth,
        y: Math.random() * cosmicHeight,
        radius: Math.random() * 1.25 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.018 + 0.004,
        drift: Math.random() * 0.16 + 0.02
      }));
    };
    const drawCosmic = () => {
      cosmicContext.clearRect(0, 0, cosmicWidth, cosmicHeight);
      cosmicStars.forEach(star => {
        star.phase += star.speed;
        const alpha = 0.2 + (Math.sin(star.phase) + 1) * 0.28;
        const parallaxX = reduceMotion ? 0 : cosmicPointerX * star.drift;
        const parallaxY = reduceMotion ? 0 : cosmicPointerY * star.drift;
        cosmicContext.beginPath();
        cosmicContext.arc(star.x + parallaxX, star.y + parallaxY, star.radius, 0, Math.PI * 2);
        cosmicContext.fillStyle = `rgba(227, 211, 244, ${alpha})`;
        cosmicContext.fill();
      });
      if (!reduceMotion) cosmicFrame = window.requestAnimationFrame(drawCosmic);
    };
    resizeCosmic();
    drawCosmic();
    window.addEventListener('resize', resizeCosmic, { passive: true });
    if (!reduceMotion) {
      window.addEventListener('pointermove', event => {
        cosmicPointerX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 12;
        cosmicPointerY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 12;
      }, { passive: true });
    }
    if (reduceMotion) {
      cosmicContext.clearRect(0, 0, cosmicWidth, cosmicHeight);
      cosmicStars.forEach(star => {
        cosmicContext.beginPath();
        cosmicContext.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        cosmicContext.fillStyle = 'rgba(227, 211, 244, 0.42)';
        cosmicContext.fill();
      });
    }
  }
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('.nav');

  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }));
  }

  // Keep the current section reflected in the navigation for clearer orientation.
  const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
  const navSections = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window && navSections.length) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          const active = link.getAttribute('href') === '#' + entry.target.id;
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-28% 0px -58% 0px', threshold: 0 });
    navSections.forEach(section => sectionObserver.observe(section));
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu && nav?.classList.contains('open')) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.focus();
    }
  });

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Direct contact form submission via Formspree (no mail app required).
  // Replace this public form ID with the ID shown in your Formspree dashboard.
  const FORMSPREE_FORM_ID = 'xkjovdzy';
  const contactForm = document.querySelector('#contactForm');
  const contactStatus = document.getElementById('contactFormStatus');
  const contactSubmit = document.getElementById('contactSubmit');

  function setContactStatus(message, type) {
    if (!contactStatus) return;
    contactStatus.textContent = message;
    contactStatus.className = 'form-status' + (type ? ' is-' + type : '');
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async event => {
      event.preventDefault();
      setContactStatus('', '');

      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        setContactStatus('Please check the highlighted fields and try again.', 'error');
        return;
      }

      if (FORMSPREE_FORM_ID === 'YOUR_FORMSPREE_FORM_ID' || !FORMSPREE_FORM_ID.trim()) {
        setContactStatus('The contact form is not connected yet. The site owner needs to add the Formspree form ID in script.js.', 'error');
        return;
      }

      const originalButtonContent = contactSubmit?.innerHTML;
      if (contactSubmit) {
        contactSubmit.disabled = true;
        contactSubmit.setAttribute('aria-busy', 'true');
        contactSubmit.textContent = 'Sending…';
      }
      contactForm.setAttribute('aria-busy', 'true');
      setContactStatus('Sending your message securely…', 'loading');

      try {
        const formData = new FormData(contactForm);
        formData.append('_subject', '[Hyterion portfolio] ' + (formData.get('topic') || 'New inquiry'));

        const response = await fetch('https://formspree.io/f/' + encodeURIComponent(FORMSPREE_FORM_ID), {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' }
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const details = Array.isArray(result.errors)
            ? result.errors.map(item => item.message).filter(Boolean).join(' ')
            : '';
          if (response.status === 429) {
            throw new Error('Too many submissions were sent recently. Please wait a moment and try again.');
          }
          throw new Error(details || 'We could not send your message. Please check your details and try again.');
        }

        contactForm.reset();
        setContactStatus('Message sent successfully. Thanks for reaching out — I’ll reply to your email as soon as I can.', 'success');
      } catch (error) {
        setContactStatus(error instanceof TypeError
          ? 'Could not connect to the email service. Check your internet connection and try again.'
          : (error.message || 'Something went wrong. Please try again.'), 'error');
      } finally {
        contactForm.removeAttribute('aria-busy');
        if (contactSubmit) {
          contactSubmit.disabled = false;
          contactSubmit.removeAttribute('aria-busy');
          contactSubmit.innerHTML = originalButtonContent || 'Send message';
        }
      }
    });
  }

  // Manual support flow: selection only prepares a contact request; no payment is processed here.
  const supportSelection = document.getElementById('supportSelection');
  const supportButtons = document.querySelectorAll('[data-support-amount]');
  const supportContact = document.querySelector('[data-support-contact]');
  let selectedSupport = '100';
  supportButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.supportAmount === selectedSupport));
    button.addEventListener('click', () => {
      selectedSupport = button.dataset.supportAmount || '100';
      supportButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      if (supportSelection) supportSelection.textContent = selectedSupport === 'custom'
        ? 'Selected: custom contribution — please mention your amount'
        : 'Selected: ₱' + selectedSupport + ' contribution';
      if (supportContact) supportContact.href = '#contact';
    });
  });
  supportContact?.addEventListener('click', () => {
    const topic = document.getElementById('topic');
    const message = document.getElementById('message');
    if (topic) topic.value = 'Support / GCash contribution';
    if (message) message.value = selectedSupport === 'custom'
      ? 'I would like to support your work with a custom contribution. Please share the current GCash payment instructions.'
      : 'I would like to support your work with a ₱' + selectedSupport + ' contribution. Please share the current GCash payment instructions.';
  });
  document.querySelector('[data-sponsor-contact]')?.addEventListener('click', () => {
    const topic = document.getElementById('topic');
    const message = document.getElementById('message');
    if (topic) topic.value = 'Sponsorship / advertising partnership';
    if (message) message.value = 'I would like to discuss a clearly disclosed sponsorship or advertising partnership. Here is my idea: ';
  });


  // Service cards prefill the inquiry form with the selected service and its starting price.
  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', () => {
      const topic = document.getElementById('topic');
      const message = document.getElementById('message');
      const service = link.dataset.service || 'Project inquiry';
      const startingPrice = link.dataset.servicePrice || 'custom quote';
      if (topic) {
        const option = Array.from(topic.options).find(item => item.value === service || item.textContent.trim() === service);
        if (option) topic.value = option.value;
      }
      if (message) message.value = 'Hi Neo! I am interested in ' + service + '. I saw the listed starting price of ' + startingPrice + '. My requirements are: ';
    });
  });

  const revealItems = document.querySelectorAll('.section-label, .intro-grid, .principle-row article, .expertise-item, .project-card, .service-grid article, .contact-layout');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(el => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -18px 0px' });
    revealItems.forEach(el => {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }

  // Replace this placeholder with your deployed Netlify function URL.
  // Example: https://your-site.netlify.app/.netlify/functions/chat
  const NETLIFY_FUNCTION_URL = 'https://knownasneo.netlify.app/.netlify/functions/chat';
  const AI_API_URL = window.location.hostname.endsWith('.netlify.app')
    ? '/.netlify/functions/chat'
    : NETLIFY_FUNCTION_URL;

  // Neo AI assistant: the OpenAI API key stays on the server.
  const launcher = document.getElementById('aiLauncher');
  const panel = document.getElementById('aiPanel');
  const closeButton = document.getElementById('aiClose');
  const chatForm = document.getElementById('aiForm');
  const input = document.getElementById('aiInput');
  const messagesBox = document.getElementById('aiMessages');
  const intro = document.getElementById('aiIntro');
  const suggestionButtons = document.querySelectorAll('.ai-suggestions button');
  const history = [];
  let waiting = false;

  function setPanelOpen(open) {
    if (!launcher || !panel) return;
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    launcher.setAttribute('aria-expanded', String(open));
    if (open) window.setTimeout(() => input?.focus(), 180);
  }

  launcher?.addEventListener('click', () => setPanelOpen(!panel.classList.contains('is-open')));
  closeButton?.addEventListener('click', () => {
    setPanelOpen(false);
    launcher?.focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel?.classList.contains('is-open')) setPanelOpen(false);
  });

  function addMessage(role, text, extraClass) {
    const item = document.createElement('div');
    item.className = 'ai-message ' + role + (extraClass ? ' ' + extraClass : '');
    item.textContent = text;
    messagesBox.appendChild(item);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    return item;
  }

  function setWaiting(isWaiting) {
    waiting = isWaiting;
    const button = chatForm?.querySelector('button[type="submit"]');
    if (button) button.disabled = isWaiting;
    if (input) input.disabled = isWaiting;
    let indicator = document.getElementById('aiTyping');
    if (isWaiting && !indicator) {
      indicator = document.createElement('div');
      indicator.id = 'aiTyping';
      indicator.className = 'ai-typing';
      indicator.textContent = 'Neo AI is thinking…';
      messagesBox.appendChild(indicator);
    } else if (!isWaiting && indicator) {
      indicator.remove();
    }
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  async function sendMessage(rawText) {
    const text = rawText.trim();
    if (!text || waiting) return;
    if (intro) intro.hidden = true;
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    if (history.length > 10) history.splice(0, history.length - 10);
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    setPanelOpen(true);
    setWaiting(true);

    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reason = payload.error || (response.status === 404
          ? 'The AI service is not deployed yet. Deploy the Netlify function and add your OpenAI API key to its environment variables.'
          : 'The assistant could not answer right now. Please try again in a moment.');
        throw new Error(reason);
      }
      const answer = typeof payload.reply === 'string' ? payload.reply.trim() : '';
      if (!answer) throw new Error('The assistant returned an empty response. Please try again.');
      history.push({ role: 'assistant', content: answer });
      if (history.length > 10) history.splice(0, history.length - 10);
      addMessage('assistant', answer);
    } catch (error) {
      addMessage('assistant', error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setWaiting(false);
      input?.focus();
    }
  }

  chatForm?.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage(input?.value || '');
  });
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });
  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      chatForm?.requestSubmit();
    }
  });
  suggestionButtons.forEach(button => button.addEventListener('click', () => sendMessage(button.textContent || 'Tell me about your work')));
});
