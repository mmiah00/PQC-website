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

// Team member flip cards (team.html) -- disabled, flip button removed from cards
// document.querySelectorAll(".flip-trigger").forEach((btn) => {
//   btn.addEventListener("click", () => {
//     btn.closest(".flip-card").classList.toggle("flipped");
//   });
// });

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

// Interactive chart tooltips (why-it-matters.html) -- any element with a
// data-tooltip attribute (bar rows, SVG points, donut arcs, heatmap cells)
// gets a shared floating tooltip that follows the cursor.
const tooltipTargets = document.querySelectorAll("[data-tooltip]");

if (tooltipTargets.length) {
  const tooltip = document.createElement("div");
  tooltip.className = "viz-tooltip";
  document.body.appendChild(tooltip);

  tooltipTargets.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      tooltip.textContent = el.dataset.tooltip;
      tooltip.classList.add("visible");
    });
    el.addEventListener("mousemove", (e) => {
      tooltip.style.left = `${e.clientX + 16}px`;
      tooltip.style.top = `${e.clientY + 16}px`;
    });
    el.addEventListener("mouseleave", () => {
      tooltip.classList.remove("visible");
    });
    el.addEventListener("focus", () => {
      const rect = el.getBoundingClientRect();
      tooltip.textContent = el.dataset.tooltip;
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.bottom + 8}px`;
      tooltip.classList.add("visible");
    });
    el.addEventListener("blur", () => {
      tooltip.classList.remove("visible");
    });
  });
}

// Interactive events calendar (events.html) -- month-view grid built from a
// small events map; click a highlighted date to see its details below.
const calGrid = document.getElementById("cal-grid");

if (calGrid) {
  const calMonthLabel = document.getElementById("cal-month-label");
  const calDetails = document.getElementById("cal-details");
  const calPrevBtn = document.getElementById("cal-prev");
  const calNextBtn = document.getElementById("cal-next");

  // Keyed by "YYYY-MM-DD" (month is 1-indexed here for readability).
  const calendarEvents = {
    "2026-10-09": {
      title: "Welcome Picnic",
      date: "October 9, 2026",
      location: "Promontory Point",
      time: "Time TBD",
      description: "Kick off the year with a relaxed picnic at Promontory Point. Enjoy snacks, soft drinks, and a chance to meet fellow PQC members, connect with new faces, and get to know the community before the semester's programming gets underway.",
    },
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  let calYear = 2026;
  let calMonth = 9; // 0-indexed: October

  const dateKey = (year, month, day) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const showEventDetails = (key) => {
    const event = calendarEvents[key];
    if (!event) return;
    calDetails.innerHTML = `
      <h4>${event.title}</h4>
      <p class="job-meta"><span>${event.date}</span><span>${event.location}</span><span>${event.time}</span></p>
      <p>${event.description}</p>
    `;
  };

  const renderCalendar = (year, month) => {
    calMonthLabel.textContent = `${monthNames[month]} ${year}`;
    calGrid.innerHTML = "";

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstWeekday; i += 1) {
      const filler = document.createElement("div");
      filler.className = "calendar-day is-empty";
      calGrid.appendChild(filler);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = dateKey(year, month, day);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar-day";
      cell.textContent = day;

      if (calendarEvents[key]) {
        cell.classList.add("has-event");
        cell.setAttribute("aria-label", `${monthNames[month]} ${day}: ${calendarEvents[key].title}`);
        cell.addEventListener("click", () => {
          calGrid.querySelectorAll(".calendar-day.selected").forEach((el) => el.classList.remove("selected"));
          cell.classList.add("selected");
          showEventDetails(key);
        });
      } else {
        cell.disabled = true;
      }

      calGrid.appendChild(cell);
    }
  };

  calPrevBtn.addEventListener("click", () => {
    calMonth -= 1;
    if (calMonth < 0) {
      calMonth = 11;
      calYear -= 1;
    }
    renderCalendar(calYear, calMonth);
  });

  calNextBtn.addEventListener("click", () => {
    calMonth += 1;
    if (calMonth > 11) {
      calMonth = 0;
      calYear += 1;
    }
    renderCalendar(calYear, calMonth);
  });

  renderCalendar(calYear, calMonth);
}

// Fluid horizontal scroll for the nav guide cards (get-involved.html) --
// wheel, trackpad, and drag input all glide the card strip left to right
// via Lenis instead of the browser's default (jumpy) horizontal scroll.
const navGuideScroll = document.getElementById("nav-guide-scroll");
const navGuideTrack = document.getElementById("nav-guide-track");

if (navGuideScroll && navGuideTrack && window.Lenis) {
  const navGuideLenis = new window.Lenis({
    wrapper: navGuideScroll,
    content: navGuideTrack,
    orientation: "horizontal",
    gestureOrientation: "both",
    smoothWheel: true,
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
  });

  const rafNavGuide = (time) => {
    navGuideLenis.raf(time);
    requestAnimationFrame(rafNavGuide);
  };
  requestAnimationFrame(rafNavGuide);
}
