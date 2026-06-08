/**
 * marked-video.js
 *
 * Расширение для Marked, которое перехватывает синтаксис изображения
 * и рендерит видео если src — локальный видеофайл или ссылка YouTube.
 *
 * Использование:
 *   import { markedVideo } from './marked-video.js';
 *   marked.use(markedVideo());
 *
 * Синтаксис в markdown:
 *   ![любой alt](/assets/video/clip.mp4)
 *   ![любой alt](https://www.youtube.com/watch?v=XXXXXXXXXXX)
 *   ![любой alt](https://youtu.be/XXXXXXXXXXX)
 */

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|ogv|mov)(\?.*)?$/i;

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
];

function getYouTubeId(src) {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = src.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function markedVideo() {
  return {
    useNewRenderer: true,
    renderer: {
      image({ href, title, text }) {
        // ── YouTube ────────────────────────────────────────────
        const ytId = getYouTubeId(href);
        if (ytId) {
          const titleAttr = title ? ` title="${title}"` : '';
          return `
<div class="patch-video-wrap patch-video-wrap--youtube">
  <iframe
    src="https://www.youtube-nocookie.com/embed/${ytId}"
    title="${text || title || 'YouTube video'}"${titleAttr}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
    loading="lazy"
    class="patch-video patch-video--youtube"
  ></iframe>
</div>`.trim();
        }

        // ── Локальное видео ────────────────────────────────────
        if (VIDEO_EXTENSIONS.test(href)) {
          const titleAttr = title ? ` title="${title}"` : '';
          return `
<video
  src="${href}"
  controls
  preload="metadata"${titleAttr}
  class="patch-video patch-video--local"
>
  ${text ? `<p>${text}</p>` : ''}
</video>`.trim();
        }

        // ── Обычное изображение — стандартный рендер ──────────
        return false;
      }
    }
  };
}