export default async function ({ template, t }) {
  document.querySelector('title').setAttribute('data-t', 'home_title');
  document.title = t.home_title;
  return Mustache.render(template, { t });
}

export async function after({ params, query, t }) {
  // Reveal on scroll
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // await compSlider(t);
  // await gallery();
}

async function compSlider(t) {
  const pairs = await fetch('data/comparison.txt')
    .then(r => r.text())
    .then(t => t.split(/\r?\n/).filter(Boolean).map(line => line.split('|')));

  const wrap = document.getElementById('compWrap');
  const dotsContainer = document.getElementById('compDots');

  wrap.querySelectorAll('.comp-slide').forEach(s => s.remove());
  dotsContainer.innerHTML = '';

  pairs.forEach(([beforeUrl, afterUrl], i) => {
    const slide = document.createElement('div');
    slide.className = 'comp-slide' + (i === 0 ? ' active' : '');
    slide.id = 'slide' + i;
    slide.innerHTML = `
      <div class="comp-img-base">
        <img src="${afterUrl}" draggable="false">
      </div>
      <div class="comp-img-overlay" style="visibility: hidden;">
        <img src="${beforeUrl}" draggable="false" style="width: 0">
      </div>
      <div class="comp-label-before" data-t="index.comparison_label_before">${t.index.comparison_label_before}</div>
      <div class="comp-label-after" data-t="index.comparison_label_after">${t.index.comparison_label_after}</div></div>
      <div class="comp-divider" id="divider${i}" style="visibility: hidden;">
        <div class="comp-handle">⟺</div>
      </div>
    `;
    wrap.insertBefore(slide, wrap.querySelector('.carousel-nav'));

    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.dataset.idx = i;
    dotsContainer.appendChild(dot);
  });

  let compIdx = 0;
  let dragging = false;
  let cachedRect = null;
  let activeOverlay = null;
  let activeDivider = null;

  const caption = document.getElementById('compCaption');

  function getAllSlides() { return wrap.querySelectorAll('.comp-slide'); }
  function getAllDots() { return dotsContainer.querySelectorAll('.carousel-dot'); }

  function initSlide(idx) {
    const slide = wrap.querySelector('#slide' + idx);
    if (!slide) return;
    const overlay = slide.querySelector('.comp-img-overlay');
    const divider = slide.querySelector('.comp-divider');
    const slideW = slide.offsetWidth;

    overlay.querySelector('img').style.width = slideW + 'px';
    overlay.style.width = (slideW / 2) + 'px';
    divider.style.left = (slideW / 2) + 'px';

    overlay.style.visibility = '';
    divider.style.visibility = '';
  }

  function goSlide(n) {
    const allSlides = getAllSlides();
    const allDots = getAllDots();
    allSlides[compIdx].classList.remove('active');
    allDots[compIdx].classList.remove('active');
    compIdx = (n + allSlides.length) % allSlides.length;
    allSlides[compIdx].classList.add('active');
    allDots[compIdx].classList.add('active');
    if (caption) caption.textContent = '';
    setTimeout(() => initSlide(compIdx), 50);
  }

  function setPos(e) {
    if (!cachedRect || !activeOverlay || !activeDivider) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(cachedRect.width, clientX - cachedRect.left));
    activeOverlay.querySelector('img').style.width = cachedRect.width + 'px';
    activeOverlay.style.width = pos + 'px';
    activeDivider.style.left = pos + 'px';
  }

  function startDrag(e) {
    dragging = true;
    const slide = wrap.querySelector('#slide' + compIdx);
    cachedRect = slide.getBoundingClientRect();
    activeOverlay = slide.querySelector('.comp-img-overlay');
    activeDivider = slide.querySelector('.comp-divider');
    setPos(e);
  }

  function stopDrag() {
    dragging = false;
    cachedRect = null;
    activeOverlay = null;
    activeDivider = null;
  }

  setTimeout(() => initSlide(0), 50);

  document.getElementById('compPrev').onclick = () => goSlide(compIdx - 1);
  document.getElementById('compNext').onclick = () => goSlide(compIdx + 1);
  dotsContainer.addEventListener('click', e => {
    if (e.target.dataset.idx !== undefined) goSlide(+e.target.dataset.idx);
  });

  wrap.addEventListener('mousedown', e => startDrag(e));
  wrap.addEventListener('touchstart', e => startDrag(e), { passive: true });
  document.addEventListener('mousemove', e => { if (dragging) setPos(e); });
  document.addEventListener('touchmove', e => { if (dragging) setPos(e); }, { passive: true });
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchend', stopDrag);
}

async function gallery() {
  const urls = await fetch('data/gallery.txt')
    .then(r => r.text())
    .then(t => t.split(/\r?\n/).filter(Boolean));

  const track = document.getElementById('galleryTrack');
  const items = [...urls, ...urls];

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  const img = document.createElement('img');
  overlay.appendChild(img);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', () => overlay.classList.remove('active'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.classList.remove('active');
  });

  items.forEach((url, i) => {
    const d = document.createElement('div');
    d.className = 'gallery-thumb';
    d.style.backgroundImage = `url('${url}')`;
    d.style.backgroundSize = 'cover';
    d.style.backgroundPosition = 'center';
    d.style.cursor = 'zoom-in';

    d.addEventListener('click', () => {
      img.src = url;
      overlay.classList.add('active');
    });

    const pauseGallery = () => track.style.animationPlayState = 'paused';
    const resumeGallery = () => track.style.animationPlayState = 'running';

    overlay.addEventListener('click', () => {
      overlay.classList.remove('active');
      resumeGallery();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        overlay.classList.remove('active');
        resumeGallery();
      }
    });

    d.addEventListener('click', () => {
      img.src = url;
      overlay.classList.add('active');
      pauseGallery();
    });

    track.appendChild(d);
  });
}