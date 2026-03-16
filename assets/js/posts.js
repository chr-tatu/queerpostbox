// State
let currentPostcard = null;
let isFlipped = false;

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
});
