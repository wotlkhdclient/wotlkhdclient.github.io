export async function initHeader({ languages, currentLang, renderLangDropdown, setLanguage }) {
  renderLangDropdown(languages);

  const trigger   = document.getElementById('langTrigger');
  const wrap      = document.getElementById('navLang');
  const dropdown  = document.getElementById('langDropdown');
  const burger    = document.getElementById('navBurger');
  const navLinks  = document.getElementById('navLinks');

  const isMobile = () => window.innerWidth <= 768;

  function openLangMobile() {
    if (!dropdown) return;
    dropdown.style.transition = 'none';
    dropdown.style.maxHeight  = 'none';
    const full = dropdown.scrollHeight;
    dropdown.style.maxHeight  = '0';
    dropdown.getBoundingClientRect();
    dropdown.style.transition = '';
    dropdown.style.maxHeight  = Math.min(full, 224) + 'px';
    dropdown.style.overflowY  = full > 224 ? 'auto' : 'hidden';
  }

  function closeLangMobile() {
    if (!dropdown) return;
    dropdown.style.maxHeight = '0';
    dropdown.style.overflowY = 'hidden';
  }

  trigger?.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = wrap.classList.toggle('open');
    if (isMobile()) {
      isOpen ? openLangMobile() : closeLangMobile();
    }
  });

  document.addEventListener('click', e => {
    if (!wrap?.contains(e.target)) {
      wrap?.classList.remove('open');
      if (isMobile()) closeLangMobile();
    }
  });

  burger?.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    if (!isOpen) {
      wrap?.classList.remove('open');
      closeLangMobile();
    }
  });

  navLinks?.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger?.classList.remove('open');
      burger?.setAttribute('aria-expanded', 'false');
    });
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      navLinks?.classList.remove('open');
      burger?.classList.remove('open');
      burger?.setAttribute('aria-expanded', 'false');
      wrap?.classList.remove('open');
      if (dropdown) {
        dropdown.style.maxHeight  = '';
        dropdown.style.overflowY  = '';
        dropdown.style.transition = '';
      }
    }
  });
}

export async function initFooter() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}