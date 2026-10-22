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

// Team tabs (team.html, members-home.html)
const teamTabButtons = document.querySelectorAll(".team-tab-btn");

function activateTeamTab(btn) {
  teamTabButtons.forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".team-panel").forEach((panel) => panel.classList.remove("active"));

  btn.classList.add("active");
  const target = document.getElementById(btn.dataset.target);
  if (target) target.classList.add("active");
}

teamTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => activateTeamTab(btn));
});

// Deep-link support: a link to e.g. members-home.html#panel-opportunities
// (used by "Back to Opportunities" on job detail pages) opens straight to
// that tab instead of the page's default panel.
if (teamTabButtons.length && window.location.hash) {
  const targetId = window.location.hash.slice(1);
  const linkedTab = document.querySelector('.team-tab-btn[data-target="' + targetId + '"]');
  if (linkedTab) activateTeamTab(linkedTab);
}

// "Welcome, Member!" heading (members-home.html) acts as a link back to
// the default view (the TraderMath promo), away from whatever tab is open.
const membersHomeReset = document.getElementById("members-home-reset");
if (membersHomeReset) {
  const resetToDefaultPanel = () => {
    teamTabButtons.forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".team-panel").forEach((panel) => panel.classList.remove("active"));
    const defaultPanel = document.getElementById("members-default-panel");
    if (defaultPanel) defaultPanel.classList.add("active");
    defaultPanel.scrollIntoView({ behavior: "smooth" });
  };
  membersHomeReset.addEventListener("click", resetToDefaultPanel);
  membersHomeReset.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      resetToDefaultPanel();
    }
  });
}

// Submit A Question form (members-home.html) -- posts to a Google Apps
// Script web app, which appends a row to a Google Sheet (and saves any
// uploaded images to Drive). See apps-script/submit-question/Code.gs for
// the server-side script and deploy steps. Responses can be downloaded as
// an .xlsx at any time from that Sheet (File > Download > Microsoft Excel).
const QUESTION_FORM_ENDPOINT =
  "https://script.google.com/macros/s/AKfycby37z03PymmEX7ryS59LqwNKIlHe864RLBuv1mEgnNIHzJGD9u0KxaYlKOvbnfzZAmw/exec";

const questionSubmitForm = document.getElementById("question-submit-form");
if (questionSubmitForm) {
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  questionSubmitForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = questionSubmitForm.querySelector('button[type="submit"]');
    const errorEl = document.getElementById("question-submit-error");
    if (errorEl) errorEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const formData = new FormData(questionSubmitForm);
      const fileInput = document.getElementById("q-images");
      const files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];
      const images = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          mimeType: file.type,
          data: await fileToBase64(file),
        }))
      );

      const payload = {
        company: formData.get("company"),
        role: formData.get("role"),
        interviewType: formData.get("interview_type"),
        round: formData.get("round"),
        question: formData.get("question"),
        topics: formData.getAll("topics"),
        images,
      };

      const response = await fetch(QUESTION_FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Unknown error");

      questionSubmitForm.hidden = true;
      const success = document.getElementById("question-submit-success");
      if (success) success.hidden = false;
    } catch (err) {
      if (errorEl) {
        errorEl.textContent =
          "Something went wrong submitting your question. Please try again, or reach out to the board directly.";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Question";
    }
  });
}

// Interview Question Bank flashcards (members-home.html) -- fetches
// submitted questions from the same Apps Script endpoint used for
// submissions (GET instead of POST) and shows one at a time; clicking a
// card advances to the next, looping back to the start.
const flashcardEl = document.getElementById("flashcard");
if (flashcardEl) {
  const statusEl = document.getElementById("flashcard-status");
  const roleFilter = document.getElementById("flashcard-role-filter");
  const topicFilter = document.getElementById("flashcard-topic-filter");
  const companyFilter = document.getElementById("flashcard-company-filter");
  const companyEl = document.getElementById("flashcard-company");
  const roleEl = document.getElementById("flashcard-role");
  const questionEl = document.getElementById("flashcard-question");

  let allQuestions = [];
  let filteredQuestions = [];
  let currentIndex = 0;

  function renderCard() {
    if (!filteredQuestions.length) {
      flashcardEl.hidden = true;
      statusEl.textContent = allQuestions.length
        ? "No questions match these filters."
        : "No questions submitted yet. Be the first with Submit A Question!";
      return;
    }
    flashcardEl.hidden = false;
    const card = filteredQuestions[currentIndex];
    companyEl.textContent = card.company || "Unknown Company";
    roleEl.textContent = card.role || "Unknown Role";
    questionEl.textContent = card.question;
    statusEl.textContent = `Card ${currentIndex + 1} of ${filteredQuestions.length}`;

    // Questions can contain LaTeX (e.g. "$n \leq 200$"); render it as math
    // instead of showing the raw source, if KaTeX's auto-render loaded.
    if (window.renderMathInElement) {
      renderMathInElement(questionEl, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }
  }

  // Role, topic, and company filters all stack together (AND logic), same
  // pattern as the Opportunities job filters.
  function applyFilters() {
    const role = roleFilter.value;
    const topic = topicFilter.value;
    const company = companyFilter.value;

    filteredQuestions = allQuestions.filter((q) => {
      const matchesRole = role === "all" || q.role === role;
      const matchesTopic = topic === "all" || (q.topics || []).includes(topic);
      const matchesCompany = company === "all" || q.company === company;
      return matchesRole && matchesTopic && matchesCompany;
    });
    currentIndex = 0;
    renderCard();
  }

  function populateCompanyFilter() {
    const companies = Array.from(
      new Set(allQuestions.map((q) => q.company).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    companies.forEach((company) => {
      const option = document.createElement("option");
      option.value = company;
      option.textContent = company;
      companyFilter.appendChild(option);
    });
  }

  function showNextCard() {
    if (!filteredQuestions.length) return;
    currentIndex = (currentIndex + 1) % filteredQuestions.length;
    renderCard();
  }

  flashcardEl.addEventListener("click", showNextCard);
  flashcardEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      showNextCard();
    }
  });
  roleFilter.addEventListener("change", applyFilters);
  topicFilter.addEventListener("change", applyFilters);
  companyFilter.addEventListener("change", applyFilters);

  statusEl.textContent = "Loading questions...";
  fetch(QUESTION_FORM_ENDPOINT)
    .then((res) => res.json())
    .then((result) => {
      if (!result.ok) throw new Error(result.error || "Unknown error");
      allQuestions = result.questions || [];
      populateCompanyFilter();
      applyFilters();
    })
    .catch(() => {
      statusEl.textContent = "Couldn't load questions right now. Please try again later.";
    });
}

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

  // Keyed by "YYYY-MM-DD" (month is 1-indexed here for readability). A
  // multi-day event (like the interview window) is just the same entry
  // repeated under each date in the range, so every day in it lights up.
  const calendarEvents = {
    "2026-10-08": {
      title: "Welcome Picnic",
      date: "Thursday, October 8, 2026",
      location: "The Quad near Eckhart Hall",
      time: "3-5 PM",
      description: "Kick off the year with a relaxed picnic at The Quad near Eckhart Hall. Enjoy snacks, soft drinks, and a chance to meet fellow PQC members, connect with new faces, and get to know the community before the semester's programming gets underway.",
    },
    "2026-10-16": {
      title: "E-Board Applications Due",
      date: "Friday, October 16, 2026",
      location: "Submitted online",
      time: "11:59 PM CT",
      description: "Deadline to submit your application for an executive board position. Be sure to submit before 11:59 PM CT.",
    },
    "2026-10-21": {
      title: "E-Board Interviews",
      date: "October 21-28, 2026",
      location: "Location TBD",
      time: "Time TBD",
      description: "Interviews for executive board applicants will take place during this window. Individual interview times will be scheduled separately.",
    },
    "2026-10-22": {
      title: "E-Board Interviews",
      date: "October 21-28, 2026",
      location: "Location TBD",
      time: "Time TBD",
      description: "Interviews for executive board applicants will take place during this window. Individual interview times will be scheduled separately.",
    },
    "2026-10-23": {
      title: "E-Board Interviews",
      date: "October 21-28, 2026",
      location: "Location TBD",
      time: "Time TBD",
      description: "Interviews for executive board applicants will take place during this window. Individual interview times will be scheduled separately.",
    },
    "2026-10-24": {
      title: "E-Board Interviews",
      date: "October 21-28, 2026",
      location: "Location TBD",
      time: "Time TBD",
      description: "Interviews for executive board applicants will take place during this window. Individual interview times will be scheduled separately.",
    },
    "2026-10-25": {
      title: "E-Board Interviews",
      date: "October 21-28, 2026",
      location: "Location TBD",
      time: "Time TBD",
      description: "Interviews for executive board applicants will take place during this window. Individual interview times will be scheduled separately.",
    },
    "2026-10-26": {
      title: "E-Board Interviews",
      date: "October 21-28, 2026",
      location: "Location TBD",
      time: "Time TBD",
      description: "Interviews for executive board applicants will take place during this window. Individual interview times will be scheduled separately.",
    },
    "2026-10-27": {
      title: "E-Board Interviews",
      date: "October 21-28, 2026",
      location: "Location TBD",
      time: "Time TBD",
      description: "Interviews for executive board applicants will take place during this window. Individual interview times will be scheduled separately.",
    },
    "2026-10-28": {
      title: "E-Board Interviews",
      date: "October 21-28, 2026",
      location: "Location TBD",
      time: "Time TBD",
      description: "Interviews for executive board applicants will take place during this window. Individual interview times will be scheduled separately.",
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

// Note: the members.html password-gate logic lives inline in that page
// (not here), so it keeps working even if this shared script fails to
// load for some visitors (a strict ad-blocker, a caching hiccup, etc.).

// Log out of the members page (members-home.html) -- clears the session
// flag and sends the visitor back to the password gate.
const membersLogoutBtn = document.getElementById("members-logout");

if (membersLogoutBtn) {
  membersLogoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("pqcMemberAuth");
    window.location.href = "members.html";
  });
}
