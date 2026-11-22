/**
 * APEX MOTORS — Shared Navigation & Page Transitions
 * Provides: scroll-aware nav, active link highlighting,
 * smooth fade transitions between pages, scroll reveal.
 */

(function () {
  /* ─── Page transition overlay ─── */
  const overlay = document.createElement('div');
  overlay.id = 'page-transition-overlay';
  document.body.appendChild(overlay);

  /* Fade in on load */
  window.addEventListener('DOMContentLoaded', () => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 600);
  });

  /* Intercept internal link clicks → fade out → navigate */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    const isInternal =
      href &&
      !href.startsWith('http') &&
      !href.startsWith('//') &&
      !href.startsWith('mailto:') &&
      !href.startsWith('tel:') &&
      !href.startsWith('#') &&
      link.target !== '_blank';

    if (!isInternal) return;

    e.preventDefault();
    const destination = href;

    const newOverlay = document.createElement('div');
    newOverlay.id = 'page-transition-overlay';
    document.body.appendChild(newOverlay);

    // Force reflow to make transition visible
    newOverlay.getBoundingClientRect();
    newOverlay.classList.add('fade-in');

    setTimeout(() => {
      window.location.href = destination;
    }, 420);
  });

  /* ─── Scrolled nav ─── */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 60) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on load
  }

  /* ─── Active nav link ─── */
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const linkFile = a.getAttribute('href').split('/').pop();
    if (
      linkFile === currentFile ||
      (currentFile === '' && linkFile === 'index.html')
    ) {
      a.classList.add('nav-active');
    }
  });

  /* ─── Scroll reveal ─── */
  document.addEventListener('DOMContentLoaded', () => {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  });
})();
