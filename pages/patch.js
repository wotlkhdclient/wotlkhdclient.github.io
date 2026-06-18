import { markedVideo } from '../assets/plugins/marked-18.0.5/marked-video.js';

export default async function ({ template, t }) {
  return Mustache.render(template, { t });
}

export async function after({ query, t }) {
  const content   = document.getElementById('patchContent');
  const mediaWrap = document.getElementById('patchMedia');
  marked.use(markedVideo());

  if (!content || !mediaWrap) return;

  let html;
  try {
    const raw = await fetch(`/data/patches/${query.id}.md`).then(r => {
      if (!r.ok) throw new Error(`Patch not found: ${query.id}`);
      return r.text();
    });
    html = DOMPurify.sanitize(marked.parse(raw));
    const h3 = html.match(/<h3><strong>(.*?)<\/strong><\/h3>/);
    if (h3) { document.title = `${h3[1]} | WotLK HD Client`; }
  } catch (err) {
    content.innerHTML = `<p style="color:var(--wh-text-muted)">${t.patch_load_error ?? 'Failed to load patch.'}</p>`;
    console.error(err);
    return;
  }

  content.innerHTML = html;

  initPatchMedia(content, mediaWrap);
}

function initPatchMedia(content, mediaWrap) {
  mediaWrap.innerHTML = '';

  const imgs = Array.from(content.querySelectorAll('img'));

  if (imgs.length === 0) return;

  imgs.forEach(img => {
    const parent = img.parentElement;
    img.remove();
    if (parent?.tagName === 'P' && parent.innerHTML.trim() === '') {
      parent.remove();
    }
  });

  if (imgs.length === 1) {
    imgs[0].classList.add('patch-media__single');
    imgs[0].loading = 'lazy';
    mediaWrap.appendChild(imgs[0]);
    return;
  }

  // Карусель
  mediaWrap.appendChild(buildCarousel(imgs));
}

function buildCarousel(imgs) {
  let current = 0;
  const total = imgs.length;

  const wrap = el('div', 'patch-carousel', {
    role: 'region',
    'aria-label': 'Patch images',
    tabindex: '0',
  });

  const track = el('div', 'patch-carousel__track');

  imgs.forEach((img, i) => {
    const slide = el('div', 'patch-carousel__slide', {
      role: 'group',
      'aria-label': `Slide ${i + 1} / ${total}`,
    });
    img.loading = 'lazy';
    img.draggable = false;
    slide.appendChild(img);
    track.appendChild(slide);
  });

  const counter = el('div', 'patch-carousel__counter', { 'aria-live': 'polite' });

  const btnPrev = el('button', 'patch-carousel__btn patch-carousel__btn--prev', { 'aria-label': 'Back' });
  btnPrev.innerHTML = '&#8249;';

  const btnNext = el('button', 'patch-carousel__btn patch-carousel__btn--next', { 'aria-label': 'Next' });
  btnNext.innerHTML = '&#8250;';

  const dotsWrap = el('div', 'patch-carousel__dots', {
    role: 'tablist',
    'aria-label': 'Slides navigation',
  });

  const dots = imgs.map((_, i) => {
    const dot = el('button', 'patch-carousel__dot', {
      role: 'tab',
      'aria-label': `Slide ${i + 1}`,
      'aria-selected': i === 0 ? 'true' : 'false',
    });
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function goTo(index) {
    current = Math.max(0, Math.min(index, total - 1));
    track.style.transform = `translateX(-${current * 100}%)`;
    counter.textContent = `${current + 1} / ${total}`;
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === current);
      d.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
    btnPrev.disabled = current === 0;
    btnNext.disabled = current === total - 1;
  }

  btnPrev.addEventListener('click', () => goTo(current - 1));
  btnNext.addEventListener('click', () => goTo(current + 1));

  // Клавиатура
  wrap.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
  });

  // Свайп
  let touchStartX = 0;
  wrap.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? current + 1 : current - 1);
  }, { passive: true });

  goTo(0);

  wrap.append(track, counter, btnPrev, btnNext, dotsWrap);
  return wrap;
}

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}