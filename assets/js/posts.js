// Posts functionality
const POSTS_INCREMENT = 8;
let currentlyVisible = 16;
const totalPosts = parseInt(document.querySelector('#postcard-grid').dataset.totalPosts);

function loadMore() {
  const hiddenItems = document.querySelectorAll('.postcard-item.hidden');
  
  // Show next POSTS_INCREMENT items
  for (let i = 0; i < Math.min(POSTS_INCREMENT, hiddenItems.length); i++) {
    hiddenItems[i].classList.remove('hidden');
    currentlyVisible++;
  }
}

// Infinite scroll functionality
function handleScroll() {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
    // Load more when user is 1000px from bottom
    if (currentlyVisible < totalPosts) {
      loadMore();
    }
  }
}

// Card flip functionality
function flipCard(container, isHover) {
  const img = container.querySelector('.postcard-image');
  if (!img) return;

  // Clear any existing timeouts
  if (container.flipTimeout) {
    clearTimeout(container.flipTimeout);
    container.flipTimeout = null;
  }
  if (container.flipTimeout2) {
    clearTimeout(container.flipTimeout2);
    container.flipTimeout2 = null;
  }

  if (isHover) {
    container.flipTimeout = setTimeout(() => {
      // Fade out while starting flip
      img.style.opacity = '0';
      img.style.transform = 'rotateY(90deg)';

      // Swap image at the halfway point when opacity is 0
      container.flipTimeout2 = setTimeout(() => {
        img.src = img.dataset.back;
        img.style.transform = 'rotateY(180deg) scaleX(-1)';
        img.style.opacity = '1';
      }, 75);
    }, 75);
  } else {
    img.src = img.dataset.front;
    img.style.transform = '';
    img.style.opacity = '1';
  }
}

// View toggle functionality
function toggleView(view) {
  const grid = document.getElementById('postcard-grid');
  const buttons = document.querySelectorAll('.view-btn');
  
  // Update button states
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === view) {
      btn.classList.add('active');
    }
  });
  
  // Update grid class
  if (view === 'column') {
    grid.classList.add('column-view');
  } else {
    grid.classList.remove('column-view');
  }
}

// Modal functionality
function openModal(postcardElement) {
  const modal = document.getElementById('postcard-modal');
  const imagesContainer = modal.querySelector('.modal-images');
  const messageContainer = modal.querySelector('.modal-message');
  const countryContainer = modal.querySelector('.modal-country');
  const dateContainer = modal.querySelector('.modal-date');
  const topicContainer = modal.querySelector('.modal-topic');
  
  // Get postcard data
  const frontImage = postcardElement.querySelector('img').dataset.front;
  const backImage = postcardElement.querySelector('img').dataset.back;
  const title = postcardElement.dataset.title;
  const content = postcardElement.dataset.content;
  const country = postcardElement.dataset.country;
  const date = postcardElement.dataset.date;
  const topic = postcardElement.dataset.topic;
  const slug = postcardElement.dataset.slug;
  
  // Create images
  const frontImg = new Image();
  const backImg = new Image();
  
  frontImg.src = frontImage;
  backImg.src = backImage;
  frontImg.alt = title + ' - Front';
  backImg.alt = title + ' - Back';
  
  // Determine layout based on image dimensions
  Promise.all([
    new Promise(resolve => { frontImg.onload = () => resolve(frontImg); }),
    new Promise(resolve => { backImg.onload = () => resolve(backImg); })
  ]).then(([front, back]) => {
    const frontIsPortrait = front.naturalHeight > front.naturalWidth;
    const backIsPortrait = back.naturalHeight > back.naturalWidth;
    
    // Clear previous images
    imagesContainer.innerHTML = '';
    
    // Apply layout class
    if (frontIsPortrait && backIsPortrait) {
      imagesContainer.className = 'modal-images side-by-side';
    } else {
      imagesContainer.className = 'modal-images stacked';
    }
    
    // Add images to container
    imagesContainer.appendChild(front);
    imagesContainer.appendChild(back);
  });
  
  // Set content
  messageContainer.innerHTML = content || '';
  countryContainer.textContent = country || '';
  dateContainer.textContent = date || '';
  topicContainer.textContent = topic || '';
  
  // Update URL for deep linking
  history.pushState({ postcardSlug: slug }, title, `#${slug}`);
  
  // Show modal
  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('postcard-modal');
  
  // Update URL
  history.pushState(null, '', window.location.pathname);
  
  // Hide modal
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
  
  // Restore body scroll
  document.body.style.overflow = '';
}

function openModalBySlug(slug) {
  const postcardElement = document.querySelector(`[data-slug="${slug}"]`);
  if (postcardElement) {
    openModal(postcardElement);
  }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
  if (event.state && event.state.postcardSlug) {
    openModalBySlug(event.state.postcardSlug);
  } else {
    closeModal();
  }
});

// Handle direct links on page load
function handleDirectLink() {
  const hash = window.location.hash.substring(1);
  if (hash) {
    openModalBySlug(hash);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add scroll event listener
  window.addEventListener('scroll', handleScroll);
  
  // Add view toggle event listeners
  const viewButtons = document.querySelectorAll('.view-btn');
  viewButtons.forEach(button => {
    button.addEventListener('click', function() {
      toggleView(this.dataset.view);
    });
  });
  
  // Handle direct links
  handleDirectLink();
  
  // Close modal on overlay click
  document.getElementById('postcard-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });
  
  // Close modal on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
});