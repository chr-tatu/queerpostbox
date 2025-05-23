// Posts functionality
let currentlyVisible = 12;
const totalPosts = parseInt(document.querySelector('#postcard-grid').dataset.totalPosts);

function loadMore() {
  const hiddenItems = document.querySelectorAll('.postcard-item.hidden');
  
  // Show next 12 items
  for (let i = 0; i < Math.min(12, hiddenItems.length); i++) {
    hiddenItems[i].classList.remove('hidden');
    currentlyVisible++;
  }
}

// Infinite scroll functionality
function handleScroll() {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
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
  
  // Clear any existing timeout
  if (container.flipTimeout) {
    clearTimeout(container.flipTimeout);
    container.flipTimeout = null;
  }
  
  if (isHover) {
    // Add 0.5 second delay before flip starts
    container.flipTimeout = setTimeout(() => {
      img.src = img.dataset.back;
      img.style.transform = 'rotateY(180deg) scaleX(-1)';
    }, 300);
  } else {
    // Immediate flip back to front
    img.src = img.dataset.front;
    img.style.transform = '';
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add scroll event listener
  window.addEventListener('scroll', handleScroll);
});