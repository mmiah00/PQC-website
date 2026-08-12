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

// Opportunities filters (opportunities.html) -- type buttons + location,
// title, posted-within, and company-type all stack together (AND logic):
// a card only shows if it passes every active filter at once.
const jobCards = document.querySelectorAll(".job-card");

if (jobCards.length) {
  const filterButtons = document.querySelectorAll(".filter-btn");
  const locationInput = document.getElementById("filter-location");
  const titleInput = document.getElementById("filter-title");
  const postedSelect = document.getElementById("filter-posted");
  const companyTypeSelect = document.getElementById("filter-company-type");
  const clearButton = document.getElementById("filter-clear");
  const countLabel = document.getElementById("job-filters-count");

  let activeType = "all";

  const daysSince = (isoDate) => {
    if (!isoDate) return Infinity;
    const posted = new Date(isoDate + "T00:00:00");
    if (Number.isNaN(posted.getTime())) return Infinity;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((Date.now() - posted.getTime()) / msPerDay);
  };

  const applyFilters = () => {
    const locationQuery = locationInput.value.trim().toLowerCase();
    const titleQuery = titleInput.value.trim().toLowerCase();
    const postedLimit = postedSelect.value;
    const companyType = companyTypeSelect.value;

    let visibleCount = 0;

    // "women-focused" and "new-grad" are cross-cutting tags (a card can be
    // e.g. both Full-Time and New Grad), so they filter on their own data
    // attribute instead of the normal type/data-category match.
    const crossCuttingFilters = {
      "women-focused": (card) => card.dataset.womenFocused === "true",
      "new-grad": (card) => card.dataset.newGrad === "true",
    };

    jobCards.forEach((card) => {
      const matchesType =
        activeType === "all" ||
        (crossCuttingFilters[activeType]
          ? crossCuttingFilters[activeType](card)
          : card.dataset.category === activeType);
      const matchesLocation = !locationQuery || card.dataset.location.includes(locationQuery);
      const matchesTitle = !titleQuery || card.querySelector("h3").textContent.toLowerCase().includes(titleQuery);
      const matchesPosted = postedLimit === "any" || daysSince(card.dataset.posted) <= Number(postedLimit);
      const matchesCompanyType = companyType === "all" || card.dataset.companyType === companyType;

      const show = matchesType && matchesLocation && matchesTitle && matchesPosted && matchesCompanyType;
      card.style.display = show ? "" : "none";
      if (show) visibleCount += 1;
    });

    if (countLabel) {
      countLabel.textContent = `Showing ${visibleCount} of ${jobCards.length} opportunities`;
    }
  };

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeType = btn.dataset.filter;
      applyFilters();
    });
  });

  [locationInput, titleInput].forEach((input) => {
    input.addEventListener("input", applyFilters);
  });
  [postedSelect, companyTypeSelect].forEach((select) => {
    select.addEventListener("change", applyFilters);
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      locationInput.value = "";
      titleInput.value = "";
      postedSelect.value = "any";
      companyTypeSelect.value = "all";
      filterButtons.forEach((b) => b.classList.remove("active"));
      document.querySelector('.filter-btn[data-filter="all"]').classList.add("active");
      activeType = "all";
      applyFilters();
    });
  }

  applyFilters();
}
