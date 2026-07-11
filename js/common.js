// Sticky navbar shadow on scroll
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('navbar-scrolled', window.scrollY > 20);
  });
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

  // Mobile navigation "More" dropdown toggle
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.mobile-more-btn');
    if (btn) {
      const dropdown = btn.nextElementSibling;
      const arrow = btn.querySelector('.mobile-more-arrow');
      if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (arrow) {
          arrow.classList.toggle('rotate-180');
        }
      }
    }
  });
}

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

// Intersection Observer and Email Decryption on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  // Intersection Observer for scroll-reveal animations
  const revealElements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });
  
  window.revealObserver = observer;
  revealElements.forEach(el => observer.observe(el));

  // Email Decryption for obfuscated email addresses
  document.querySelectorAll('[data-user][data-domain]').forEach(el => {
    const user = el.getAttribute('data-user');
    const domain = el.getAttribute('data-domain');
    const email = `${user}@${domain}`;
    
    if (el.tagName === 'A') {
      const subject = el.getAttribute('data-subject');
      const body = el.getAttribute('data-body');
      let mailto = `mailto:${email}`;
      const params = [];
      if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      if (params.length > 0) {
        mailto += `?${params.join('&')}`;
      }
      el.setAttribute('href', mailto);
    }
    
    if (!el.textContent.trim()) {
      el.textContent = email;
    }
  });
});
