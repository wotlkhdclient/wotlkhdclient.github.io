// f.js

const API = "//dev.trimitor.ru/backend/api.php";

function log(...args) {
    console.log("LOG", ...args);
}
function notify(icon, message) {
    log(icon, message);
}

function getInfo(module, action, data = {}) {
    return fetch(API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            module,
            action,
            data
        })
    })
        .then(response => response.json())
        .then(result => {
            if (result.type === "error" || result.type === "warning") {
                notify(result.type, result.message || "Произошла ошибка");
            }
            return result;
        })
        .catch(error => {
            notify("error", error.message || error);
            throw error;
        });
}

function setInfo(module, action, data = {}) {
    return fetch(API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            module,
            action,
            data
        })
    })
        .then(response => response.json())
        .then(result => {
            if (result.type === "error" || result.type === "warning") {
                notify(result.type, result.message || "Произошла ошибка");
            }
            return result;
        })
        .catch(error => {
            notify("error", error.message || error);
            throw error;
        });
}

function renderModal(el, title, content) {
    let modal = document.getElementById("wh-modal");
    modal.querySelector(".wh-modal__title").textContent = title;
    modal.querySelector(".wh-modal__body").innerHTML = content;

    el.addEventListener('click', () => {
        const id = btn.dataset.modalOpen;
        document.getElementById(id).classList.add('open');
        document.body.classList.add('wh-modal-open');
    });
}

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


const TYPE_MAP = {
  updates: 'updates',
  fixes:   'fixes',
  changes: 'changes',
};

function renderChangelog(entries, index = null) {
  const list = index !== null ? [entries[index]] : entries;
  
  return list.map(entry => {
    const items = [
      ...entry.updates.map(text => renderItem(text, 'updates')),
      ...entry.changes.map(text => renderItem(text, 'changes')),
      ...entry.fixes.map(text =>   renderItem(text, 'fixes')),
    ].join('\n');

    let result = index !== null ? `${items}` : `<h3 class="download-cl-date">${entry.date}</h3>\n<ul>\n${items}\n</ul>`;

    return result;
  }).join('\n\n');
}

function renderItem(text, type) {
  return `<li class="download-cl-item">
  <span class="download-cl-dot download-cl-dot--${TYPE_MAP[type]}"></span>
  ${text.replace(/<p>(.*?)<\/p>/g, '$1')}
</li>`;
}