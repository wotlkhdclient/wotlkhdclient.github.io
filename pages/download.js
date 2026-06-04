export default async function ({ template, t }) {
  document.title = `${t.home_title} | WotLK HD Client`;
  return Mustache.render(template, { t });
}

export async function after({ params, query, t }) {

  // Reveal on scroll
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
}