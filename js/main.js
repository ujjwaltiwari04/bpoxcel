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

// Counter animation for stats
document.addEventListener('DOMContentLoaded', () => {
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1200;
    const start = performance.now();
    const suffix = el.dataset.suffix || '';
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.floor(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));
});

// Form submission status handler for Google Form apply links
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.apply-btn');
  if (btn) {
    const url = btn.getAttribute('href');
    if (url && url.includes('docs.google.com/forms')) {
      e.preventDefault();
      window.open(url, '_blank');
      
      const msg = document.createElement('div');
      msg.className = "text-xs text-center font-medium bg-brand-light text-brand-blue border border-brand-cyan/20 px-4 py-3 rounded-xl transition-all animate-fade-in";
      msg.innerHTML = "Please complete the application form in the open tab.<br>We will get back to you if your profile matches our needs.";
      btn.replaceWith(msg);
    }
  }
});

