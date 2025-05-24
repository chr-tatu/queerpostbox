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
  
  // Clear any existing timeout
  if (container.flipTimeout) {
    clearTimeout(container.flipTimeout);
    container.flipTimeout = null;
  }
  
  if (isHover) {
    container.flipTimeout = setTimeout(() => {
      // Start the flip animation
      img.style.transform = 'rotateY(180deg) scaleX(-1)';
      
      // Change the image at the middle of the animation (170ms into 340ms transition)
      setTimeout(() => {
        img.src = img.dataset.back;
      }, 200);
    }, 300);
  } else {
    img.src = img.dataset.front;
    img.style.transform = '';
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add scroll event listener
  window.addEventListener('scroll', handleScroll);
});