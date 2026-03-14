// State
let currentPostcard = null;
let isFlipped = false;

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
// Modal
// ==================
function openModal(postcardElement) {
  const modal = document.getElementById('postcard-modal');
  const frontImg = modal.querySelector('.modal-front-img');
  const backImg = modal.querySelector('.modal-back-img');
  const numberEl = modal.querySelector('.modal-postcard-number');
  const cardContainer = modal.querySelector('.modal-card-container');

  currentPostcard = postcardElement;
  isFlipped = false;

  // Get postcard data
  const imgEl = postcardElement.querySelector('.postcard-image');
  const frontSrc = imgEl ? imgEl.dataset.front : '';
  const backSrc = imgEl ? imgEl.dataset.back : '';
  const title = postcardElement.dataset.title || '';
  const number = postcardElement.dataset.number;
  const slug = postcardElement.dataset.slug;

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

  // Update URL
  history.pushState({ postcardSlug: slug }, title, '#' + slug);

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-flip-btn').focus();
}

function closeModal(fromPopstate) {
  const modal = document.getElementById('postcard-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
  if (!fromPopstate) {
    history.pushState(null, '', window.location.pathname);
  }
  currentPostcard = null;
  isFlipped = false;
}

function flipCard() {
  const modal = document.getElementById('postcard-modal');
  const cardContainer = modal.querySelector('.modal-card-container');

  isFlipped = !isFlipped;

  if (isFlipped) {
    cardContainer.classList.add('flipped');
  } else {
    cardContainer.classList.remove('flipped');
  }

  updateModalButtons();
}

function updateModalButtons() {
  const listenBtn = document.querySelector('.modal-listen-btn');
  const readBtn = document.querySelector('.modal-read-btn');

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
// Reply Modal
// ==================
function openReplyModal() {
  const replyModal = document.getElementById('reply-modal');
  replyModal.classList.add('active');
  replyModal.querySelector('.reply-close').focus();
}

function closeReplyModal() {
  const replyModal = document.getElementById('reply-modal');
  replyModal.classList.remove('active');
}

// ==================
// Send Postcard Modal
// ==================
function openSendModal() {
  const sendModal = document.getElementById('send-modal');
  sendModal.classList.add('active');
  sendModal.querySelector('.send-modal-close').focus();
}

function closeSendModal() {
  const sendModal = document.getElementById('send-modal');
  sendModal.classList.remove('active');
}

// ==================
// Event Listeners
// ==================
document.addEventListener('DOMContentLoaded', function() {
  initFilters();

  // Flip button
  document.querySelector('.modal-flip-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    flipCard();
  });

  // Close modal on backdrop click
  document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

  // Arrow down → reply
  document.querySelector('.modal-arrow-down').addEventListener('click', function(e) {
    e.stopPropagation();
    openReplyModal();
  });

  // Reply close
  document.querySelector('.reply-close').addEventListener('click', function(e) {
    e.stopPropagation();
    closeReplyModal();
  });

  // Reply overlay click → close reply
  document.getElementById('reply-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeReplyModal();
    }
  });

  // Send postcard button
  document.querySelector('.send-postcard-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    openSendModal();
  });

  // Send modal close
  document.querySelector('.send-modal-close').addEventListener('click', function(e) {
    e.stopPropagation();
    closeSendModal();
  });

  // Send modal overlay click → close
  document.getElementById('send-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeSendModal();
    }
  });

  // Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const sendModal = document.getElementById('send-modal');
      const replyModal = document.getElementById('reply-modal');
      if (sendModal.classList.contains('active')) {
        closeSendModal();
      } else if (replyModal.classList.contains('active')) {
        closeReplyModal();
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

  // Handle direct links
  const hash = window.location.hash.substring(1);
  if (hash) {
    openModalBySlug(hash);
  }

  // Listen/Read buttons (no-op for now)
  document.querySelector('.modal-listen-btn').addEventListener('click', function(e) {
    e.stopPropagation();
  });

  document.querySelector('.modal-read-btn').addEventListener('click', function(e) {
    e.stopPropagation();
  });
});
