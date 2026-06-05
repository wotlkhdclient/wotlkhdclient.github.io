export async function initHeader({ languages, currentLang, renderLangDropdown, setLanguage }) {
  renderLangDropdown(languages);
}

export async function initFooter() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}