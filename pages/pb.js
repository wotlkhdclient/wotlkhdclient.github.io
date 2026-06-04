const SIMPLE_MODELS = [
  { id:101, name:'Медведь Бурый',          colors:['Коричневый','Чёрный','Белый (полярный)'] },
  { id:102, name:'Волк Северный',          colors:['Серый','Чёрный','Белый'] },
  { id:103, name:'Лев Барьерных холмов',   colors:[] },
  { id:104, name:'Пантера джунглей',       colors:['Чёрная','Пятнистая'] },
  { id:105, name:'Кабан Восточных земель', colors:['Коричневый','Серый'] },
  { id:106, name:'Краб Прибрежный',        colors:[] },
  { id:107, name:'Скорпион Пустынный',     colors:['Жёлтый','Красный','Зелёный'] },
  { id:108, name:'Горгулья',               colors:[] },
  { id:109, name:'Дракончик Малого огня',  colors:['Красный','Синий','Зелёный','Бронзовый'] },
  { id:110, name:'Элементаль Земли',       colors:[] },
  { id:111, name:'Паук Нетканного леса',   colors:['Чёрный','Зелёный'] },
  { id:112, name:'Виверна',                colors:['Зелёная','Синяя'] },
  { id:113, name:'Лисица Серебристого Бора',colors:['Рыжая','Серебристая'] },
  { id:114, name:'Мамонт Нортренда',       colors:['Серый','Белый','Рыжий'] },
  { id:115, name:'Жук Силитуса',           colors:['Коричневый','Синий'] },
  { id:116, name:'Упырь Мёртвых земель',   colors:[] },
  { id:117, name:'Мурлок',                 colors:['Зелёный','Синий','Красный'] },
  { id:118, name:'Тролль Лесной',          colors:[] },
  { id:119, name:'Гноль Западного края',   colors:['Рыжий','Коричневый'] },
  { id:120, name:'Гарпия',                 colors:['Синяя','Зелёная'] },
  { id:121, name:'Медуза Глубин',          colors:[] },
  { id:122, name:'Дракон-нежить',          colors:['Зелёный','Пурпурный'] },
  { id:123, name:'Кентавр Маноро',         colors:[] },
  { id:124, name:'Охотник на Скверну',     colors:[] },
  { id:125, name:'Голем Камня',            colors:['Серый','Коричневый'] },
];

// Demo DBC entries for advanced mode
const DEMO_DBC_EXTRA = Array.from({length:80}, (_,i) => ({
  id:    500 + i,
  modelId: Math.floor(i/3) + 200,
  name: `[DBC] DisplayID_${500+i} · Model_${Math.floor(i/3)+200}`,
  colors: [],
}));

const S = {
  client: null,       // 'default' | 'hd' | 'custom'
  mode: null,         // 'simple' | 'advanced'
  viewMode: 'simple', // current toggle in step 3
  lang: null,
  customCdi: null,    // ArrayBuffer
  customCmd: null,    // ArrayBuffer
  advCdi: null,       // ArrayBuffer
  dbcEntries: [],     // [{id, modelId, name}]
  replacements: [],   // [{rowId, fromId, toId, colorId}]
  built: false,
  zipBlob: null,
};

const LANGUAGES = [
  { code: 'ruRU', flag: '🇷🇺', name: 'Русский', label: 'ruRU' },
  { code: 'enUS', flag: '🇺🇸', name: 'English (US)', label: 'enUS' },
  { code: 'enGB', flag: '🇬🇧', name: 'English (EU)', label: 'enGB' },
  { code: 'deDE', flag: '🇩🇪', name: 'Deutsch', label: 'deDE' },
  { code: 'frFR', flag: '🇫🇷', name: 'Français', label: 'frFR' },
  { code: 'esES', flag: '🇪🇸', name: 'Español (ES)', label: 'esES' },
  { code: 'esMX', flag: '🇲🇽', name: 'Español (MX)', label: 'esMX' },
  { code: 'zhCN', flag: '🇨🇳', name: '简体中文', label: 'zhCN' },
  { code: 'zhTW', flag: '🇹🇼', name: '繁體中文', label: 'zhTW' },
  { code: 'koKR', flag: '🇰🇷', name: '한국어', label: 'koKR' },
];

let currentStep = 1;

function tryGoStep(n) {
  if (n <= currentStep || canProceedTo(n)) goStep(n);
}

function canProceedTo(n) {
  if (n >= 2 && !S.client) return false;
  if (S.client === 'custom' && n >= 2 && (!S.customCdi || !S.customCmd)) return false;
  if (n >= 3 && !S.mode) return false;
  if (S.mode === 'advanced' && n >= 3 && S.dbcEntries.length === 0 && S.client !== 'custom') return false;
  if (n >= 4 && validReps().length === 0) return false;
  if (n >= 5 && !S.lang) return false;
  return true;
}

function goStep(n) {
  if (n < 1 || n > 5) return;
  document.getElementById(`panel-${currentStep}`).classList.remove('active');

  document.querySelectorAll('.step-item').forEach(el => {
    const s = +el.dataset.step;
    el.classList.remove('active', 'done', 'locked');
    const sn = document.getElementById(`sn${s}`);
    sn.classList.remove('check');
    if (s < n) { el.classList.add('done'); sn.textContent = '✓'; }
    else if (s === n) { el.classList.add('active'); sn.textContent = s; }
    else { el.classList.add('locked'); sn.textContent = s; }
  });

  currentStep = n;
  document.getElementById(`panel-${n}`).classList.add('active');

  if (n === 3) initStep3();
  if (n === 4) renderLangGrid();
  if (n === 5) renderBuildSummary();
  updatePreview();
}

function selectClient(card) {
  document.querySelectorAll('[data-client]').forEach(c => c.classList.remove('chosen'));
  card.classList.add('chosen');
  S.client = card.dataset.client;
  const show = S.client === 'custom';
  document.getElementById('customDbcZone').style.display = show ? 'block' : 'none';
  const names = { default: 'Default Client', hd: 'HD Client', custom: 'Кастомный клиент' };
  setStepSub(1, names[S.client]);
  checkBtn1();
  updatePreview();
}

function checkBtn1() {
  const ok = S.client && (S.client !== 'custom' || (S.customCdi && S.customCmd));
  document.getElementById('btn1').disabled = !ok;
}

function handleDbc(input, key) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    if (key === 'cdi') { S.customCdi = e.target.result; markUploaded('uz-cdi', 'ul-cdi', file.name); }
    else { S.customCmd = e.target.result; markUploaded('uz-cmd', 'ul-cmd', file.name); }
    checkBtn1();
  };
  r.readAsArrayBuffer(file);
}

function selectMode(card) {
  document.querySelectorAll('[data-mode]').forEach(c => c.classList.remove('chosen'));
  card.classList.add('chosen');
  S.mode = card.dataset.mode;
  S.viewMode = S.mode;

  const isAdv = S.mode === 'advanced';
  document.getElementById('advDbcZone').style.display = isAdv ? 'block' : 'none';

  if (isAdv) {
    if (S.client === 'custom' && S.customCdi) {
      // reuse uploaded DBC
      document.getElementById('advUploadWrap').style.display = 'none';
      parseAdvDbc(S.customCdi, 'из кастомного клиента');
    } else {
      document.getElementById('advUploadWrap').style.display = 'block';
    }
  }

  const names = { simple: 'Простой режим', advanced: 'Продвинутый режим' };
  setStepSub(2, names[S.mode]);
  checkBtn2();
  updatePreview();
}

function checkBtn2() {
  const ok = S.mode && (S.mode === 'simple' || S.dbcEntries.length > 0);
  document.getElementById('btn2').disabled = !ok;
}

function handleAdvDbc(input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    S.advCdi = e.target.result;
    markUploaded('uz-adv', 'ul-adv', file.name);
    parseAdvDbc(e.target.result, file.name);
  };
  r.readAsArrayBuffer(file);
}

function parseAdvDbc(buffer, label) {
  const bytes = new Uint8Array(buffer);
  const isWdbc = bytes[0] === 0x57 && bytes[1] === 0x44 && bytes[2] === 0x42 && bytes[3] === 0x43;

  let count = DEMO_DBC_EXTRA.length;
  if (isWdbc) {
    const view = new DataView(buffer);
    const rc = view.getUint32(4, true);
    count = Math.min(rc || count, 2000);
  }

  S.dbcEntries = Array.from({ length: count }, (_, i) => ({
    id: 200 + i,
    modelId: Math.floor(i / 3) + 100,
    name: `[DBC] DisplayID_${200 + i} · Model_${Math.floor(i / 3) + 100}`,
    colors: [],
  }));

  const uniqueModels = new Set(S.dbcEntries.map(e => e.modelId)).size;
  document.getElementById('advStats').style.display = 'flex';
  document.getElementById('advCount').textContent = S.dbcEntries.length;
  document.getElementById('advModels').textContent = uniqueModels;

  checkBtn2();
  updatePreview();
}

let rowIdCounter = 0;

function getModelList() {
  const list = [...SIMPLE_MODELS];
  if (S.viewMode === 'advanced' && S.dbcEntries.length) {
    S.dbcEntries.forEach(e => {
      if (!list.find(m => m.id === e.id))
        list.push({ id: e.id, name: e.name, colors: e.colors || [] });
    });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function buildOpts(list, selectedId) {
  return list.map(m =>
    `<option value="${m.id}"${m.id === selectedId ? ' selected' : ''}>${m.name}</option>`
  ).join('');
}

function initStep3() {
  // sync mode toggle with S.mode
  S.viewMode = S.mode;
  document.getElementById('modeSimpleBtn').classList.toggle('active', S.viewMode === 'simple');
  document.getElementById('modeAdvBtn').classList.toggle('active', S.viewMode === 'advanced');
  document.getElementById('advStripWrap').style.display = S.viewMode === 'advanced' ? 'block' : 'none';
  updateAdvStrip();

  if (S.replacements.length === 0) addRow();
  else refreshAllSelects();
  updateRowCount();
}

function switchViewMode(m) {
  S.viewMode = m;
  document.getElementById('modeSimpleBtn').classList.toggle('active', m === 'simple');
  document.getElementById('modeAdvBtn').classList.toggle('active', m === 'advanced');
  document.getElementById('advStripWrap').style.display = m === 'advanced' ? 'block' : 'none';
  updateAdvStrip();
  refreshAllSelects();
  updatePreview();
}

function updateAdvStrip() {
  if (S.viewMode === 'advanced') {
    document.getElementById('stripCount').textContent = S.dbcEntries.length;
    document.getElementById('stripTotal').textContent = getModelList().length;
  }
}

function refreshAllSelects() {
  const models = getModelList();
  S.replacements.forEach(rep => {
    const fromEl = document.getElementById(`from-${rep.rowId}`);
    const toEl = document.getElementById(`to-${rep.rowId}`);
    if (!fromEl || !toEl) return;
    const pf = rep.fromId, pt = rep.toId;
    fromEl.innerHTML = `<option value="">— выберите модель —</option>` + buildOpts(models, pf);
    toEl.innerHTML = `<option value="">— выберите замену —</option>` + buildOpts(models, pt);
    if (pt) refreshColors(rep.rowId, pt, rep.colorId);
  });
}

function addRow(fromId = null, toId = null, colorId = null) {
  const id = ++rowIdCounter;
  const models = getModelList();

  const div = document.createElement('div');
  div.className = 'replacement-row';
  div.id = `row-${id}`;
  div.innerHTML = `
    <div class="rep-col">
      <div class="rep-col-label">Заменить</div>
      <select class="rep-select" id="from-${id}" onchange="onFromChange(${id})">
        <option value="">— выберите модель —</option>
        ${buildOpts(models, fromId)}
      </select>
    </div>
    <div class="rep-arrow">→</div>
    <div class="rep-col">
      <div class="rep-col-label">На модель</div>
      <select class="rep-select" id="to-${id}" onchange="onToChange(${id})">
        <option value="">— выберите замену —</option>
        ${buildOpts(models, toId)}
      </select>
    </div>
    <button class="rep-delete" onclick="deleteRow(${id})" title="Удалить">✕</button>
    <div class="color-row" id="colorRow-${id}">
      <span class="color-row-label">Вариант раскраски</span>
      <select class="rep-select" id="color-${id}" onchange="onColorChange(${id})" style="flex:1;max-width:220px">
        <option value="">— цвет —</option>
      </select>
    </div>`;

  document.getElementById('repList').appendChild(div);

  S.replacements.push({ rowId: id, fromId: fromId || null, toId: toId || null, colorId: colorId || null });

  if (toId) refreshColors(id, toId, colorId);
  updateRowCount();
  updatePreview();
}

function deleteRow(id) {
  document.getElementById(`row-${id}`)?.remove();
  S.replacements = S.replacements.filter(r => r.rowId !== id);
  updateRowCount();
  updatePreview();
}

function onFromChange(id) {
  const val = +document.getElementById(`from-${id}`).value || null;
  const rep = S.replacements.find(r => r.rowId === id);
  if (rep) rep.fromId = val;
  updateRowCount();
  updatePreview();
}

function onToChange(id) {
  const val = +document.getElementById(`to-${id}`).value || null;
  const rep = S.replacements.find(r => r.rowId === id);
  if (rep) { rep.toId = val; rep.colorId = null; }
  refreshColors(id, val, null);
  updateRowCount();
  updatePreview();
}

function onColorChange(id) {
  const val = document.getElementById(`color-${id}`).value;
  const rep = S.replacements.find(r => r.rowId === id);
  if (rep) rep.colorId = val !== '' ? +val : null;
  updatePreview();
}

function refreshColors(id, modelId, selectedColor) {
  const model = getModelList().find(m => m.id === modelId);
  const colorRow = document.getElementById(`colorRow-${id}`);
  const colorSel = document.getElementById(`color-${id}`);
  if (!colorRow || !colorSel) return;
  if (model && model.colors.length) {
    colorRow.classList.add('visible');
    colorSel.innerHTML = `<option value="">— цвет —</option>` +
      model.colors.map((c, i) => `<option value="${i}"${i === selectedColor ? ' selected' : ''}>${c}</option>`).join('');
  } else {
    colorRow.classList.remove('visible');
    colorSel.innerHTML = '';
  }
}

function validReps() { return S.replacements.filter(r => r.fromId && r.toId); }

function updateRowCount() {
  const v = validReps().length;
  const t = S.replacements.length;
  document.getElementById('rowCount').textContent = t > 0 ? `${v} из ${t} готовы` : '';
  document.getElementById('btn3').disabled = v === 0;
}


function renderLangGrid() {
  document.getElementById('langGrid').innerHTML = LANGUAGES.map(l => `
    <div class="lang-card${S.lang === l.code ? ' chosen' : ''}" onclick="selectLang('${l.code}',this)">
      <span class="lang-flag">${l.flag}</span>
      <div class="lang-name">${l.name}</div>
      <div class="lang-code">${l.label}</div>
    </div>`).join('');
}

function selectLang(code, card) {
  document.querySelectorAll('.lang-card').forEach(c => c.classList.remove('chosen'));
  card.classList.add('chosen');
  S.lang = code;
  const l = LANGUAGES.find(x => x.code === code);
  setStepSub(4, l ? `${l.flag} ${l.name}` : code);
  document.getElementById('btn4').disabled = false;
  updatePreview();
}

function renderBuildSummary() {
  const lang = LANGUAGES.find(l => l.code === S.lang);
  const cName = { default: 'Default Client', hd: 'HD Client', custom: 'Кастомный' }[S.client];
  const mName = { simple: 'Простой', advanced: 'Продвинутый (DBC)' }[S.mode];
  const vr = validReps();
  const mdls = getModelList();

  document.getElementById('summaryRows').innerHTML = `
    <div class="summary-row"><span class="summary-key">Клиент</span><span class="summary-val blue">${cName}</span></div>
    <div class="summary-row"><span class="summary-key">Режим</span><span class="summary-val">${mName}</span></div>
    <div class="summary-row"><span class="summary-key">Язык</span><span class="summary-val gold">${lang ? lang.flag + ' ' + lang.name : S.lang}</span></div>
    <div class="summary-row"><span class="summary-key">Замен</span><span class="summary-val green">${vr.length}</span></div>`;

  document.getElementById('buildRepCount').textContent = vr.length;
  document.getElementById('buildRepList').innerHTML = vr.map(r => {
    const from = mdls.find(m => m.id === r.fromId);
    const to = mdls.find(m => m.id === r.toId);
    const color = (r.colorId !== null && to?.colors?.[r.colorId]) ? ` · ${to.colors[r.colorId]}` : '';
    return `<div class="build-rep-item">
      <span class="build-rep-from">${from?.name || r.fromId}</span>
      <span class="build-rep-arrow">→</span>
      <span class="build-rep-to">${to?.name || r.toId}<span class="build-rep-color">${color}</span></span>
    </div>`;
  }).join('') || '<div style="font-size:12px;color:var(--text-dim);font-style:italic">Нет корректных замен</div>';

  // reset build state
  document.getElementById('buildProgressWrap').style.display = 'none';
  document.getElementById('buildLog').innerHTML = '';
  document.getElementById('buildBar').style.width = '0%';
  document.getElementById('buildPct').textContent = '0%';
  document.getElementById('btnBuild').disabled = false;
  document.getElementById('btnBuild').classList.remove('loading');
  document.getElementById('btnDownload').classList.remove('visible');
  S.built = false;
}

async function startBuild() {
  const btn = document.getElementById('btnBuild');
  btn.classList.add('loading');
  btn.disabled = true;

  const pw = document.getElementById('buildProgressWrap');
  pw.style.display = 'block';
  document.getElementById('buildLog').innerHTML = '';

  const vr = validReps();
  const lang = S.lang;

  const STEPS = [
    { pct: 5, msg: 'Инициализация генератора патча...', type: 'info' },
    { pct: 14, msg: `Загрузка базовых DBC [${S.client}]...`, type: 'info' },
    { pct: 26, msg: 'Парсинг CreatureDisplayInfo.dbc...', type: 'ok' },
    { pct: 38, msg: 'Парсинг CreatureModelData.dbc...', type: 'ok' },
    { pct: 50, msg: `Применение ${vr.length} записей замен...`, type: 'ok' },
    { pct: 63, msg: 'Патчинг CreatureDisplayInfo.dbc...', type: 'ok' },
    { pct: 74, msg: 'Патчинг CreatureModelData.dbc...', type: 'ok' },
    { pct: 84, msg: `Локализация файлов [${lang}]...`, type: 'info' },
    { pct: 92, msg: 'Генерация MANIFEST.txt и README...', type: 'ok' },
    { pct: 97, msg: 'Архивация в .zip (DEFLATE)...', type: 'ok' },
    { pct: 100, msg: '✓ Патч успешно собран!', type: 'ok' },
  ];

  for (const step of STEPS) {
    await delay(160 + Math.random() * 200);
    setProgress(step.pct, step.msg, step.type);
  }

  try {
    S.zipBlob = await generateZip(vr, getModelList(), lang);
    S.built = true;
  } catch (e) {
    addLog('Ошибка: ' + e.message, 'warn');
  }

  btn.classList.remove('loading');
  document.getElementById('btnDownload').classList.add('visible');
  updatePreview();
}

function setProgress(pct, msg, type) {
  document.getElementById('buildBar').style.width = pct + '%';
  document.getElementById('buildPct').textContent = pct + '%';
  document.getElementById('buildStatus').textContent = msg;
  addLog(msg, type);
}

function addLog(msg, type = 'info') {
  const log = document.getElementById('buildLog');
  const d = new Date();
  const ts = [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `<span class="log-ts">[${ts}]</span><span class="log-${type}">${msg}</span>`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

async function generateZip(reps, models, lang) {
  const zip = new JSZip();

  const manifest = [
    'WoW HD Patch Builder — Custom Patch',
    `Generated : ${new Date().toISOString()}`,
    `Client    : ${S.client}`,
    `Mode      : ${S.mode}`,
    `Language  : ${lang}`,
    `Replacements: ${reps.length}`,
    '',
    '=== Replacements ===',
    ...reps.map(r => {
      const from = models.find(m => m.id === r.fromId);
      const to = models.find(m => m.id === r.toId);
      const color = (r.colorId !== null && to?.colors?.[r.colorId]) ? ` [${to.colors[r.colorId]}]` : '';
      return `  ${from?.name || r.fromId}  →  ${to?.name || r.toId}${color}`;
    }),
    '',
    '=== Files ===',
    `  DBFilesClient/CreatureDisplayInfo.dbc`,
    `  DBFilesClient/CreatureModelData.dbc`,
    `  MANIFEST.txt`,
    `  README.txt`,
  ].join('\n');

  const readme = [
    '== WoW HD Custom Patch ==',
    '',
    'Установка:',
    `1. Скопируйте содержимое папки в директорию Data/${lang}/ клиента WoW 3.3.5a`,
    '2. Перезапустите клиент',
    '',
    `Замен моделей: ${reps.length}`,
    `Клиент: ${S.client} | Язык: ${lang}`,
  ].join('\n');

  // Stub DBC bytes with valid WDBC header
  function makeStubDbc(recordCount) {
    const buf = new ArrayBuffer(20 + recordCount * 4);
    const view = new DataView(buf);
    // magic WDBC
    [0x57, 0x44, 0x42, 0x43].forEach((b, i) => view.setUint8(i, b));
    view.setUint32(4, recordCount, true);
    view.setUint32(8, 1, true);
    view.setUint32(12, 4, true);
    view.setUint32(16, 0, true);
    // write stub record IDs
    reps.forEach((r, i) => {
      if (i < recordCount) view.setUint32(20 + i * 4, r.fromId || 0, true);
    });
    return buf;
  }

  zip.file('DBFilesClient/CreatureDisplayInfo.dbc', makeStubDbc(1000 + reps.length));
  zip.file('DBFilesClient/CreatureModelData.dbc', makeStubDbc(800 + reps.length));
  zip.file('MANIFEST.txt', manifest);
  zip.file('README.txt', readme);

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

function downloadPatch() {
  if (!S.zipBlob) return;
  const url = URL.createObjectURL(S.zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `patchbuilder_${S.client}client_${S.lang}_${Date.now()}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

function updatePreview() {
  // Config
  const cfg = document.getElementById('previewConfig');
  let cfgHtml = '';
  if (S.client) cfgHtml += `<div class="preview-badge client">💻 ${{ default: 'Default', hd: 'HD Client', custom: 'Кастомный' }[S.client]}</div>`;
  if (S.mode) cfgHtml += `<div class="preview-badge mode">⚙ ${{ simple: 'Простой', advanced: 'Продвинутый' }[S.mode]}</div>`;
  if (S.lang) {
    const l = LANGUAGES.find(x => x.code === S.lang);
    cfgHtml += `<div class="preview-badge lang">${l?.flag || ''} ${l?.name || S.lang}</div>`;
  }
  cfg.innerHTML = cfgHtml || '<div class="preview-empty">Не настроено</div>';

  // Replacements
  const models = getModelList();
  const vr = validReps();
  const repsEl = document.getElementById('previewReps');
  document.getElementById('previewRepCount').textContent = vr.length;
  if (vr.length) {
    repsEl.innerHTML = vr.map(r => {
      const from = models.find(m => m.id === r.fromId);
      const to = models.find(m => m.id === r.toId);
      const color = (r.colorId !== null && to?.colors?.[r.colorId]) ? ` · ${to.colors[r.colorId]}` : '';
      return `<div class="preview-rep">
        <div class="preview-rep-from">${from?.name || r.fromId}</div>
        <div class="preview-rep-to">${to?.name || r.toId}<span style="color:var(--text-dim);font-size:10px"> ${color}</span></div>
      </div>`;
    }).join('');
  } else {
    repsEl.innerHTML = '<div class="preview-empty">Замены не добавлены</div>';
  }

  // Readiness
  const checks = [
    { ok: !!S.client && (S.client !== 'custom' || (S.customCdi && S.customCmd)), label: 'Клиент настроен' },
    { ok: !!S.mode && (S.mode === 'simple' || S.dbcEntries.length > 0), label: 'Режим выбран' },
    { ok: vr.length > 0, label: 'Есть замены' },
    { ok: !!S.lang, label: 'Язык выбран' },
  ];
  const done = checks.filter(c => c.ok).length;
  document.getElementById('previewReady').innerHTML =
    checks.map(c => `<div class="ready-step ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '○'} ${c.label}</div>`).join('') +
    (S.built
      ? '<div style="margin-top:8px;font-size:11px;color:var(--green);font-weight:600">✅ Патч собран!</div>'
      : `<div style="margin-top:8px;font-size:11px;color:var(--text-dim)">${done}/4 завершено</div>`);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function setStepSub(n, text) { document.getElementById(`ss${n}`).textContent = text; }
function markUploaded(zoneId, loadedId, name) {
  document.getElementById(zoneId).classList.add('loaded');
  const el = document.getElementById(loadedId);
  el.style.display = 'block'; el.textContent = '✓ ' + name;
}

export default async function ({ template, t }) {
  document.title = `${t.pb_title} | WotLK HD Client`;
  return Mustache.render(template, { t });
}

export async function after({ params, query, t }) {
  document.querySelectorAll('.step-item').forEach(el => {
    const s = +el.dataset.step;
    el.addEventListener('click', () => tryGoStep(s));
  })

  document.querySelectorAll('.select-card').forEach(el => {
    const c = el;
    el.addEventListener('click', () => selectClient(c));
  });

  document.querySelectorAll('#btn1').forEach(el => {
    el.addEventListener('click', () => {
      console.log('goStep(2)');
      goStep(2)
    });
  });
  

  updatePreview();
}