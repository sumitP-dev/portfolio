/* Portfolio interactions
 * Libraries (loaded from CDN in index.html):
 *   GSAP + ScrollTrigger + SplitText — animations
 *   Lenis — smooth scrolling
 * Everything degrades gracefully: if a library fails to load, or the visitor
 * prefers reduced motion, content is simply shown without the effects.
 */

const TIMEZONE = 'Asia/Kolkata'; // used by the footer clock — change to your own

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

/* ---------- Basics (always on) ---------- */
$('#year').textContent = new Date().getFullYear();

const clock = $('#clock');
const tick = () => {
  try {
    clock.textContent = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE }).format(new Date());
  } catch (e) { clock.parentElement.remove(); }
};
tick(); setInterval(tick, 30_000);

$('#themeToggle').addEventListener('click', () => {
  const current = root.dataset.theme ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
});

/* ---------- Smooth scroll (Lenis) ---------- */
let lenis = null;
if (!reduceMotion && typeof window.Lenis !== 'undefined') {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  if (hasGSAP) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

// In-page links: smooth scroll with offset for the sticky nav
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -72 });
    else if (target === 0) scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

/* ---------- Mobile menu ---------- */
const menuBtn = $('#menuToggle');
const menu = $('#mobileMenu');
function openMenu() {
  menu.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  menuBtn.setAttribute('aria-label', 'Close menu');
  lenis?.stop();
  if (hasGSAP && !reduceMotion) {
    gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .6, ease: 'expo.out' });
    gsap.fromTo($$('a', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .06, duration: .7, ease: 'expo.out', delay: .1 });
  }
}
function closeMenu() {
  if (menu.hidden) return;
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Open menu');
  lenis?.start();
  if (hasGSAP && !reduceMotion) {
    gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: .45, ease: 'expo.in', onComplete: () => { menu.hidden = true; } });
  } else {
    menu.hidden = true;
  }
}
menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ---------- Nav: background when scrolled, hide on scroll down ---------- */
const nav = $('.nav');
let lastY = scrollY;
const onScroll = () => {
  const y = scrollY;
  nav.classList.toggle('is-scrolled', y > 10);
  nav.classList.toggle('is-hidden', y > 400 && y > lastY && menu.hidden);
  lastY = y;
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Fallback: no GSAP or reduced motion ---------- */
function showEverything() {
  $('.loader')?.remove();
  $('#heroTitle').style.visibility = 'visible';
  $$('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
  const items = $$('.reveal, .hero-in');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));
}

if (!hasGSAP || reduceMotion) {
  showEverything();
} else {
  initAnimations();
}

/* ---------- GSAP animations ---------- */
function initAnimations() {
  const hasSplit = typeof window.SplitText !== 'undefined';
  gsap.registerPlugin(ScrollTrigger, ...(hasSplit ? [SplitText] : []));

  // Safety net: never leave the loader stuck
  const loaderTimeout = setTimeout(() => $('.loader')?.remove(), 5000);

  /* Intro: loader counts to 100, wipes away, hero animates in */
  const counter = { v: 0 };
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .from('.loader__name', { yPercent: 110, duration: .9 })
    .to(counter, {
      v: 100, duration: 1.1, ease: 'power2.inOut',
      onUpdate: () => { $('.loader__count').textContent = Math.round(counter.v); },
    }, '<')
    .to('.loader__inner', { yPercent: -110, opacity: 0, duration: .5, ease: 'power3.in' })
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.inOut' }, '-=.15')
    .add(() => { clearTimeout(loaderTimeout); $('.loader')?.remove(); })
    .set('#heroTitle', { visibility: 'visible' }, '-=.55')
    .from('#heroTitle .line__in', { yPercent: 110, rotate: 3, duration: 1.3, stagger: .1 }, '-=.55')
    .to('.hero-in', { opacity: 1, y: 0, duration: 1.1, stagger: .1 }, '-=1')
    .from('.hero__bg', { opacity: 0, scale: 1.15, duration: 2, ease: 'power2.out' }, '-=1.4')
    .add(countUp, '-=1');

  function countUp() {
    $$('[data-count]').forEach((el) => {
      const o = { v: 0 };
      gsap.to(o, { v: +el.dataset.count, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } });
    });
  }

  /* Portrait: badges pop in then float gently; photo drifts on scroll */
  gsap.set('.portrait__img', { scale: 1.08 }); // matches the CSS scale; leaves room for parallax
  gsap.from('.badge', { scale: .6, opacity: 0, duration: .9, stagger: .15, ease: 'back.out(1.8)', delay: 3 });
  $$('.badge').forEach((b, i) => {
    gsap.to(b, { y: i % 2 ? 10 : -10, duration: 2.4 + i * .4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * .3 });
  });
  gsap.to('.portrait__img', {
    yPercent: 3, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  /* Scroll progress bar */
  gsap.to('.progress', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: .3 },
  });

  /* Generic reveal, batched so items in view together stagger nicely */
  gsap.set('.reveal', { opacity: 0, y: 40 });
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: .1, ease: 'expo.out', overwrite: true }),
  });

  /* Hero: content drifts and fades as you scroll past */
  gsap.to('.hero__inner', {
    yPercent: -12, opacity: .3, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  /* Marquee skews with scroll speed */
  const tracks = $$('.marquee__track');
  const skew = gsap.quickTo(tracks, 'skewX', { duration: .5, ease: 'power3' });
  ScrollTrigger.create({
    onUpdate: (self) => skew(gsap.utils.clamp(-12, 12, self.getVelocity() / -250)),
  });

  if (hasSplit) {
    /* About: words light up as you read */
    const about = SplitText.create('.about__big', { type: 'words', wordsClass: 'word' });
    gsap.to(about.words, {
      opacity: 1, stagger: .05, ease: 'none',
      scrollTrigger: { trigger: '.about__big', start: 'top 80%', end: 'bottom 45%', scrub: true },
    });

    /* Contact title: characters rise from a mask */
    SplitText.create('.contact__title', {
      type: 'lines, chars', mask: 'lines', autoSplit: true,
      onSplit: (self) => gsap.from(self.chars, {
        yPercent: 110, duration: 1.1, stagger: .018, ease: 'expo.out',
        scrollTrigger: { trigger: '.contact__title', start: 'top 85%' },
      }),
    });
  }

  /* Projects: visuals scale/clip in, mockups parallax */
  $$('.project__visual').forEach((vis) => {
    gsap.from(vis, {
      clipPath: 'inset(12% 12% 12% 12% round 22px)', scale: .92, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: vis, start: 'top 85%' },
    });
    gsap.fromTo(vis.querySelector('[data-depth]'), { y: 60 }, {
      y: -60, ease: 'none',
      scrollTrigger: { trigger: vis, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.fromTo(vis.querySelector('.project__index'), { y: 40 }, {
      y: -40, ease: 'none',
      scrollTrigger: { trigger: vis, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* Timeline line draws as you scroll */
  const timeline = $('.timeline');
  timeline.style.setProperty('--progress', 0);
  gsap.to(timeline, {
    '--progress': 1, ease: 'none',
    scrollTrigger: { trigger: timeline, start: 'top 70%', end: 'bottom 60%', scrub: true },
  });

  /* Active nav link follows the section in view */
  $$('section[id]').forEach((sec) => {
    const link = $(`.nav__links a[href="#${sec.id}"]`);
    if (!link) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => link.classList.toggle('is-active', self.isActive),
    });
  });

  if (finePointer) initPointerEffects();

  // Fonts can shift layout — recalculate trigger positions once loaded
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

/* ---------- Pointer effects (desktop only) ---------- */
function initPointerEffects() {
  /* Custom cursor */
  const cursor = $('.cursor');
  const dotX = gsap.quickTo('.cursor__dot', 'x', { duration: .1 });
  const dotY = gsap.quickTo('.cursor__dot', 'y', { duration: .1 });
  const ringX = gsap.quickTo('.cursor__ring', 'x', { duration: .45, ease: 'power3' });
  const ringY = gsap.quickTo('.cursor__ring', 'y', { duration: .45, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    cursor.classList.add('is-active');
    dotX(e.clientX); dotY(e.clientY); ringX(e.clientX); ringY(e.clientY);
  });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
  document.addEventListener('pointerover', (e) => {
    cursor.classList.toggle('is-hover', !!e.target.closest('a, button, [data-tilt]'));
  });

  /* Magnetic buttons */
  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1, .4)' });
    const y = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1, .4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * .3);
      y((e.clientY - r.top - r.height / 2) * .3);
    });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });

  /* 3D tilt + light sheen on project visuals */
  $$('[data-tilt]').forEach((el) => {
    gsap.set(el, { transformPerspective: 1000 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: .8, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: .8, ease: 'power3' });
    const inner = el.querySelector('[data-depth]');
    const ix = gsap.quickTo(inner, 'x', { duration: .8, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5;
      const py = (e.clientY - r.top) / r.height - .5;
      rx(py * -8); ry(px * 10); ix(px * 24);
      el.style.setProperty('--mx', `${(px + .5) * 100}%`);
      el.style.setProperty('--my', `${(py + .5) * 100}%`);
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); ix(0); });
  });

  /* Spotlight on skill cards */
  $$('.skill-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* Portrait layers shift at different depths with the mouse */
  const portrait = $('[data-portrait]');
  if (portrait) {
    const imgX = gsap.quickTo('.portrait__img', 'x', { duration: 1, ease: 'power3' });
    const bgX = gsap.quickTo('.portrait__backdrop', 'x', { duration: 1, ease: 'power3' });
    const bgY = gsap.quickTo('.portrait__backdrop', 'y', { duration: 1, ease: 'power3' });
    $('.hero').addEventListener('pointermove', (e) => {
      const px = e.clientX / innerWidth - .5;
      const py = e.clientY / innerHeight - .5;
      imgX(px * 14); bgX(px * -18); bgY(py * -12);
    });
  }

  /* Hero blobs follow the mouse a little */
  const blobs = $$('.blob');
  const hero = $('.hero');
  hero.addEventListener('pointermove', (e) => {
    const px = e.clientX / innerWidth - .5;
    const py = e.clientY / innerHeight - .5;
    // Uses CSS vars feeding the `translate` property so it doesn't fight the CSS float animation
    blobs.forEach((b, i) => gsap.to(b, { '--px': `${px * 60 * (i + 1)}px`, '--py': `${py * 40 * (i + 1)}px`, duration: 1.6, ease: 'power3', overwrite: 'auto' }));
  });
}
