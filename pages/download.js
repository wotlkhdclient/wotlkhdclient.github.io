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

  // let resp = await fetch('/jsons/downloads.json');
  // let data = await resp.json();

  let [links, changelog] = await Promise.all([
    fetch('/jsons/downloads.json').then(r => r.json()),
    fetch('/data/changelog.md').then(r => r.text())
  ])

  const parsed = parseChangelog(changelog);
  Object.keys(parsed).forEach(branch => {
    const panel = document.querySelector(`#panel-${branch}`);
    panel.querySelector('.download-cl-list').innerHTML = renderChangelog(parsed[branch], 0);
  });

  links.forEach((d, i) => {
    const panel = document.querySelector(`#panel-${d.name}`);
    const d_btn = document.querySelector(`#tag-${d.name}`);
    const d_tag = panel.querySelector('.download-ver-tag');
    const release_date = panel.querySelector('#release-date');
    d_tag.textContent = `v${d.version}-${d.name}`;
    d_btn.textContent = `v${d.version}-${d.name}`;
    release_date.textContent = new Date(d.version).toLocaleDateString();
    d.links.forEach((l, j) => {
      let link = panel.querySelector(`.src-${l.type}`);
      if (link) link.href = l.url;
    })
  });
}

function parseChangelog(md) {
  const result = {};
  let currentBranch = null;

  const lines = md.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('# ')) {
      currentBranch = line.slice(2).trim();
      result[currentBranch] = [];
      i++;
      continue;
    }

    const dateMatch = line.match(/^\*\*Update (\d{2}\.\d{2}\.\d{4})\*\*:/);
    if (dateMatch && currentBranch) {
      const entry = {
        date: dateMatch[1],
        updates: [],
        fixes: [],
        changes: [],
      };

      i++;

      while (i < lines.length) {
        const inner = lines[i].trim();

        if (inner === '---' || inner.startsWith('# ') || inner.match(/^\*\*Update /)) break;

        if (inner.startsWith('-u ')) entry.updates.push(marked.parse(inner.slice(3).trim()));
        else if (inner.startsWith('-f ')) entry.fixes.push(marked.parse(inner.slice(3).trim()));
        else if (inner.startsWith('-m ')) entry.changes.push(marked.parse(inner.slice(3).trim()));

        i++;
      }

      result[currentBranch].push(entry);

      if (lines[i]?.trim() === '---') i++;
      continue;
    }

    i++;
  }

  return result;
}