const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const bars = document.querySelectorAll(".bar");

let isOpen = false;

menuBtn.addEventListener("click", () => {
  if (!isOpen) {

    mobileMenu.classList.remove("-translate-y-10", "opacity-0", "pointer-events-none");
    mobileMenu.classList.add("translate-y-0", "opacity-100");

    bars[0].classList.add("rotate-45", "translate-y-1.5");
    bars[1].classList.add("opacity-0");
    bars[2].classList.add("-rotate-45", "-translate-y-1.5");
    isOpen = true;
  } else {

    mobileMenu.classList.add("-translate-y-10", "opacity-0", "pointer-events-none");
    mobileMenu.classList.remove("translate-y-0", "opacity-100");

    bars[0].classList.remove("rotate-45", "translate-y-1.5");
    bars[1].classList.remove("opacity-0");
    bars[2].classList.remove("-rotate-45", "-translate-y-1.5");
    isOpen = false;
  }
});

// Optional: close menu on link click
document.querySelectorAll("#mobileMenu a").forEach(link => {
  link.addEventListener("click", () => {
    mobileMenu.classList.add("-translate-y-full");
    mobileMenu.classList.remove("translate-y-0");

    // Reset hamburger
    bars[0].classList.remove("rotate-45", "translate-y-1.5");
    bars[1].classList.remove("opacity-0");
    bars[2].classList.remove("-rotate-45", "-translate-y-1.5");

    isOpen = false;
  });
});


// Όλα τα elements με animation
const animatedElements = document.querySelectorAll('.animate-fade-scale');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // μόνο μια φορά
      }
    });
  },
  {
    threshold: 0.4, // εμφανίζεται όταν μπει 20% στο viewport
  }
);

// observer σε όλα τα στοιχεία
animatedElements.forEach((el) => observer.observe(el));