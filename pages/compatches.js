const API_URL = 'https://api.github.com/search/repositories?q=topic:wotlkhdclient';
const PER_PAGE = 10;   // карточек на страницу (GitHub API max 100)
const MAX_PAGES = 10; // GitHub Search API возвращает max 1000 результатов

// ── state ──
let allRepos = [];
let filtered = [];
let currentPage = 1;
let currentTag = 'all';
let currentSort = 'stars';
let searchQuery = '';
let loading = false;

export default async function ({ template, t }) {
  document.querySelector('title').setAttribute('data-t', 'compatches_title');
  document.title = t.compatches_title;
  return Mustache.render(template, { t });
}

export async function after({ params, query, t }) {

  // ── DOM refs ──
  const grid = document.getElementById('patchesGrid');
  const pagination = document.getElementById('pagination');
  const statsRow = document.getElementById('statsRow');
  const totalCount = document.getElementById('totalCount');
  const pageInfo = document.getElementById('pageInfo');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  async function fetchAll() {
    setLoading();
    allRepos = [];

    try {
      // Запрос первой страницы чтобы узнать total_count
      const first = await fetch(`${API_URL}&per_page=100&page=1&sort=stars`);
      if (!first.ok) throw new Error(`GitHub API ${first.status}`);
      const data = await first.json();

      allRepos = data.items || [];
      const total = data.total_count || 0;

      // Если репозиториев > 100, грузим остальные страницы (до 1000)
      const totalPages = Math.min(Math.ceil(total / 100), MAX_PAGES);
      const fetches = [];
      for (let p = 2; p <= totalPages; p++) {
        fetches.push(fetch(`${API_URL}&per_page=100&page=${p}&sort=stars`).then(r => r.json()));
      }
      if (fetches.length) {
        const results = await Promise.all(fetches);
        results.forEach(r => { if (r.items) allRepos = allRepos.concat(r.items); });
      }

      applyFilters();
    } catch (err) {
      showError(err.message);
    }
  }

  function applyFilters() {
    let list = [...allRepos];

    // topic filter (кроме "all")
    if (currentTag !== 'all') {
      list = list.filter(r => (r.topics || []).includes(currentTag));
    }

    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.owner?.login || '').toLowerCase().includes(q)
      );
    }

    // sort
    switch (currentSort) {
      case 'stars': list.sort((a, b) => b.stargazers_count - a.stargazers_count); break;
      case 'updated': list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)); break;
      case 'forks': list.sort((a, b) => b.forks_count - a.forks_count); break;
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
    }

    filtered = list;
    currentPage = 1;
    render();
  }

  function render() {
    const total = filtered.length;

    if (total === 0) {
      grid.innerHTML = '';
      grid.appendChild(buildEmpty());
      pagination.style.display = 'none';
      statsRow.style.display = 'none';
      return;
    }

    // stats
    statsRow.style.display = 'flex';
    totalCount.textContent = total;

    const totalPagesLocal = Math.ceil(total / PER_PAGE);
    pageInfo.textContent = `Страница ${currentPage} из ${totalPagesLocal}`;

    // cards
    const start = (currentPage - 1) * PER_PAGE;
    const slice = filtered.slice(start, start + PER_PAGE);

    grid.innerHTML = '';
    slice.forEach((repo, i) => {
      const card = buildCard(repo, i);
      grid.appendChild(card);
    });

    // pagination
    if (totalPagesLocal > 1) {
      pagination.style.display = 'flex';
      renderPagination(totalPagesLocal);
    } else {
      pagination.style.display = 'none';
    }
  }

  function buildCard(repo, animIdx) {
    const a = document.createElement('a');
    a.className = 'patch-card';
    a.href = `#/compatch?o=${repo.owner?.login}&r=${repo.name}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.animationDelay = (animIdx * 0.06) + 's';

    // topics → tags
    const knownTags = { texture: 'texture', model: 'model', vfx: 'vfx', ui: 'ui', sound: 'sound' };
    const tags = (repo.topics || [])
      .filter(t => t !== 'wotlkhdclient')
      .slice(0, 4)
      .map(t => {
        const cls = knownTags[t] ? `card-tag tag-${t}` : 'card-tag';
        return `<span class="${cls}">${t}</span>`;
      }).join('');

    // recency badge (< 14 days)
    const isNew = (Date.now() - new Date(repo.updated_at)) < 14 * 86400000;
    const newBadge = isNew ? '<span class="card-badge-new">New</span>' : '';

    // avatar
    const avatarSrc = repo.owner?.avatar_url || '';
    const avatarEl = avatarSrc
      ? `<img src="${avatarSrc}" alt="${repo.owner?.login}" loading="lazy">`
      : '📦';

    // description
    const desc = repo.description
      ? escHtml(repo.description)
      : '<em style="color:var(--text-dim);font-style:italic">Описание не указано</em>';

    // format date
    const updated = fmtDate(repo.updated_at);

    a.innerHTML = `
    ${newBadge}
    <div class="card-top">
      <div class="card-avatar">${avatarEl}</div>
      <div class="card-meta">
        <div class="card-name" title="${escHtml(repo.name)}">${escHtml(repo.name)}</div>
        <div class="card-author">
          <div class="card-author-avatar">
            ${avatarSrc ? `<img src="${avatarSrc}" alt="" loading="lazy">` : ''}
          </div>
          ${escHtml(repo.owner?.login || '')}
        </div>
      </div>
    </div>
    <div class="card-desc">${desc}</div>
    ${tags ? `<div class="card-tags">${tags}</div>` : ''}
    <div class="card-footer">
      <div class="card-stats">
        <span class="card-stat"><span class="card-stat-icon"><i class="fa-solid fa-star"></i></span>${repo.stargazers_count}</span>
        <span class="card-stat"><span class="card-stat-icon"><i class="fa-solid fa-code-fork"></i></span>${repo.forks_count}</span>
        ${repo.watchers_count ? `<span class="card-stat"><span class="card-stat-icon"><i class="fa-solid fa-eye"></i></span>${repo.watchers_count}</span>` : ''}
      </div>
      <span class="card-dl-btn" data-t="cps.moreinfo">More info</span>
    </div>
  `;

    return a;
  }

  function buildEmpty() {
    const div = document.createElement('div');
    div.className = 'empty-state';

    const isSearch = searchQuery.trim() || currentTag !== 'all';

    div.innerHTML = isSearch ? `
    <div class="empty-rune"><span class="empty-icon">🔍</span></div>
    <div class="empty-title">Патчи не найдены</div>
    <p class="empty-desc">По вашему запросу ничего не нашлось.<br>Попробуйте изменить фильтры или поисковый запрос.</p>
    <div class="empty-actions">
      <button class="btn-ghost" onclick="resetFilters()">✕ Сбросить фильтры</button>
    </div>
  ` : `
    <div class="empty-rune"><span class="empty-icon">🌌</span></div>
    <div class="empty-title">Пока никого нет</div>
    <p class="empty-desc">
      Репозитории с топиком <strong style="color:var(--accent-blue)">wotlkhdclient</strong> ещё не опубликованы.
      Станьте первым — создайте патч и поделитесь им с сообществом!
    </p>
    <div class="empty-actions">
      <a href="https://github.com/new" target="_blank" class="btn-submit">🛠 Создать патч</a>
      <a href="https://github.com/topics/wotlkhdclient" target="_blank" class="btn-ghost">📂 GitHub Topics</a>
    </div>
  `;
    return div;
  }

  function renderPagination(total) {
    pagination.innerHTML = '';

    const addBtn = (label, page, disabled = false, active = false, isArrow = false) => {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (active ? ' active' : '') + (isArrow ? ' arrow' : '');
      btn.textContent = label;
      btn.disabled = disabled;
      if (!disabled && !active) btn.onclick = () => goPage(page);
      pagination.appendChild(btn);
    };
    const addDots = () => {
      const s = document.createElement('span');
      s.className = 'page-dots'; s.textContent = '…';
      pagination.appendChild(s);
    };

    addBtn('‹', currentPage - 1, currentPage === 1, false, true);

    // page numbers with ellipsis
    const range = buildPageRange(currentPage, total);
    let prev = null;
    range.forEach(p => {
      if (prev !== null && p - prev > 1) addDots();
      addBtn(p, p, false, p === currentPage);
      prev = p;
    });

    addBtn('›', currentPage + 1, currentPage === total, false, true);
  }

  function buildPageRange(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total]);
    for (let i = Math.max(2, cur - 2); i <= Math.min(total - 1, cur + 2); i++) pages.add(i);
    return [...pages].sort((a, b) => a - b);
  }

  function goPage(p) {
    currentPage = p;
    render();
    window.scrollTo({ top: document.querySelector('.community-section').offsetTop - 80, behavior: 'smooth' });
  }

  function setLoading() {
    loading = true;
    statsRow.style.display = 'none';
    pagination.style.display = 'none';
    grid.innerHTML = '';
    for (let i = 0; i < PER_PAGE; i++) {
      grid.innerHTML += `
      <div class="skeleton-card" style="animation-delay:${i * 0.05}s">
        <div class="sk-row">
          <div class="sk-block skeleton sk-avatar"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px">
            <div class="sk-block skeleton" style="height:16px;width:60%"></div>
            <div class="sk-block skeleton" style="height:12px;width:35%"></div>
          </div>
        </div>
        <div class="sk-block skeleton" style="height:12px;width:100%"></div>
        <div class="sk-block skeleton" style="height:12px;width:80%"></div>
        <div class="sk-block skeleton" style="height:24px;width:50%"></div>
      </div>`;
    }
  }

  function showError(msg) {
    grid.innerHTML = `
    <div class="error-state" style="grid-column:1/-1">
      <div class="error-icon">⚠️</div>
      <p>Не удалось загрузить патчи.</p>
      <p style="font-size:12px;margin-top:6px;color:rgba(150,185,215,0.4)">${escHtml(msg)}</p>
      <button class="error-retry" onclick="fetchAll()">↻ Повторить</button>
    </div>`;
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d;
    const day = 86400000;
    if (diff < day) return 'сегодня';
    if (diff < 2 * day) return 'вчера';
    if (diff < 7 * day) return `${Math.floor(diff / day)} дн. назад`;
    if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} нед. назад`;
    if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} мес. назад`;
    return `${Math.floor(diff / (365 * day))} г. назад`;
  }
  function resetFilters() {
    searchQuery = '';
    currentTag = 'all';
    searchInput.value = '';
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.tag === 'all'));
    applyFilters();
  }

  let searchTimer;
  searchInput.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value;
      applyFilters();
    }, 280);
  });

  document.getElementById('filterTabs').addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentTag = btn.dataset.tag;
    applyFilters();
  });

  sortSelect.addEventListener('change', e => {
    currentSort = e.target.value;
    applyFilters();
  });
  fetchAll();
}