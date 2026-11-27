export function embedUrl(id) {
  return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1&modestbranding=1';
}

if (typeof document !== 'undefined') {
  for (const box of document.querySelectorAll('.video[data-youtube]')) {
    const play = box.querySelector('.video__play');
    if (!play) continue;
    play.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = embedUrl(box.dataset.youtube);
      frame.title = 'Видео о поездках Kazakhstan Travel';
      frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      frame.setAttribute('allowfullscreen', '');
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      play.remove();
      box.append(frame);
    });
  }
}
