// Sticky navbar shadow on scroll
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('navbar-scrolled', window.scrollY > 20);
  });
}

// Scroll spy logic for homepage navigation active states
const spySections = ['home', 'services'].map(id => document.getElementById(id)).filter(el => el !== null);
const spyDesktopLinks = document.querySelectorAll('nav:not(#nav-menu) a[href^="#"]');
const spyMobileLinks = document.querySelectorAll('nav#nav-menu a[href^="#"]');

if (spySections.length > 0) {
  const handleScrollSpy = () => {
    let activeId = 'home';
    const scrollPos = window.scrollY + 120; // Offset for navbar height

    spySections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        activeId = sec.getAttribute('id');
      }
    });

    // Update Desktop nav classes
    spyDesktopLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${activeId}`) {
        link.classList.add('active', 'text-brand-cyan');
        link.classList.remove('text-gray-700');
      } else {
        link.classList.remove('active', 'text-brand-cyan');
        link.classList.add('text-gray-700');
      }
    });

    // Update Mobile nav classes
    spyMobileLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${activeId}`) {
        link.classList.add('text-brand-cyan', 'font-semibold');
        link.classList.remove('text-gray-700', 'font-medium');
      } else {
        link.classList.remove('text-brand-cyan', 'font-semibold');
        link.classList.add('text-gray-700', 'font-medium');
      }
    });
  };

  window.addEventListener('scroll', handleScrollSpy);
  handleScrollSpy(); // Run initially
}

// Hamburger menu toggle for mobile navigation
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');
if (hamburger && navMenu) {
  hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    hamburger.classList.toggle('open');
  });
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });
}

// Form submission AJAX handler (using Formspree)
const form = document.getElementById('contact-form');
const success = document.getElementById('form-success');
const errorBanner = document.getElementById('form-error');
const btn = document.getElementById('submit-btn');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const required = form.querySelectorAll('[required]');
    let valid = true;
    
    // Check required fields
    required.forEach(el => {
      if (!el.value.trim()) {
        el.style.borderColor = '#f87171';
        valid = false;
      } else {
        el.style.borderColor = '';
      }
    });

    // Validate email format if populated
    const emailEl = form.querySelector('input[name="email"]');
    if (emailEl && emailEl.value.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailEl.value.trim())) {
        emailEl.style.borderColor = '#f87171';
        valid = false;
      } else {
        emailEl.style.borderColor = '';
      }
    }

    if (!valid) return;

    // Reset status banners
    if (success) { success.classList.add('hidden'); success.style.display = ''; }
    if (errorBanner) { errorBanner.classList.add('hidden'); errorBanner.style.display = ''; }

    btn.textContent = 'Sending…';
    btn.disabled = true;

    try {
      const data = new FormData(form);
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        form.reset();
        if (success) {
          success.classList.remove('hidden');
          success.style.display = 'flex';
          setTimeout(() => {
            success.classList.add('hidden');
            success.style.display = '';
          }, 6000);
        }
      } else {
        throw new Error('Form submission failed');
      }
    } catch (_) {
      if (errorBanner) {
        errorBanner.classList.remove('hidden');
        errorBanner.style.display = 'flex';
        setTimeout(() => {
          errorBanner.classList.add('hidden');
          errorBanner.style.display = '';
        }, 6000);
      }
    }

    btn.textContent = 'Send Message';
    btn.disabled = false;
  });

  form.querySelectorAll('input,textarea').forEach(el => {
    el.addEventListener('input', () => { el.style.borderColor = ''; });
  });
  form.querySelectorAll('select').forEach(el => {
    el.addEventListener('change', () => { el.style.borderColor = ''; });
  });
}

// Intersection Observer for scroll-reveal animations
document.addEventListener('DOMContentLoaded', () => {
  const revealElements = document.querySelectorAll('.reveal');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Stop observing once revealed
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });
  
  revealElements.forEach(el => observer.observe(el));
});

// Floating Back to Top Button
const backToTopBtn = document.getElementById('back-to-top');
if (backToTopBtn) {
  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('show', window.scrollY > 300);
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
