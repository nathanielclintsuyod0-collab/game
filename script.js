document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  const contactForm = document.querySelector('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', event => {
      event.preventDefault();
      const get = id => document.getElementById(id)?.value.trim() || '';
      const name = get('name');
      const email = get('email');
      const topic = get('topic');
      const message = get('message');
      const recipient = 'YOUR_EMAIL@example.com';
      if (recipient === 'YOUR_EMAIL@example.com') {
        alert('The contact form is ready, but the owner needs to set a real contact email in script.js before publishing.');
        return;
      }
      const body = message + '\n\nFrom: ' + name + '\nReply to: ' + email;
      window.location.href = 'mailto:' + recipient + '?subject=' + encodeURIComponent('[Hyterion portfolio] ' + topic + ' — ' + name) + '&body=' + encodeURIComponent(body);
    });
  }

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
      const response = await fetch('/.netlify/functions/chat', {
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
