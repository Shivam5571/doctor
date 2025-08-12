//================================================== <!-- navigation logic-->


document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-links a");
  const sections = document.querySelectorAll("section[id]");

  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY + 100;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute("id");

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        navLinks.forEach((link) => {
          link.classList.remove("active");
          const href = link.getAttribute("href");
          if (
            href === `#${sectionId}` || 
            href === `index.html#${sectionId}`
          ) {
            link.classList.add("active");
          }
        });
      }
    });
  });
});

// ==================================================<!--end-->



// ==================================================<!-- preloader-->

  window.addEventListener('load', function () {
    setTimeout(function () {
      document.getElementById('preloader').style.display = 'none';
    }, 100); // Show for 2 seconds
  });



//==================================hero state=================================
document.addEventListener('DOMContentLoaded', () => {
  const counters = document.querySelectorAll('.stat-number');
  let hasAnimated = false; // To prevent repeated animations

  const runCounterAnimation = () => {
    counters.forEach(counter => {
      const target = +counter.getAttribute('data-target');
      const duration = 2000;
      const frameRate = 30;
      const increment = target / (duration / frameRate);
      let current = 0;

      const updateCounter = () => {
        current += increment;
        if (current < target) {
          counter.textContent = Math.ceil(current);
          setTimeout(updateCounter, frameRate);
        } else {
          counter.textContent = target;
        }
      };

      updateCounter();
    });
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasAnimated) {
        runCounterAnimation();
        hasAnimated = true;
      }
    });
  }, { threshold: 0.5 }); // Trigger when 50% of section is visible

  const statsSection = document.querySelector('.hero-stats');
  if (statsSection) {
    observer.observe(statsSection);
  }
});

