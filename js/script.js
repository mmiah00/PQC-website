// Mobile nav toggle
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen);
  });
}

// FAQ accordion (about.html)
document.querySelectorAll(".accordion-item").forEach((item) => {
  const trigger = item.querySelector(".accordion-trigger");
  const panel = item.querySelector(".accordion-panel");
  if (!trigger || !panel) return;

  trigger.addEventListener("click", () => {
    const isOpen = item.classList.contains("open");

    document.querySelectorAll(".accordion-item.open").forEach((openItem) => {
      if (openItem !== item) {
        openItem.classList.remove("open");
        openItem.querySelector(".accordion-panel").style.maxHeight = null;
      }
    });

    if (isOpen) {
      item.classList.remove("open");
      panel.style.maxHeight = null;
    } else {
      item.classList.add("open");
      panel.style.maxHeight = panel.scrollHeight + "px";
    }
  });
});

// Team tabs (team.html)
const teamTabButtons = document.querySelectorAll(".team-tab-btn");
teamTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    teamTabButtons.forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".team-panel").forEach((panel) => panel.classList.remove("active"));

    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.target);
    if (target) target.classList.add("active");
  });
});

// Team member flip cards (team.html)
document.querySelectorAll(".flip-trigger").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.closest(".flip-card").classList.toggle("flipped");
  });
});

// Opportunities filter (opportunities.html)
const filterButtons = document.querySelectorAll(".filter-btn");
const jobCards = document.querySelectorAll(".job-card");

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const filter = btn.dataset.filter;
    jobCards.forEach((card) => {
      const show = filter === "all" || card.dataset.category === filter;
      card.style.display = show ? "" : "none";
    });
  });
});
