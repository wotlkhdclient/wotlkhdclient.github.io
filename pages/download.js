import { setMeta, setCanonical } from '../assets/js/engine.js';

export default async function ({ template, t }) {
  document.querySelector('title').setAttribute('data-t', 'download_title');
  document.title = t.download_title;

  setMeta('description', 'Download WotLK HD Client - free HD graphics mod for World of Warcraft 3.3.5a. Get the latest version and upgrade your Wrath of the Lich King visuals.');
  setMeta('og:title', 'Download WotLK HD Client', 'property');
  setMeta('og:description', 'Download the latest version of WotLK HD Client - free HD graphics mod for WoW 3.3.5a.', 'property');
  setMeta('og:url', 'https://wotlkhdclient.github.io/download', 'property');
  setCanonical('/download');

  return Mustache.render(template, { t });
}

export async function after({ params, query, t }) {
  const revealObserver = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.12 }
  );
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Version switcher
  const btns = document.querySelectorAll('.download-ver-btn');
  const panels = document.querySelectorAll('.download-panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.panel;

      btns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });

  let resp = await fetch('jsons/downloads.json');
  let data = await resp.json();

  data.forEach((d, i) => {
    const panel = document.querySelector(`#panel-${d.name}`);
    const d_btn = document.querySelector(`#tag-${d.name}`);
    const d_tag = panel.querySelector('.download-ver-tag');
    d_tag.textContent = `v${d.version}-${d.name}`;
    d_btn.textContent = `v${d.version}-${d.name}`;
    d.links.forEach((l, j) => {
      let link = panel.querySelector(`.src-${l.type}`);
      if (link) link.href = l.url;
    })
  });

  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.modalOpen;
      document.getElementById(id).classList.add('open');
      document.body.classList.add('wh-modal-open');
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach(el => {
    el.addEventListener('click', () => closeAll());
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
  });

  function closeAll() {
    document.querySelectorAll('.wh-modal.open')
      .forEach(m => m.classList.remove('open'));
    document.body.classList.remove('wh-modal-open');
  }
}