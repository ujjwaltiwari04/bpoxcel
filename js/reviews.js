/* =====================================================
   BPOXCEL Candidate Reviews Engine
   Dynamic rendering, star selector, modal & localStorage
   ===================================================== */

(function () {
  'use strict';

  var LOCAL_STORAGE_KEY = 'bpoxcel_user_reviews';

  // ── Default / Pre-loaded Reviews Dataset ──
  var DEFAULT_REVIEWS = [
    {
      id: 'def_1',
      name: 'Ankit Sharma',
      role: 'BPO Placements',
      location: 'Gurugram',
      rating: 5,
      review: 'BPOXCEL is an absolute game-changer! I went from endlessly sending resumes to signing an offer letter with a major international BPO in just 72 hours. If you want results, this is the place to be!',
      date: 'Verified Candidate',
      badge: 'Placed Candidate',
      avatarBg: 'from-cyan-600 to-teal-700'
    },
    {
      id: 'def_2',
      name: 'Riya Malhotra',
      role: 'MNC Placements',
      location: 'Delhi NCR',
      rating: 5,
      review: 'After months of silence from other job boards, BPOXCEL got me three interviews in one week. I felt supported throughout the process. Absolute rockstars!',
      date: 'Verified Candidate',
      badge: 'Placed Candidate',
      avatarBg: 'from-blue-600 to-cyan-600'
    },
    {
      id: 'def_3',
      name: 'Pooja Choudhary',
      role: 'Customer Support',
      location: 'Gurugram',
      rating: 5,
      review: 'I loved how transparent and professional the recruitment process was. I landed a Customer Support Executive role in Gurugram within days.',
      date: 'Verified Candidate',
      badge: 'Placed Candidate',
      avatarBg: 'from-indigo-500 to-blue-700'
    },
    {
      id: 'def_4',
      name: 'Vikram Jeet Singh',
      role: 'Tech Process',
      location: 'Punjab',
      rating: 5,
      review: 'The team at BPOXCEL guided me smoothly from resume submission to interview scheduling. Their recruitment process was simple, fast and professional.',
      date: 'Verified Candidate',
      badge: 'Placed Candidate',
      avatarBg: 'from-teal-500 to-emerald-600'
    }
  ];

  // Get user-submitted reviews from LocalStorage
  function getStoredReviews() {
    try {
      var stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Save new review to LocalStorage
  function saveUserReview(reviewObj) {
    try {
      var current = getStoredReviews();
      current.unshift(reviewObj); // Newest reviews first
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.error('Error saving review to localStorage:', e);
    }
  }

  // Helper to generate initials from candidate name
  function getInitials(nameStr) {
    if (!nameStr) return 'B';
    var parts = nameStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  }

  // Generate star HTML string
  function renderStarsHTML(ratingVal) {
    var starsHTML = '';
    var count = Math.min(5, Math.max(1, parseInt(ratingVal) || 5));
    for (var i = 1; i <= 5; i++) {
      if (i <= count) {
        starsHTML += '<span class="text-amber-400">★</span>';
      } else {
        starsHTML += '<span class="text-gray-300">★</span>';
      }
    }
    return starsHTML;
  }

  // Escape HTML special characters to prevent XSS
  function escapeHTML(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Build HTML card string for a review
  function createReviewCardHTML(rev) {
    var initials = escapeHTML(getInitials(rev.name));
    var stars = renderStarsHTML(rev.rating);
    var avatarBg = escapeHTML(rev.avatarBg || 'from-brand-cyan to-brand-blue');
    var safeName = escapeHTML(rev.name);
    var safeRole = escapeHTML(rev.role || 'Candidate');
    var safeLocation = rev.location ? 'Placed in ' + escapeHTML(rev.location) : 'Delhi NCR';
    var safeReview = escapeHTML(rev.review);

    return (
      '<article class="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 flex flex-col transition-all duration-300 transform hover:-translate-y-1 group reveal active reveal-up">' +
        '<div class="p-6 flex-grow flex flex-col justify-between">' +
          '<div>' +
            '<div class="flex items-center gap-3 mb-4">' +
              '<div class="w-10 h-10 rounded-full bg-gradient-to-br ' + avatarBg + ' text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">' +
                initials +
              '</div>' +
              '<div class="min-w-0">' +
                '<h3 class="text-base font-bold text-gray-900 truncate" title="' + safeName + '">' + safeName + '</h3>' +
                '<p class="text-xs font-semibold text-brand-cyan uppercase tracking-wider truncate">' + safeRole + '</p>' +
              '</div>' +
            '</div>' +

            '<div class="flex items-center justify-between mb-3">' +
              '<div class="flex items-center gap-1 text-sm">' + stars + '</div>' +
              '<span class="text-[11px] text-gray-400 font-medium">' + safeLocation + '</span>' +
            '</div>' +

            '<p class="text-gray-600 text-xs sm:text-sm leading-relaxed italic bg-gray-50/60 p-3.5 rounded-2xl border border-gray-100/60">' +
              '"' + safeReview + '"' +
            '</p>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  // Render combined review list into grid container
  function renderAllReviews() {
    var gridContainer = document.getElementById('reviews-grid');
    if (!gridContainer) return;

    var storedReviews = getStoredReviews();
    var allReviews = storedReviews.concat(DEFAULT_REVIEWS);

    var cardsHTML = '';
    allReviews.forEach(function (rev) {
      cardsHTML += createReviewCardHTML(rev);
    });

    gridContainer.innerHTML = cardsHTML;
  }

  // ── DOM Content Loaded Setup ──
  document.addEventListener('DOMContentLoaded', function () {
    // Initial Render of reviews
    renderAllReviews();

    // Elements
    var modal = document.getElementById('review-modal');
    var openModalBtns = document.querySelectorAll('.open-review-modal');
    var closeModalBtn = document.getElementById('close-review-modal');
    var cancelModalBtn = document.getElementById('cancel-review-modal');
    var reviewForm = document.getElementById('review-form');
    var toast = document.getElementById('review-toast');

    // Star Rating Interactivity
    var selectedRating = 5;
    var starButtons = document.querySelectorAll('.star-btn');
    var ratingInput = document.getElementById('review-rating-input');

    function updateStarsDisplay(ratingVal) {
      starButtons.forEach(function (btn) {
        var starNum = parseInt(btn.getAttribute('data-star'));
        var starIcon = btn.querySelector('.star-icon');
        if (starNum <= ratingVal) {
          starIcon.classList.remove('text-gray-300');
          starIcon.classList.add('text-amber-400');
        } else {
          starIcon.classList.remove('text-amber-400');
          starIcon.classList.add('text-gray-300');
        }
      });
    }

    starButtons.forEach(function (btn) {
      btn.addEventListener('mouseenter', function () {
        var hoverVal = parseInt(btn.getAttribute('data-star'));
        updateStarsDisplay(hoverVal);
      });

      btn.addEventListener('mouseleave', function () {
        updateStarsDisplay(selectedRating);
      });

      btn.addEventListener('click', function () {
        selectedRating = parseInt(btn.getAttribute('data-star'));
        if (ratingInput) ratingInput.value = selectedRating;
        updateStarsDisplay(selectedRating);
      });
    });

    // Modal Control Functions
    var reviewAgree = document.getElementById('review-agree');
    var reviewAgreeErr = document.getElementById('rev-agree-err');
    var reviewSubmitBtn = document.getElementById('review-submit-btn');

    function updateReviewBtnState() {
      if (!reviewSubmitBtn) return;
      if (reviewAgree && reviewAgree.checked) {
        reviewSubmitBtn.disabled = false;
        reviewSubmitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        reviewSubmitBtn.classList.add('hover:opacity-90', 'cursor-pointer');
      } else {
        reviewSubmitBtn.disabled = true;
        reviewSubmitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        reviewSubmitBtn.classList.remove('hover:opacity-90', 'cursor-pointer');
      }
    }

    if (reviewAgree) {
      updateReviewBtnState();
      reviewAgree.addEventListener('change', function () {
        updateReviewBtnState();
        if (reviewAgree.checked && reviewAgreeErr) {
          reviewAgreeErr.classList.add('hidden');
        }
      });
    }

    function openModal() {
      if (modal) {
        if (reviewAgree) {
          reviewAgree.checked = false;
          updateReviewBtnState();
        }
        if (reviewAgreeErr) reviewAgreeErr.classList.add('hidden');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeModal() {
      if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    }

    openModalBtns.forEach(function (btn) {
      btn.addEventListener('click', openModal);
    });

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    // Form Submission
    if (reviewForm) {
      reviewForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var nameVal = document.getElementById('review-name').value.trim();
        var roleVal = document.getElementById('review-role').value.trim();
        var locationVal = document.getElementById('review-location').value.trim();
        var messageVal = document.getElementById('review-message').value.trim();

        // Validation
        var isValid = true;
        if (!nameVal) {
          document.getElementById('rev-name-err').classList.remove('hidden');
          isValid = false;
        } else {
          document.getElementById('rev-name-err').classList.add('hidden');
        }

        if (!roleVal) {
          document.getElementById('rev-role-err').classList.remove('hidden');
          isValid = false;
        } else {
          document.getElementById('rev-role-err').classList.add('hidden');
        }

        if (!locationVal) {
          document.getElementById('rev-location-err').classList.remove('hidden');
          isValid = false;
        } else {
          document.getElementById('rev-location-err').classList.add('hidden');
        }

        if (!messageVal || messageVal.length < 10) {
          document.getElementById('rev-msg-err').classList.remove('hidden');
          isValid = false;
        } else {
          document.getElementById('rev-msg-err').classList.add('hidden');
        }

        if (!reviewAgree || !reviewAgree.checked) {
          if (reviewAgreeErr) reviewAgreeErr.classList.remove('hidden');
          isValid = false;
        } else {
          if (reviewAgreeErr) reviewAgreeErr.classList.add('hidden');
        }

        if (!isValid) return;

        // Build new review object
        var newReview = {
          id: 'user_rev_' + Date.now(),
          name: nameVal,
          role: roleVal,
          location: locationVal,
          rating: selectedRating,
          review: messageVal,
          date: 'Just now',
          badge: 'Verified Candidate',
          isUserSubmitted: true,
          avatarBg: 'from-brand-cyan to-brand-blue'
        };

        // Save & Re-render
        saveUserReview(newReview);
        renderAllReviews();

        // Reset & Close Modal
        reviewForm.reset();
        if (reviewAgree) {
          reviewAgree.checked = false;
          updateReviewBtnState();
        }
        selectedRating = 5;
        updateStarsDisplay(5);
        closeModal();

        // Show Toast Notification
        if (toast) {
          toast.classList.remove('hidden');
          setTimeout(function () {
            toast.classList.add('hidden');
          }, 4000);
        }
      });
    }
  });
})();
