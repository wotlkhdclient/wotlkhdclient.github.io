import { initHeader, initFooter } from './layout.js';
import { routes } from './routes.js';

let currentLang = localStorage.getItem('lang')
  || navigator.language.split('-')[0]
  || 'en';

let translations = {};
let languages = [];
let currentNavigationId = 0;
let currentCleanup = null;
let hashChangeTimeout;
let layoutInitialized = false;

const templateCache = new Map();

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function applyTranslations(scope = document) {
  scope.querySelectorAll('[data-t]').forEach(el => {
    let f;
    const key = el.dataset.t;
    const value = getNestedValue(translations, key);
    if (value !== undefined) {
      f = value.replace(/\|([^|]+)\|/g, '<em>$1</em>');
      f = f.replace(/'([^']+)'/g, '<code style="color:var(--accent-blue); font-weight:600">$1</code>');
      el.innerHTML = f;
    } else {
      el.textContent = key;
    }
  });

  scope.querySelectorAll('[data-t-placeholder]').forEach(el => {
    const key = el.dataset.tPlaceholder;
    const value = getNestedValue(translations, key);
    if (value !== undefined) {
      el.placeholder = value;
    } else {
      el.placeholder = key;
    }
  });
}

async function loadLanguage(lang) {
  try {
    const res = await fetch(`locales/${lang}.json`);
    if (!res.ok) {
      console.warn(`Language "${lang}" not found, falling back to "en"`);
      if (lang === 'en') { translations = {}; return; }
      return loadLanguage('en');
    }
    translations = await res.json();
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('lang', lang);
    currentLang = lang;
  } catch (err) {
    console.error('Failed to load language:', err);
    translations = {};
  }
}

async function loadLanguageList() {
  try {
    const res = await fetch('jsons/languages.json');
    languages = res.ok ? await res.json() : [];
  } catch {
    languages = [];
  }
}

export async function setLanguage(lang) {
  await loadLanguage(lang);
  applyTranslations();
  renderLangDropdown(languages);
}

async function fetchTemplate(name) {
  if (templateCache.has(name)) return templateCache.get(name);
  const res = await fetch(`templates/${name}.html`);
  if (!res.ok) throw new Error(`Template not found: ${name}`);
  const tpl = await res.text();
  templateCache.set(name, tpl);
  return tpl;
}

function renderLangDropdown(langs) {
  const dd = document.getElementById('langDropdown');
  const codeEl = document.getElementById('langCode');
  if (!dd) return;

  if (codeEl) codeEl.textContent = currentLang.toUpperCase();

  dd.innerHTML = '';
  langs.forEach((l, i) => {
    if (i === 2) {
      const div = document.createElement('div');
      div.className = 'lang-divider';
      dd.appendChild(div);
    }
    const item = document.createElement('div');
    item.className = 'lang-item' + (l.code === currentLang ? ' cur' : '');
    item.innerHTML = `
      <span class="lang-flag">${l.flag}</span>
      <span class="lang-name">${l.name}</span>
      <span class="lang-code">${l.code.toUpperCase()}</span>
      <span class="lang-check">${l.code === currentLang ? '✓' : ''}</span>
    `;
    item.onclick = () => {
      document.getElementById('navLang')?.classList.remove('open');
      setLanguage(l.code);
    };
    dd.appendChild(item);
  });
}

async function initLayout() {
  if (layoutInitialized) return;

  const [headerTpl, footerTpl] = await Promise.all([
    fetchTemplate('blocks/header'),
    fetchTemplate('blocks/footer'),
  ]);

  const headerEl = document.getElementById('app-header');
  const footerEl = document.getElementById('app-footer');

  if (headerEl) headerEl.innerHTML = Mustache.render(headerTpl, {});
  if (footerEl) footerEl.innerHTML = Mustache.render(footerTpl, {});

  applyTranslations();

  await initHeader({ languages, currentLang, renderLangDropdown, setLanguage });
  await initFooter();

  layoutInitialized = true;
}

function getCurrentPath() {
  return location.hash.slice(1) || '/';
}

function parseQuery(path) {
  const [pathname, queryString] = path.split('?');
  const query = {};
  if (queryString) {
    for (const [k, v] of new URLSearchParams(queryString)) query[k] = v;
  }
  return { pathname, query };
}

function matchRoute(path) {
  for (const route of routes) {
    if (route.path === path) return { view: route.view };
  }
  return null;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateActiveLink(path) {
  document.querySelectorAll('a.nav-link').forEach(el => el.classList.remove('active'));
  document.querySelector(`a.nav-link[href="#${path}"]`)?.classList.add('active');
}

async function loadView(viewName, params = {}, query = {}, navigationId) {
  if (navigationId !== currentNavigationId) return;

  const container = document.querySelector('.content');
  if (!container) return;

  if (currentCleanup) {
    try { await currentCleanup(); } catch (e) { console.warn('Cleanup failed:', e); }
    currentCleanup = null;
  }

  container.classList.add('loading');
  container.classList.remove('show');

  try {
    const [module, template] = await Promise.all([
      import(`../../pages/${viewName}.js`),
      fetchTemplate(viewName),
    ]);

    const handler = module.default
      || module[`load${capitalize(viewName)}`]
      || module.load;

    if (typeof handler !== 'function') {
      throw new Error(`No valid handler for view: ${viewName}`);
    }

    const html = await handler({ params, query, template, t: translations });

    if (navigationId !== currentNavigationId) return;

    setTimeout(() => {
      if (navigationId !== currentNavigationId) return;

      container.innerHTML = html;
      // применить переводы к свежему контенту страницы
      applyTranslations(container);
      container.classList.remove('loading');
      container.classList.add('show');

      module.after?.({ params, query, t: translations });

      if (typeof module.cleanup === 'function') {
        currentCleanup = module.cleanup;
      }
    }, 150);

  } catch (err) {
    console.error('Failed to load view:', err);
    if (navigationId !== currentNavigationId) return;

    try {
      const tpl = await fetchTemplate('404');
      container.innerHTML = Mustache.render(tpl, { t: translations });
    } catch {
      container.innerHTML = '<h1>Page not found</h1>';
    }
    container.classList.remove('loading');
    container.classList.add('show');
  }
}

export async function navigate(path) {
  const navigationId = ++currentNavigationId;
  const { pathname, query } = parseQuery(path);
  const viewName = matchRoute(pathname)?.view ?? '404';

  try {
    window.scrollTo(0, 0);
    await loadView(viewName, {}, query, navigationId);
  } catch (err) {
    if (navigationId === currentNavigationId) {
      console.error('Navigation failed:', err);
      await loadView('404', {}, query, navigationId);
    }
  }

  if (navigationId === currentNavigationId) updateActiveLink(pathname);
}

window.addEventListener('hashchange', () => {
  clearTimeout(hashChangeTimeout);
  hashChangeTimeout = setTimeout(() => navigate(getCurrentPath()), 10);
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([loadLanguage(currentLang), loadLanguageList()]);
    await initLayout();
    await navigate(getCurrentPath());
  } catch (err) {
    console.error('Failed to initialize application:', err);
  }
});

window.addEventListener('beforeunload', () => {
  try { currentCleanup?.(); } catch (e) { console.warn('Cleanup on unload failed:', e); }
});