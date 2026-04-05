// State
let currentPostcard = null;
let isFlipped = false;
let lastScrollY = window.scrollY;
let scrollDirection = 'down';
let currentHoveredItem = null;
let currentAudio = null;
let isAudioPlaying = false;

// Cached DOM references (set in DOMContentLoaded)
let postcardModal, replyModal, sendModal, cardContainer;
let frontImg, backImg, numberEl;
let postcardItems;

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
  const clearBtn = document.querySelector('.filter-clear');
  const countryBtn = document.querySelector('.filter-name[data-filter="country"]');

  function applyCountryFilter() {
    const activeCountries = Array.from(filterOptions)
      .filter(o => o.classList.contains('active'))
      .map(o => o.dataset.country);

    if (activeCountries.length === 0) {
      clearBtn.classList.add('active');
      countryBtn.classList.remove('has-selection');
      clearFilter();
    } else {
      clearBtn.classList.remove('active');
      countryBtn.classList.add('has-selection');
      postcardItems.forEach(item => {
        if (activeCountries.includes(item.dataset.country)) {
          item.classList.remove('filtered-out');
        } else {
          item.classList.add('filtered-out');
        }
      });
    }
  }

  filterOptions.forEach(option => {
    option.addEventListener('click', () => {
      option.classList.toggle('active');
      applyCountryFilter();
    });
  });

  clearBtn.addEventListener('click', () => {
    filterOptions.forEach(o => o.classList.remove('active'));
    clearBtn.classList.add('active');
    countryBtn.classList.remove('has-selection');
    clearFilter();
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.filter-name') && !e.target.closest('.filter-options')) {
      filterBtns.forEach(btn => {
        btn.classList.remove('expanded');
        btn.setAttribute('aria-expanded', 'false');
        const filterType = btn.dataset.filter;
        const options = document.getElementById(filterType + '-options');
        if (options) options.classList.remove('open');
      });
    }
  }, { capture: true });
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
function openModal(postcardElement, skipAnimation) {
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

  // Set content — preserve aspect ratio before image loads to prevent layout shift
  frontImg.src = frontSrc;
  frontImg.alt = title + ' - Front';
  if (imgEl.naturalWidth && imgEl.naturalHeight) {
    frontImg.style.aspectRatio = imgEl.naturalWidth + '/' + imgEl.naturalHeight;
  } else {
    frontImg.style.aspectRatio = '';
  }

  // Align UI rows to the visible image width (handles object-fit: contain)
  function updateImgWidth() {
    if (!frontImg.naturalWidth) return;
    var nat = frontImg.naturalWidth / frontImg.naturalHeight;
    var box = frontImg.getBoundingClientRect();
    var boxRatio = box.width / box.height;
    var visibleW = boxRatio > nat ? box.height * nat : box.width;
    postcardModal.querySelector('.modal-postcard-details')
      .style.setProperty('--img-width', visibleW + 'px');
  }
  if (frontImg.complete && frontImg.naturalWidth) {
    requestAnimationFrame(updateImgWidth);
  }
  frontImg.addEventListener('load', function onLoad() {
    updateImgWidth();
    frontImg.removeEventListener('load', onLoad);
  });
  // Recalculate on resize/rotation while modal is open
  if (postcardModal._resizeHandler) {
    window.removeEventListener('resize', postcardModal._resizeHandler);
  }
  postcardModal._resizeHandler = function() {
    updateImgWidth();
    if (postcardModal.querySelector('.modal-read-overlay').classList.contains('active')) {
      updateReadOverlaySize();
    }
  };
  window.addEventListener('resize', postcardModal._resizeHandler);
  backImg.src = backSrc || '';
  backImg.alt = backSrc ? title + ' - Back' : '';
  numberEl.textContent = '#' + number;

  // Reset flip state
  cardContainer.classList.remove('flipped');
  updateModalButtons();

  // Auto-play audio if available
  if (postcardElement.dataset.audio) {
    startAudio(postcardElement.dataset.audio);
  }

  // Update URL to real postcard permalink
  history.pushState({ postcardSlug: postcardElement.dataset.slug }, title, permalink);

  var details = postcardModal.querySelector('.modal-postcard-details');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (skipAnimation || !imgEl || reducedMotion) {
    // No animation — just show
    postcardModal.classList.add('active');
    var backdrop = postcardModal.querySelector('.modal-backdrop');
    backdrop.style.backdropFilter = 'blur(8px)';
    backdrop.style.webkitBackdropFilter = 'blur(8px)';
    backdrop.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    postcardModal.querySelector('.modal-flip-btn').focus();
    return;
  }

  // --- Fly Animation using a floating clone ---
  var flyAborted = false;
  postcardModal._abortFlyIn = function() { flyAborted = true; };
  var scrollY = window.scrollY;

  // Lock scroll first so all measurements are in the same viewport state (no scrollbar shift)
  postcardElement.style.scale = '1';
  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
  window.scrollTo(0, scrollY);

  // Measure source position (now in no-scrollbar state)
  var sourceRect = imgEl.getBoundingClientRect();

  // Hide source postcard
  postcardElement.classList.add('fly-source');

  // Show modal invisibly WITH all UI to get correct layout measurements
  details.style.visibility = 'hidden';
  details.style.opacity = '0';
  postcardModal.classList.add('active');
  details.offsetHeight; // force layout

  // Measure where the front image actually sits (with buttons affecting layout)
  var modalImg = details.querySelector('.modal-front-img');
  var imgRect = modalImg.getBoundingClientRect();
  var imgAspect = imgEl.naturalWidth / imgEl.naturalHeight;

  // Calculate visible image area within element box (object-fit: contain)
  var renderedW, renderedH;
  if (imgRect.width > 0 && imgRect.height > 0) {
    var elemAspect = imgRect.width / imgRect.height;
    if (elemAspect > imgAspect) {
      renderedH = imgRect.height;
      renderedW = imgRect.height * imgAspect;
    } else {
      renderedW = imgRect.width;
      renderedH = imgRect.width / imgAspect;
    }
  } else {
    // Fallback if image hasn't laid out yet
    var modalW = Math.min(window.innerWidth * 0.85, 800);
    if (modalW / (window.innerHeight * 0.65) > imgAspect) {
      renderedH = window.innerHeight * 0.65;
      renderedW = renderedH * imgAspect;
    } else {
      renderedW = modalW;
      renderedH = modalW / imgAspect;
    }
  }
  var destCenterX = imgRect.width > 0 ? imgRect.left + imgRect.width / 2 : window.innerWidth / 2;
  var destCenterY = imgRect.height > 0 ? imgRect.top + imgRect.height / 2 : window.innerHeight / 2;

  // Now hide UI during fly animation (opacity only — no layout change)
  details.classList.add('fly-hidden');

  // Create a floating clone of the grid image
  var clone = imgEl.cloneNode();
  clone.className = 'fly-clone';
  clone.style.cssText = 'position:fixed;z-index:2001;border-radius:4px;pointer-events:none;' +
    'object-fit:contain;background:transparent;' +
    'left:' + sourceRect.left + 'px;top:' + sourceRect.top + 'px;' +
    'width:' + sourceRect.width + 'px;height:' + sourceRect.height + 'px;' +
    'transition:left 0.32s cubic-bezier(0.4,0,0.15,1),top 0.32s cubic-bezier(0.4,0,0.15,1),' +
    'width 0.32s cubic-bezier(0.4,0,0.15,1),height 0.32s cubic-bezier(0.4,0,0.15,1);';
  document.body.appendChild(clone);

  // Force reflow
  clone.offsetHeight;

  // Animate clone to modal center
  clone.style.left = (destCenterX - renderedW / 2) + 'px';
  clone.style.top = (destCenterY - renderedH / 2) + 'px';
  clone.style.width = renderedW + 'px';
  clone.style.height = renderedH + 'px';

  // Animate backdrop blur in sync with fly animation
  var backdrop = postcardModal.querySelector('.modal-backdrop');
  var blurDuration = 320; // match fly transition
  var blurMax = 8;
  var blurStart = performance.now();
  function tickBlurIn(now) {
    if (flyAborted) return;
    var t = Math.min((now - blurStart) / blurDuration, 1);
    // ease-out curve
    var ease = 1 - (1 - t) * (1 - t);
    var blur = (blurMax * ease).toFixed(1);
    backdrop.style.backdropFilter = 'blur(' + blur + 'px)';
    backdrop.style.webkitBackdropFilter = 'blur(' + blur + 'px)';
    if (t < 1) requestAnimationFrame(tickBlurIn);
  }
  requestAnimationFrame(tickBlurIn);

  function onFlyEnd() {
    clone.removeEventListener('transitionend', onFlyEnd);
    if (flyAborted) { clone.remove(); return; }
    postcardModal._abortFlyIn = null;
    // Crossfade: show modal while fading clone out
    details.style.visibility = '';
    details.style.opacity = '';
    details.classList.remove('fly-hidden');
    clone.style.transition = 'opacity 0.15s ease';
    clone.style.opacity = '0';
    setTimeout(function() {
      clone.remove();
    }, 160);
    postcardModal.querySelector('.modal-flip-btn').focus();
  }
  clone.addEventListener('transitionend', onFlyEnd);

  // Safety timeout
  setTimeout(function() {
    if (clone.parentNode) {
      details.style.visibility = '';
      details.style.opacity = '';
      details.classList.remove('fly-hidden');
      clone.remove();
    }
  }, 500);
}

function closeModal(fromPopstate) {
  // Close read overlay
  closeReadOverlay();

  // Stop audio playback
  stopAudio();

  // Abort any in-progress fly-in animation
  if (postcardModal._abortFlyIn) postcardModal._abortFlyIn();

  var details = postcardModal.querySelector('.modal-postcard-details');
  var sourceEl = currentPostcard;

  if (!fromPopstate) {
    history.pushState(null, '', '/posts.html');
  }

  // Try reverse fly animation
  if (sourceEl && sourceEl.classList.contains('fly-source')) {
    var sourceImg = sourceEl.querySelector('.postcard-image');

    // Measure where the front image actually renders in the modal
    var modalImg = details.querySelector('.modal-front-img');
    var frontImgRect = modalImg.getBoundingClientRect();

    var imgAspect = sourceImg.naturalWidth / sourceImg.naturalHeight;
    var elemAspect = frontImgRect.width / frontImgRect.height;
    var renderedW, renderedH;
    if (elemAspect > imgAspect) {
      renderedH = frontImgRect.height;
      renderedW = frontImgRect.height * imgAspect;
    } else {
      renderedW = frontImgRect.width;
      renderedH = frontImgRect.width / imgAspect;
    }
    var destCenterX = frontImgRect.left + frontImgRect.width / 2;
    var destCenterY = frontImgRect.top + frontImgRect.height / 2;

    // Measure source position in same viewport state (scroll already locked)
    var scrollY = window.scrollY;
    var sourceRect = sourceImg.getBoundingClientRect();

    // Hide modal UI (buttons disappear first), then create clone
    details.classList.add('fly-hidden');
    details.style.opacity = '0';
    var clone = sourceImg.cloneNode();
    clone.className = 'fly-clone';
    clone.style.cssText = 'position:fixed;z-index:2001;border-radius:4px;pointer-events:none;' +
      'left:' + (destCenterX - renderedW / 2) + 'px;top:' + (destCenterY - renderedH / 2) + 'px;' +
      'width:' + renderedW + 'px;height:' + renderedH + 'px;' +
      'transition:all 0.28s cubic-bezier(0.4, 0, 0.15, 1);';
    document.body.appendChild(clone);

    // Animate backdrop blur out in sync with fly-out
    var backdrop = postcardModal.querySelector('.modal-backdrop');
    var blurOutDuration = 280; // match close fly transition
    var blurOutStart = performance.now();
    function tickBlurOut(now) {
      var t = Math.min((now - blurOutStart) / blurOutDuration, 1);
      var ease = t * t; // ease-in
      var blur = (8 * (1 - ease)).toFixed(1);
      backdrop.style.backdropFilter = 'blur(' + blur + 'px)';
      backdrop.style.webkitBackdropFilter = 'blur(' + blur + 'px)';
      if (t < 1) requestAnimationFrame(tickBlurOut);
    }
    requestAnimationFrame(tickBlurOut);

    // Force reflow
    clone.offsetHeight;

    // Animate clone back to grid position
    clone.style.left = sourceRect.left + 'px';
    clone.style.top = sourceRect.top + 'px';
    clone.style.width = sourceRect.width + 'px';
    clone.style.height = sourceRect.height + 'px';

    function onCloseEnd() {
      clone.removeEventListener('transitionend', onCloseEnd);
      // Crossfade: show grid card while fading clone out
      if (sourceEl) sourceEl.classList.remove('fly-source');
      clone.style.transition = 'opacity 0.12s ease';
      clone.style.opacity = '0';
      setTimeout(function() {
        clone.remove();
        finishClose();
      }, 130);
    }
    clone.addEventListener('transitionend', onCloseEnd);

    // Safety timeout
    setTimeout(function() {
      if (clone.parentNode) {
        if (sourceEl) sourceEl.classList.remove('fly-source');
        clone.remove();
        finishClose();
      }
    }, 450);
  } else {
    finishClose();
  }

  var closed = false;
  function finishClose() {
    if (closed) return;
    closed = true;
    postcardModal.classList.remove('active');
    details.classList.remove('fly-hidden');
    details.style.opacity = '';
    details.style.visibility = '';
    var backdrop = postcardModal.querySelector('.modal-backdrop');
    backdrop.style.background = '';
    backdrop.style.backdropFilter = '';
    backdrop.style.webkitBackdropFilter = '';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    if (postcardModal._resizeHandler) {
      window.removeEventListener('resize', postcardModal._resizeHandler);
      postcardModal._resizeHandler = null;
    }
    if (sourceEl) {
      sourceEl.classList.remove('fly-source');
      sourceEl.style.scale = '';
    }
    currentPostcard = null;
    isFlipped = false;
  }
}

function flipCard() {
  closeReadOverlay();
  isFlipped = !isFlipped;
  cardContainer.classList.toggle('flipped', isFlipped);
  updateModalButtons();
}

function updateModalButtons() {
  const listenBtn = postcardModal.querySelector('.modal-listen-btn');
  const readBtn = postcardModal.querySelector('.modal-read-btn');

  // Listen button: visible if postcard has audio, regardless of flip state
  const hasAudio = currentPostcard && currentPostcard.dataset.audio;
  listenBtn.style.display = hasAudio ? 'flex' : 'none';

  // Read button: visible only when flipped and postcard has content
  const hasContent = currentPostcard && currentPostcard.dataset.content;
  readBtn.style.display = (isFlipped && hasContent) ? 'flex' : 'none';
}

function handleAudioEnd() {
  isAudioPlaying = false;
  updateListenButtonState();
}

function handleAudioError() {
  isAudioPlaying = false;
  currentAudio = null;
  updateListenButtonState();
}

function startAudio(src) {
  stopAudio();
  currentAudio = new Audio(src);
  currentAudio.addEventListener('ended', handleAudioEnd);
  currentAudio.addEventListener('error', handleAudioError);
  var audio = currentAudio;
  audio.play().then(function() {
    if (audio !== currentAudio) return;
    isAudioPlaying = true;
    updateListenButtonState();
  }).catch(function() {
    if (audio !== currentAudio) return;
    // Autoplay blocked or file missing — user can click listen to retry
    isAudioPlaying = false;
    updateListenButtonState();
  });
}

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeEventListener('ended', handleAudioEnd);
    currentAudio.removeEventListener('error', handleAudioError);
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  isAudioPlaying = false;
  updateListenButtonState();
}

function toggleAudio() {
  if (!currentPostcard || !currentPostcard.dataset.audio) return;
  if (isAudioPlaying && currentAudio) {
    currentAudio.pause();
    isAudioPlaying = false;
    updateListenButtonState();
  } else if (currentAudio && currentAudio.src) {
    var audio = currentAudio;
    audio.play().then(function() {
      if (audio !== currentAudio) return;
      isAudioPlaying = true;
      updateListenButtonState();
    }).catch(function() {
      if (audio !== currentAudio) return;
      isAudioPlaying = false;
      updateListenButtonState();
    });
  } else {
    startAudio(currentPostcard.dataset.audio);
  }
}

function updateReadOverlaySize() {
  var overlay = postcardModal.querySelector('.modal-read-overlay');
  var img = backImg;
  if (!img.naturalWidth || !img.naturalHeight) {
    // Retry once when image loads
    img.addEventListener('load', function onLoad() {
      img.removeEventListener('load', onLoad);
      if (overlay.classList.contains('active')) updateReadOverlaySize();
    });
    return;
  }
  var imgRect = img.getBoundingClientRect();
  var natRatio = img.naturalWidth / img.naturalHeight;
  var elemRatio = imgRect.width / imgRect.height;
  var visW, visH;
  if (elemRatio > natRatio) {
    visH = imgRect.height;
    visW = imgRect.height * natRatio;
  } else {
    visW = imgRect.width;
    visH = imgRect.width / natRatio;
  }
  overlay.style.setProperty('--visible-img-width', visW + 'px');
  overlay.style.setProperty('--visible-img-height', visH + 'px');
}

function toggleReadOverlay() {
  var overlay = postcardModal.querySelector('.modal-read-overlay');
  var readBtn = postcardModal.querySelector('.modal-read-btn');
  var isActive = overlay.classList.contains('active');

  if (isActive) {
    overlay.classList.remove('active');
    readBtn.classList.remove('reading');
    readBtn.setAttribute('aria-label', 'Read transcript');
  } else {
    if (currentPostcard && currentPostcard.dataset.content) {
      postcardModal.querySelector('.modal-read-text').innerHTML = currentPostcard.dataset.content;
    }
    updateReadOverlaySize();
    overlay.classList.add('active');
    readBtn.classList.add('reading');
    readBtn.setAttribute('aria-label', 'Hide transcript');
  }
}

function closeReadOverlay() {
  var overlay = postcardModal.querySelector('.modal-read-overlay');
  var readBtn = postcardModal.querySelector('.modal-read-btn');
  overlay.classList.remove('active');
  readBtn.classList.remove('reading');
  readBtn.setAttribute('aria-label', 'Read transcript');
}

function updateListenButtonState() {
  const listenBtn = postcardModal.querySelector('.modal-listen-btn');
  if (isAudioPlaying) {
    listenBtn.classList.add('playing');
    listenBtn.setAttribute('aria-label', 'Stop audio');
  } else {
    listenBtn.classList.remove('playing');
    listenBtn.setAttribute('aria-label', 'Listen to postcard');
  }
}

var shareToastTimer = null;

function sharePostcard() {
  if (!currentPostcard) return;
  var permalink = currentPostcard.dataset.permalink;
  var title = currentPostcard.dataset.title || '';
  var url = window.location.origin + permalink;

  if (navigator.share) {
    navigator.share({ title: title, url: url }).catch(function() {});
  } else {
    navigator.clipboard.writeText(url).then(function() {
      showShareToast();
    }).catch(function() {});
  }
}

function showShareToast() {
  var toast = document.getElementById('share-toast');
  if (!toast) return;
  toast.classList.add('visible');
  clearTimeout(shareToastTimer);
  shareToastTimer = setTimeout(function() {
    toast.classList.remove('visible');
  }, 2500);
}

function openModalBySlug(slug) {
  const postcardElement = document.querySelector('[data-slug="' + slug + '"]');
  if (postcardElement) {
    openModal(postcardElement, true);
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

  postcardItems = document.querySelectorAll('.postcard-item');

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

  // Listen button — toggle audio playback
  postcardModal.querySelector('.modal-listen-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    toggleAudio();
  });

  // Read button — toggle transcript overlay
  postcardModal.querySelector('.modal-read-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    toggleReadOverlay();
  });

  // Share button — native share sheet with clipboard fallback
  postcardModal.querySelector('.modal-share-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    sharePostcard();
  });

  // ==================
  // Scroll Inertia Effect
  // ==================

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
      if (item.classList.contains('filtered-out')) {
        cardOffsets[i] = 0;
        item.style.transform = '';
        return;
      }

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
    if (!item) {
      // Cursor is over grid gaps — clear displacement
      if (currentHoveredItem) {
        clearNeighborShifts();
        currentHoveredItem = null;
      }
      return;
    }
    if (item === currentHoveredItem) return;
    clearNeighborShifts();
    currentHoveredItem = item;
    shiftNeighbors(item);
  });

  grid.addEventListener('mouseleave', function() {
    clearNeighborShifts();
    currentHoveredItem = null;
  });
});
