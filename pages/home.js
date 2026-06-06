import { setMeta, setCanonical } from '../assets/js/engine.js';

export default async function ({ template, t }) {
  document.querySelector('title').setAttribute('data-t', 'home_title');
  document.title = t.home_title;

  setMeta('description', 'WotLK HD Client is a free graphics modification for World of Warcraft 3.3.5a. Enhanced textures, lighting, shadows, and visual effects for Wrath of the Lich King.');
  setMeta('og:title', 'WotLK HD Client - HD Graphics Mod for WoW 3.3.5a', 'property');
  setMeta('og:description', 'Free graphics modification for WoW 3.3.5a. Enhanced textures, lighting, shadows, and visual effects.', 'property');
  setMeta('og:url', 'https://wotlkhdclient.github.io/', 'property');
  setCanonical('/');

  return Mustache.render(template, { t });
}

function buildLayerPair(slide, index) {
  const after = document.createElement('div');
  after.className = 'home-comparison__after-layer comp-slide-layer';
  after.dataset.idx = index;
  after.style.cssText = 'opacity:0; transition:opacity .4s ease; z-index:1;';

  if (slide.afterSrc) {
    const img = new Image();
    img.src = slide.afterSrc;
    img.draggable = false;
    after.appendChild(img);
  } else {
    after.innerHTML = slide.afterPlaceholder || '';
  }

  const before = document.createElement('div');
  before.className = 'home-comparison__before-layer comp-slide-layer';
  before.dataset.idx = index;
  before.style.cssText = 'opacity:0; transition:opacity .4s ease; z-index:2; clip-path:inset(0 50% 0 0); will-change:clip-path;';

  if (slide.beforeSrc) {
    const img = new Image();
    img.src = slide.beforeSrc;
    img.draggable = false;
    before.appendChild(img);
  } else {
    before.innerHTML = slide.beforePlaceholder || '';
  }

  return { before, after };
}

function createComparison(slides) {
  const state = { current: 0, dividerX: 50 };

  const wrap          = document.getElementById('comparisonWrap');
  const divider       = document.getElementById('compDivider');
  const dotsContainer = document.getElementById('compDots');
  const layers        = [];

  function goTo(index) {
    const prev = state.current;
    state.current = (index + slides.length) % slides.length;

    layers[prev].before.style.opacity = '0';
    layers[prev].after.style.opacity  = '0';

    layers[state.current].before.style.opacity = '1';
    layers[state.current].after.style.opacity  = '1';
    layers[state.current].before.style.clipPath = `inset(0 ${100 - state.dividerX}% 0 0)`;

    updateDots(state.current);
    setDivider(50);
  }

  function setDivider(pct) {
    state.dividerX = Math.min(100, Math.max(0, pct));
    divider.style.left = `${state.dividerX}%`;
    if (layers[state.current]) {
      layers[state.current].before.style.clipPath = `inset(0 ${100 - state.dividerX}% 0 0)`;
    }
  }

  function onDragStart(e) {
    e.preventDefault();
    const move = (ev) => {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const rect = wrap.getBoundingClientRect();
      setDivider(((clientX - rect.left) / rect.width) * 100);
    };
    const stop = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup',   stop);
      window.removeEventListener('touchend',  stop);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('mouseup',   stop);
    window.addEventListener('touchend',  stop);
  }

  function rebuildDots() {
    dotsContainer.innerHTML = slides.map((_, i) =>
      `<button class="home-comparison__dot${i === state.current ? ' active' : ''}" data-idx="${i}"></button>`
    ).join('');
    dotsContainer.querySelectorAll('.home-comparison__dot').forEach(btn => {
      btn.addEventListener('click', () => goTo(Number(btn.dataset.idx)));
    });
  }

  function updateDots(index) {
    dotsContainer.querySelectorAll('.home-comparison__dot').forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
  }

  const overlay = wrap.querySelector('.home-comparison__overlay');

  slides.forEach((slide, i) => {
    const pair = buildLayerPair(slide, i);
    wrap.insertBefore(pair.after,  overlay);
    wrap.insertBefore(pair.before, overlay);
    layers.push(pair);
  });

  wrap.addEventListener('mousedown',  onDragStart);
  wrap.addEventListener('touchstart', onDragStart, { passive: false });

  document.getElementById('compPrev').addEventListener('click', () => goTo(state.current - 1));
  document.getElementById('compNext').addEventListener('click', () => goTo(state.current + 1));

  rebuildDots();
  goTo(0);
}

export async function after({ params, query, t }) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  const slides = [];
  await fetch('/data/comparison.txt')
    .then(r => r.text())
    .then(text => {
      text.trim().split('\n').forEach(line => {
        const [beforeSrc, afterSrc] = line.trim().split('|');
        if (beforeSrc && afterSrc) slides.push({ beforeSrc, afterSrc });
      });
    });

  createComparison(slides);
}