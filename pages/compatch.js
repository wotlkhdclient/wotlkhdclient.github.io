export default async function ({ template, t }) {
  document.title = `${t.notfound_title} | WotLK HD Client`;
  return Mustache.render(template, { t });
}

export async function after({ params, query, t }) {
  if (!query.o || !query.r) {
    renderError('Не указаны параметры owner и repo. Используйте ?o=ИМЯ&r=РЕПОЗИТОРИЙ');
    return;
  }

  const GH_API = `https://api.github.com/repos/${query.o}/${query.r}`;
  const RAW_README = `https://raw.githubusercontent.com/${query.o}/${query.r}/HEAD/README.md`;

  try {
    // parallel: repo info + readme + releases
    const [repoRes, readmeRes, releasesRes] = await Promise.all([
      fetch(GH_API),
      fetch(RAW_README),
      fetch(`${GH_API}/releases?per_page=10`),
    ]);

    if (!repoRes.ok) {
      if (repoRes.status === 404) throw new Error(`Репозиторий ${query.o}/${query.r} не найден.`);
      if (repoRes.status === 403) throw new Error('GitHub API Rate Limit превышен. Попробуйте позже.');
      throw new Error(`GitHub API вернул ${repoRes.status}`);
    }

    const repo = await repoRes.json();
    const readmeMd = readmeRes.ok ? await readmeRes.text() : null;
    const releases = releasesRes.ok ? await releasesRes.json() : [];

    const readmeHtml = parseReadme(readmeMd, query.o, query.r, repo.default_branch);
    renderPage(repo, readmeHtml, releases);

  } catch (err) {
    renderError(err.message);
  }

}


function renderError(msg) {
  $("#compatch-hero").addClass("d-none");
  $("#compatch-body").addClass("d-none");
  $("#compatch-error").removeClass("d-none");
  $(".full-error-desc").html(msg);
}

function parseReadme(md, owner, repo, branch) {
  if (!md) return null;

  marked.setOptions({ breaks: true, gfm: true });

  const base = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  const processed = md.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
    (_, alt, src) => `![${alt}](${base}${src.replace(/^\.\//, '')})`
  );

  return marked.parse(processed);
}


function renderPage(repo, readmeHtml, releases) {
  document.title = `${repo.name} — Патчи сообщества | WotLK HD Client`;
  const topics = (repo.topics || []).filter(t => t !== 'wotlkhdclient');
  $(".patch-community-meta").empty().append(`
    ${topics.length ? `<div class="patch-topics">${topics.map(topicBadge).join('')}</div>` : ''}
    <div class="patch-name">${esc(repo.name)}</div>
    ${repo.description ? `<div class="patch-desc-line">${esc(repo.description)}</div>` : ''}
    <div class="patch-author-row">
      <div class="patch-author-img">
        ${repo.owner?.avatar_url ? `<img src="${esc(repo.owner.avatar_url)}" alt="" loading="lazy">` : ''}
      </div>
      <div class="patch-author-name">
        <a href="https://github.com/${esc(repo.owner?.login)}" target="_blank" rel="noopener">${esc(repo.owner?.login)}</a>
      </div>
    </div>
    `
  )
  $(".patch-avatar").removeClass("sk sk-block").html(repo.owner?.avatar_url ? `<img src="${repo.owner.avatar_url}" alt="${repo.owner.login}" loading="lazy">` : '');

}

// // topic → css modifier
//   const TOPIC_CLASS = { texture: 'texture', model: 'model', vfx: 'vfx', ui: 'ui', sound: 'sound' };
//   function topicBadge(t) {
//     const cls = TOPIC_CLASS[t] ? `patch-topic topic-${t}` : 'patch-topic';
//     return `<span class="${cls}">${esc(t)}</span>`;
//   }
//   // Для демонстрации — если параметры не заданы, берём публичный репозиторий-пример
//   const OWNER = 'Trimitor';  // замените на свой дефолт
//   const REPO = 'WDM-patch'; // замените на свой дефолт
//   const DEMO_MODE = true; // показываем планку если нет параметров

//   const GH_API = `https://api.github.com/repos/${OWNER}/${REPO}`;
//   const RAW_README = `https://raw.githubusercontent.com/${OWNER}/${REPO}/HEAD/README.md`;

//   // ── render page ────────────────────────────────────────
//   function renderPage(repo, readmeHtml, releases) {
//     // update <title>
//     document.title = `${repo.name} — Патчи сообщества · WoW HD`;

//     // topics (exclude the index topic)
//     const topics = (repo.topics || []).filter(t => t !== 'wotlkhdclient');

//     // download link = latest release asset or repo zip
//     const latestRelease = releases[0];
//     const downloadUrl = latestRelease
//       ? (latestRelease.assets?.[0]?.browser_download_url || latestRelease.zipball_url)
//       : `${repo.html_url}/archive/refs/heads/${repo.default_branch}.zip`;
//     const downloadLabel = latestRelease
//       ? `<i class="fa-solid fa-download"></i> Скачать ${esc(latestRelease.tag_name)}`
//       : '<i class="fa-solid fa-download"></i> Скачать архив';

//     // readme block
//     const readmeBlock = readmeHtml
//       ? `<div class="readme-content">${readmeHtml}</div>`
//       : `<div class="readme-empty">
//         <div class="readme-empty-icon">📭</div>
//         <div class="readme-empty-title">README не найден</div>
//         <p>Автор не добавил описание к репозиторию.</p>
//        </div>`;

//     // releases sidebar
//     let releasesHtml = '';
//     if (releases.length) {
//       releasesHtml = `
//       <div class="sidebar-card">
//         <div class="sidebar-label">Релизы</div>
//         <div>
//           ${releases.slice(0, 4).map((r, i) => `
//             <div class="release-item">
//               <div class="release-dot${i > 0 ? ' old' : ''}"></div>
//               <div style="flex:1;min-width:0">
//                 <div class="release-name"><a href="${esc(r.html_url)}" target="_blank" rel="noopener">${esc(r.tag_name)}</a></div>
//                 <div class="release-date">${fmtDate(r.published_at)}</div>
//               </div>
//               ${i === 0 ? '<span class="release-badge">Новый</span>' : ''}
//             </div>`).join('')}
//         </div>
//         ${releases.length > 4 ? `<a href="${esc(repo.html_url)}/releases" target="_blank" style="font-size:12px;color:var(--accent-blue);text-decoration:none;display:block;margin-top:12px">Все релизы →</a>` : ''}
//       </div>`;
//     }

//     // license
//     const licenseStr = repo.license?.spdx_id || repo.license?.name || null;

//     document.getElementById('cpatch').innerHTML = `
//     ${DEMO_MODE ? `<div style="background:rgba(232,160,48,0.1);border-bottom:1px solid rgba(232,160,48,0.2);padding:10px 0;text-align:center;font-size:12px;color:rgba(232,160,48,0.8);letter-spacing:0.5px">
//       🔎 Демо-режим. Укажите параметры: <code style="color:var(--accent-blue)">?owner=ИМЯ&repo=РЕПОЗИТОРИЙ</code>
//     </div>` : ''}
//     <!-- HERO -->
//     <section class="patch-hero">
//       <div class="patch-hero-glow"></div>
//       <div class="patch-hero-grid"></div>
//       <div class="container">
//         <div class="patch-hero-inner">

//           <!-- Avatar -->
//           <div class="patch-avatar">
//             ${repo.owner?.avatar_url
//         ? `<img src="${esc(repo.owner.avatar_url)}" alt="${esc(repo.owner.login)}" loading="lazy">`
//         : '📦'}
//           </div>

//           <!-- Meta -->
//           <div class="patch-community-meta">
//             ${topics.length ? `<div class="patch-topics">${topics.map(topicBadge).join('')}</div>` : ''}
//             <div class="patch-name">${esc(repo.name)}</div>
//             ${repo.description ? `<div class="patch-desc-line">${esc(repo.description)}</div>` : ''}
//             <div class="patch-author-row">
//               <div class="patch-author-img">
//                 ${repo.owner?.avatar_url ? `<img src="${esc(repo.owner.avatar_url)}" alt="" loading="lazy">` : ''}
//               </div>
//               <div class="patch-author-name">
//                 <a href="https://github.com/${esc(repo.owner?.login)}" target="_blank" rel="noopener">${esc(repo.owner?.login)}</a>
//               </div>
//               ${licenseStr ? `<div class="license-badge">⚖️ ${esc(licenseStr)}</div>` : ''}
//             </div>
//             <div class="patch-stat-row">
//               <div class="stat-pill"><span class="stat-pill-icon"><i class="fa-solid fa-star"></i></span><strong>${fmtNum(repo.stargazers_count)}</strong>&nbsp;звёзд</div>
//               <div class="stat-pill"><span class="stat-pill-icon"><i class="fa-solid fa-code-fork"></i></span><strong>${fmtNum(repo.forks_count)}</strong>&nbsp;форков</div>
//               <div class="stat-pill"><span class="stat-pill-icon"><i class="fa-solid fa-eye"></i></span><strong>${fmtNum(repo.watchers_count)}</strong>&nbsp;следят</div>
//               <div class="stat-pill"><span class="stat-pill-icon"><i class="fa-solid fa-arrows-rotate"></i></span>Обновлён&nbsp;<strong>${fmtDateRel(repo.updated_at)}</strong></div>
//               ${repo.open_issues_count ? `<div class="stat-pill"><span class="stat-pill-icon"><i class="fa-solid fa-bug"></i></span><strong>${repo.open_issues_count}</strong>&nbsp;issues</div>` : ''}
//             </div>
//           </div>

//           <!-- Actions -->
//           <div class="patch-actions">
//             <a href="${esc(downloadUrl)}" target="_blank" rel="noopener" class="btn-primary">${downloadLabel}</a>
//             <a href="${esc(repo.html_url)}" target="_blank" rel="noopener" class="btn-secondary"><i class="fa-brands fa-github"></i> GitHub</a>
//             ${repo.homepage ? `<a href="${esc(repo.homepage)}" target="_blank" rel="noopener" class="btn-secondary"><i class="fa-solid fa-arrow-up-right-from-square"></i> Сайт</a>` : ''}
//           </div>

//         </div>
//       </div>
//     </section>

//     <!-- BODY -->
//     <div class="container">
//       <div class="patch-body">

//         <!-- README -->
//         <div class="readme-wrap">
//           <div class="readme-header">
//             <span class="readme-icon">📄</span>
//             <span class="readme-title">README</span>
//             <span class="readme-branch">${esc(repo.default_branch)}</span>
//           </div>
//           ${readmeBlock}
//         </div>

//         <!-- SIDEBAR -->
//         <div class="sidebar">

//           <!-- About -->
//           <div class="sidebar-card">
//             <div class="sidebar-label">Репозиторий</div>
//             <div class="info-list">
//               <div class="info-row">
//                 <span class="info-key"><span class="info-key-icon"><i class="fa-solid fa-calendar"></i></span>Создан</span>
//                 <span class="info-val">${fmtDate(repo.created_at)}</span>
//               </div>
//               <div class="info-row">
//                 <span class="info-key"><span class="info-key-icon"><i class="fa-solid fa-arrows-rotate"></i></span>Обновлён</span>
//                 <span class="info-val">${fmtDate(repo.updated_at)}</span>
//               </div>
//               <div class="info-row">
//                 <span class="info-key"><span class="info-key-icon"><i class="fa-solid fa-code-branch"></i></span>Ветка</span>
//                 <span class="info-val">${esc(repo.default_branch)}</span>
//               </div>
//               ${repo.language ? `
//               <div class="info-row">
//                 <span class="info-key"><span class="info-key-icon"><i class="fa-solid fa-square-binary"></i></span>Язык</span>
//                 <span class="info-val">${esc(repo.language)}</span>
//               </div>` : ''}
//               ${repo.size ? `
//               <div class="info-row">
//                 <span class="info-key"><span class="info-key-icon"><i class="fa-solid fa-box"></i></span>Размер</span>
//                 <span class="info-val">${repo.size > 1024 ? (repo.size / 1024).toFixed(1) + ' MB' : repo.size + ' KB'}</span>
//               </div>` : ''}
//               ${licenseStr ? `
//               <div class="info-row">
//                 <span class="info-key"><span class="info-key-icon">⚖️</span>Лицензия</span>
//                 <span class="info-val">${esc(licenseStr)}</span>
//               </div>` : ''}
//               <div class="info-row">
//                 <span class="info-key"><span class="info-key-icon"><i class="fa-brands fa-github"></i></span>GitHub</span>
//                 <span class="info-val"><a href="${esc(repo.html_url)}" target="_blank" rel="noopener">${esc(repo.full_name)}</a></span>
//               </div>
//               ${repo.homepage ? `
//               <div class="info-row">
//                 <span class="info-key"><span class="info-key-icon"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>Сайт</span>
//                 <span class="info-val"><a href="${esc(repo.homepage)}" target="_blank" rel="noopener">${esc(new URL(repo.homepage).hostname)}</a></span>
//               </div>` : ''}
//             </div>
//           </div>

//           <!-- Topics -->
//           ${topics.length ? `
//           <div class="sidebar-card">
//             <div class="sidebar-label">Теги</div>
//             <div class="topic-cloud">
//               ${topics.map(topicBadge).join('')}
//             </div>
//           </div>` : ''}

//           <!-- Releases -->
//           ${releasesHtml}

//           <!-- Warning -->
//           <div class="warn-card">
//             <span class="warn-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
//             <span>Патч создан участником сообщества и <strong>не проверен</strong> командой WoW HD. Устанавливайте на свой страх и риск и делайте резервную копию клиента.</span>
//           </div>

//         </div>
//       </div>
//     </div>`;

//     // make all README links open in new tab (safety)
//     document.querySelectorAll('.readme-content a').forEach(a => {
//       a.target = '_blank'; a.rel = 'noopener';
//     });
//   }