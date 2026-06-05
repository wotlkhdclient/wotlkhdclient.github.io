export default async function ({ template, t }) {
  document.querySelector('title').setAttribute('data-t', 'notfound_title');
  document.title = t.notfound_title;
  return Mustache.render(template, { t });
}

export async function after({ params, query, t }) {
  // Stars
  const starsEl = document.getElementById('nfStars');
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('span');
    s.className = 'notfound-star';
    const size = Math.random() < .2 ? 2.5 : 1.5;
    s.style.cssText = [
      `left:${(Math.random() * 100).toFixed(1)}%`,
      `top:${(Math.random() * 70).toFixed(1)}%`,
      `width:${size}px`,
      `height:${size}px`,
      `animation-delay:${(Math.random() * 4).toFixed(2)}s`,
      `animation-duration:${(2 + Math.random() * 3).toFixed(1)}s`
    ].join(';');
    starsEl.appendChild(s);
  }

  // Snow
  const snowEl = document.getElementById('nfSnow');
  for (let i = 0; i < 40; i++) {
    const f = document.createElement('span');
    f.className = 'notfound-flake';
    const size = 1.5 + Math.random() * 3;
    const dx = (Math.random() * 80 - 40).toFixed(0);
    f.style.cssText = [
      `left:${(Math.random() * 100).toFixed(1)}%`,
      `width:${size.toFixed(1)}px`,
      `height:${size.toFixed(1)}px`,
      `--dx:${dx}px`,
      `animation-duration:${(8 + Math.random() * 12).toFixed(1)}s`,
      `animation-delay:${(Math.random() * 12).toFixed(1)}s`,
      `opacity:${(.25 + Math.random() * .45).toFixed(2)}`
    ].join(';');
    snowEl.appendChild(f);
  }
}
