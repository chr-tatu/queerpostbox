// State
let currentPostcard = null;
let isFlipped = false;
let lastScrollY = window.scrollY;
let scrollDirection = 'down';
let currentHoveredItem = null;

// Cached DOM references (set in DOMContentLoaded)
let postcardModal, replyModal, sendModal, cardContainer;
let frontImg, backImg, numberEl;

// ==================
// Country Filter
// ==================
function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-name');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filterType = btn.dataset.filter;
      const options = document.getElementById(filterType + '-options');
      if (options) {
        btn.classList.toggle('expanded');
        options.classList.toggle('open');
        btn.setAttribute('aria-expanded', btn.classList.contains('expanded'));
      }
    });
  });

  const filterOptions = document.querySelectorAll('.filter-option');
  filterOptions.forEach(option => {
    option.addEventListener('click', () => {
      const country = option.dataset.country;
      const wasActive = option.classList.contains('active');

      // Deselect all
      filterOptions.forEach(o => o.classList.remove('active'));

      if (!wasActive) {
        option.classList.add('active');
        filterByCountry(country);
      } else {
        clearFilter();
      }
    });
  });
}

function filterByCountry(country) {
  const items = document.querySelectorAll('.postcard-item');
  items.forEach(item => {
    if (item.dataset.country === country) {
      item.classList.remove('filtered-out');
    } else {
      item.classList.add('filtered-out');
    }
  });
}

function clearFilter() {
  const items = document.querySelectorAll('.postcard-item');
  items.forEach(item => item.classList.remove('filtered-out'));
}

// ==================
// Modal Helpers
// ==================
function setModalActive(modal, active) {
  modal.classList.toggle('active', active);
  if (active) {
    const focusTarget = modal.querySelector('.reply-close, .send-modal-close, .modal-flip-btn');
    if (focusTarget) focusTarget.focus();
  }
}

// ==================
// Postcard Modal
// ==================
function openModal(postcardElement) {
  currentPostcard = postcardElement;
  isFlipped = false;

  // Get postcard data
  const imgEl = postcardElement.querySelector('.postcard-image');
  const frontSrc = imgEl ? imgEl.dataset.front : '';
  const backSrc = imgEl ? imgEl.dataset.back : '';
  const title = postcardElement.dataset.title || '';
  const number = postcardElement.dataset.number;
  const permalink = postcardElement.dataset.permalink;

  if (!frontSrc) return;

  // Set content
  frontImg.src = frontSrc;
  frontImg.alt = title + ' - Front';
  backImg.src = backSrc || '';
  backImg.alt = backSrc ? title + ' - Back' : '';
  numberEl.textContent = '#' + number;

  // Reset flip state
  cardContainer.classList.remove('flipped');
  updateModalButtons();

  // Update URL to real postcard permalink
  history.pushState({ postcardSlug: postcardElement.dataset.slug }, title, permalink);

  // Show modal
  postcardModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  postcardModal.querySelector('.modal-flip-btn').focus();
}

function closeModal(fromPopstate) {
  postcardModal.classList.remove('active');
  document.body.style.overflow = '';
  if (!fromPopstate) {
    history.pushState(null, '', '/posts.html');
  }
  currentPostcard = null;
  isFlipped = false;
}

function flipCard() {
  isFlipped = !isFlipped;
  cardContainer.classList.toggle('flipped', isFlipped);
  updateModalButtons();
}

function updateModalButtons() {
  const listenBtn = postcardModal.querySelector('.modal-listen-btn');
  const readBtn = postcardModal.querySelector('.modal-read-btn');

  if (isFlipped) {
    listenBtn.style.display = 'flex';
    readBtn.style.display = 'flex';
  } else {
    listenBtn.style.display = 'none';
    readBtn.style.display = 'none';
  }
}

function openModalBySlug(slug) {
  const postcardElement = document.querySelector('[data-slug="' + slug + '"]');
  if (postcardElement) {
    openModal(postcardElement);
  }
}

// ==================
// Event Listeners
// ==================
document.addEventListener('DOMContentLoaded', function() {
  // Cache DOM references
  postcardModal = document.getElementById('postcard-modal');
  replyModal = document.getElementById('reply-modal');
  sendModal = document.getElementById('send-modal');
  cardContainer = postcardModal.querySelector('.modal-card-container');
  frontImg = postcardModal.querySelector('.modal-front-img');
  backImg = postcardModal.querySelector('.modal-back-img');
  numberEl = postcardModal.querySelector('.modal-postcard-number');

  initFilters();

  // Delegated click handler for postcard grid
  document.getElementById('postcard-grid').addEventListener('click', function(e) {
    const item = e.target.closest('.postcard-item');
    if (item) openModal(item);
  });

  // Flip button
  postcardModal.querySelector('.modal-flip-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    flipCard();
  });

  // Close modal on backdrop or close button click
  postcardModal.addEventListener('click', function(e) {
    if (e.target === postcardModal || e.target.closest('.modal-backdrop')) {
      closeModal();
    }
  });
  postcardModal.querySelector('.modal-close-btn').addEventListener('click', function() { closeModal(); });

  // Arrow down → reply
  postcardModal.querySelector('.modal-arrow-down').addEventListener('click', function(e) {
    e.stopPropagation();
    setModalActive(replyModal, true);
  });

  // Reply close
  replyModal.querySelector('.reply-close').addEventListener('click', function(e) {
    e.stopPropagation();
    setModalActive(replyModal, false);
  });

  // Reply overlay click → close reply
  replyModal.addEventListener('click', function(e) {
    if (e.target === this) {
      setModalActive(replyModal, false);
    }
  });

  // Send postcard button
  document.querySelector('.send-postcard-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    setModalActive(sendModal, true);
  });

  // Send modal close
  sendModal.querySelector('.send-modal-close').addEventListener('click', function(e) {
    e.stopPropagation();
    setModalActive(sendModal, false);
  });

  // Send modal overlay click → close
  sendModal.addEventListener('click', function(e) {
    if (e.target === this) {
      setModalActive(sendModal, false);
    }
  });

  // Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (sendModal.classList.contains('active')) {
        setModalActive(sendModal, false);
      } else if (replyModal.classList.contains('active')) {
        setModalActive(replyModal, false);
      } else {
        closeModal();
      }
    }
  });

  // Browser back/forward
  window.addEventListener('popstate', function(event) {
    if (event.state && event.state.postcardSlug) {
      openModalBySlug(event.state.postcardSlug);
    } else {
      closeModal(true);
    }
  });

  // Handle direct links (hash-based for backward compat)
  const hash = window.location.hash.substring(1);
  if (hash) {
    openModalBySlug(hash);
  }

  // Listen/Read buttons (no-op for now)
  postcardModal.querySelector('.modal-listen-btn').addEventListener('click', function(e) {
    e.stopPropagation();
  });

  postcardModal.querySelector('.modal-read-btn').addEventListener('click', function(e) {
    e.stopPropagation();
  });

  // ==================
  // Scroll Inertia Effect
  // ==================
  const postcardItems = document.querySelectorAll('.postcard-item');

  // Each card tracks its own offset that lags behind scroll
  var cardOffsets = new Array(postcardItems.length);
  var cardRandomFactors = new Array(postcardItems.length);
  for (var ci = 0; ci < cardOffsets.length; ci++) {
    cardOffsets[ci] = 0;
    cardRandomFactors[ci] = 0.6 + Math.random() * 0.8; // 0.6 to 1.4
  }

  var scrollDelta = 0;
  var inertiaRunning = false;

  window.addEventListener('scroll', function() {
    var currentY = window.scrollY;
    scrollDelta += currentY - lastScrollY;
    lastScrollY = currentY;

    if (!inertiaRunning) {
      inertiaRunning = true;
      requestAnimationFrame(tickInertia);
    }
  }, { passive: true });

  function tickInertia() {
    var anyMoving = false;

    postcardItems.forEach(function(item, i) {
      if (item.classList.contains('filtered-out')) return;

      // Push offset by scroll delta, scaled by card's viewport position
      // Cards further from viewport center get more lag
      var rect = item.getBoundingClientRect();
      var viewCenter = window.innerHeight / 2;
      var cardCenter = rect.top + rect.height / 2;
      var distFromCenter = Math.abs(cardCenter - viewCenter) / viewCenter;
      var lagFactor = 0.4 + distFromCenter * 0.6; // 0.4 to 1.0

      cardOffsets[i] += scrollDelta * lagFactor * cardRandomFactors[i] * 0.7;

      // Clamp
      cardOffsets[i] = Math.max(-50, Math.min(50, cardOffsets[i]));

      // Lerp back toward 0 (this creates the "catching up" feel)
      cardOffsets[i] *= 0.9;

      if (Math.abs(cardOffsets[i]) > 0.3) {
        item.style.transform = 'translateY(' + cardOffsets[i].toFixed(1) + 'px)';
        anyMoving = true;
      } else {
        cardOffsets[i] = 0;
        item.style.transform = '';
      }
    });

    scrollDelta = 0;

    if (anyMoving) {
      requestAnimationFrame(tickInertia);
    } else {
      inertiaRunning = false;
    }
  }

  // ==================
  // Neighbor Displacement on Hover
  // ==================
  var grid = document.getElementById('postcard-grid');
  var allItems = Array.from(postcardItems);

  function clearNeighborShifts() {
    allItems.forEach(function(item) {
      item.style.translate = '';
    });
  }

  function getVisibleItems() {
    return allItems.filter(function(item) {
      return !item.classList.contains('filtered-out');
    });
  }

  function shiftNeighbors(hoveredItem) {
    var hoveredRect = hoveredItem.getBoundingClientRect();
    var hCx = hoveredRect.left + hoveredRect.width / 2;
    var hCy = hoveredRect.top + hoveredRect.height / 2;
    var visible = getVisibleItems();

    visible.forEach(function(item) {
      if (item === hoveredItem) return;
      var rect = item.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = cx - hCx;
      var dy = cy - hCy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;

      // Normalize direction (away from hovered)
      var ux = dx / dist;
      var uy = dy / dist;

      // Strength tiers: immediate neighbors get strong push, farther ones lighter
      var strength = 0;
      if (dist < 250) {
        strength = 8;
      } else if (dist < 500) {
        strength = 4;
      } else if (dist < 750) {
        strength = 2;
      }

      if (strength > 0) {
        item.style.translate = (ux * strength).toFixed(1) + 'px ' + (uy * strength).toFixed(1) + 'px';
      }
    });
  }

  grid.addEventListener('mouseover', function(e) {
    var item = e.target.closest('.postcard-item');
    if (!item || item === currentHoveredItem) return;
    clearNeighborShifts();
    currentHoveredItem = item;
    shiftNeighbors(item);
  });

  grid.addEventListener('mouseleave', function() {
    clearNeighborShifts();
    currentHoveredItem = null;
  });
});
