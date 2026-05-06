(function(){
  'use strict';

  // === Mobile menu toggle ===
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // === Fade-in scroll (IntersectionObserver) ===
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // === TOC active highlight ===
  const tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length) {
    const sections = Array.from(tocLinks).map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const activate = () => {
      const y = window.scrollY + 120;
      let current = sections[0];
      sections.forEach(s => { if (s.offsetTop <= y) current = s; });
      tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));
    };
    window.addEventListener('scroll', activate, { passive: true });
    activate();
  }

  // === Year footer auto ===
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
