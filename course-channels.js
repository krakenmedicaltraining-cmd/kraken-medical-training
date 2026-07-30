/* =========================================================
   KRAKEN MEDICAL TRAINING
   DYNAMIC COURSE CHANNELS
   ========================================================= */

"use strict";

const KRAKEN_CATEGORIES = [
  {
    name: "Trauma care",
    shortName: "Trauma",
    className: "trauma",
    description: "Haemorrhage, trauma assessment and casualty care."
  },
  {
    name: "Resuscitation",
    shortName: "Resuscitation",
    className: "resus",
    description: "CPR, life support and emergency team response."
  },
  {
    name: "Communication",
    shortName: "Communication",
    className: "comms",
    description: "Handover, consultation and clinical communication."
  },
  {
    name: "Primary healthcare",
    shortName: "Primary care",
    className: "primary-care",
    description: "Assessment, prevention and everyday clinical care."
  },
  {
    name: "Clinical skills",
    shortName: "Clinical skills",
    className: "clinical",
    description: "Practical procedures, observations and diagnostics."
  },
  {
    name: "Professional development",
    shortName: "Development",
    className: "leadership",
    description: "Leadership, teaching, reflection and professional growth."
  },
  {
    name: "Games and simulations",
    shortName: "Simulations",
    className: "simulation",
    description: "Interactive scenarios, games and decision training."
  }
];

let krakenPublishedCourses = [];
let krakenSelectedCategory = "all";

/* =========================================================
   HELPERS
   ========================================================= */

function channelEscape(value) {
  const text = String(value ?? "");

  if (typeof escapeHtml === "function") {
    return escapeHtml(text);
  }

  const element = document.createElement("div");
  element.textContent = text;

  return element.innerHTML;
}

function normaliseCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryMatches(firstValue, secondValue) {
  return (
    normaliseCategory(firstValue) ===
    normaliseCategory(secondValue)
  );
}

function getCategoryDefinition(categoryName) {
  return KRAKEN_CATEGORIES.find(category =>
    categoryMatches(category.name, categoryName)
  );
}

function getCoursesInCategory(categoryName) {
  return krakenPublishedCourses.filter(course =>
    categoryMatches(course.category, categoryName)
  );
}

function getCourseUrl(course) {
  return `course.html?id=${encodeURIComponent(course.id)}`;
}

function getCourseInitials(course) {
  const suppliedIcon = String(course.icon || "").trim();

  if (suppliedIcon) {
    return suppliedIcon.slice(0, 5);
  }

  return String(course.title || "K")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase();
}

/* =========================================================
   CLINICAL AREA CARDS
   ========================================================= */

function renderClinicalAreas() {
  const shelf = document.querySelector(
    "#courses .stream-shelf"
  );

  if (!shelf) {
    return;
  }

  const availableCategories = KRAKEN_CATEGORIES
    .map(category => ({
      ...category,
      courses: getCoursesInCategory(category.name)
    }))
    .filter(category => category.courses.length > 0);

  if (!availableCategories.length) {
    shelf.innerHTML = `
      <article class="channel-empty-state">
        <strong>No published clinical areas yet</strong>
        <p>
          Publish a course and its clinical area will appear here.
        </p>
      </article>
    `;

    return;
  }

  shelf.innerHTML = availableCategories
    .map((category, index) => {
      const newestCourse = category.courses[0];

      const courseCount = category.courses.length;

      const countText =
        courseCount === 1
          ? "1 course"
          : `${courseCount} courses`;

      return `
        <button
          class="stream-poster ${channelEscape(category.className)} dynamic-channel-card"
          type="button"
          data-course-category="${channelEscape(category.name)}"
          aria-label="Show ${channelEscape(category.name)} courses"
        >
          <span class="stream-poster-rank">
            ${String(index + 1).padStart(2, "0")}
          </span>

          <div class="stream-poster-copy">
            <small>
              ${channelEscape(category.shortName).toUpperCase()}
            </small>

            <h3>
              ${channelEscape(category.name)}
            </h3>

            <p>
              ${channelEscape(category.description)}
            </p>

            <span>
              ${channelEscape(countText)} · View channel →
            </span>

            <small class="channel-latest-course">
              Latest: ${channelEscape(newestCourse.title)}
            </small>
          </div>
        </button>
      `;
    })
    .join("");

  shelf
    .querySelectorAll("[data-course-category]")
    .forEach(button => {
      button.addEventListener("click", () => {
        selectCourseCategory(
          button.dataset.courseCategory
        );
      });
    });
}

/* =========================================================
   LATEST COURSES
   ========================================================= */

function renderLatestCourses(categoryName = "all") {
  const section = document.querySelector(
    "#customCoursesSection"
  );

  const grid = document.querySelector(
    "#customCourseGrid"
  );

  if (!section || !grid) {
    return;
  }

  const heading = section.querySelector("h2");

  const eyebrow = section.querySelector(
    ".stream-eyebrow"
  );

  const filteredCourses =
    categoryName === "all"
      ? krakenPublishedCourses
      : getCoursesInCategory(categoryName);

  section.hidden = false;

  if (heading) {
    heading.textContent =
      categoryName === "all"
        ? "Latest Kraken courses"
        : categoryName;
  }

  if (eyebrow) {
    eyebrow.textContent =
      categoryName === "all"
        ? "NEW RELEASES"
        : "CLINICAL CHANNEL";
  }

  if (!filteredCourses.length) {
    grid.innerHTML = `
      <article class="channel-empty-state">
        <strong>No published courses found</strong>

        <p>
          There are currently no published courses in
          ${channelEscape(categoryName)}.
        </p>

        <button
          class="channel-reset-button"
          id="resetCourseCategory"
          type="button"
        >
          Show all courses
        </button>
      </article>
    `;

    document
      .querySelector("#resetCourseCategory")
      ?.addEventListener("click", () => {
        selectCourseCategory("all");
      });

    return;
  }

  grid.innerHTML = filteredCourses
    .map(course => {
      const definition = getCategoryDefinition(
        course.category
      );

      return `
        <a
          class="card dynamic-course-card"
          href="${getCourseUrl(course)}"
          data-category="${channelEscape(
            normaliseCategory(course.category)
          )}"
        >
          <span class="card-icon">
            ${channelEscape(getCourseInitials(course))}
          </span>

          <span class="tag">
            ${channelEscape(
              definition?.name ||
              course.category ||
              "Medical training"
            )}
          </span>

          <h3>
            ${channelEscape(
              course.title ||
              "Kraken course"
            )}
          </h3>

          <p>
            ${channelEscape(
              course.description ||
              "Open this Kraken training course."
            )}
          </p>

          <span class="card-link">
            Open course →
          </span>
        </a>
      `;
    })
    .join("");
}

/* =========================================================
   CATEGORY SELECTION
   ========================================================= */

function selectCourseCategory(categoryName) {
  const selectedCategory =
    categoryName || "all";

  if (selectedCategory === "all") {
    window.location.href =
      "courses.html";
  }
  else {
    window.location.href =
      "courses.html?category=" +
      encodeURIComponent(
        selectedCategory
      );
  }
}

function updateSelectedChannel() {
  document
    .querySelectorAll("[data-course-category]")
    .forEach(button => {
      const selected = categoryMatches(
        button.dataset.courseCategory,
        krakenSelectedCategory
      );

      button.classList.toggle(
        "selected-channel",
        selected
      );

      button.setAttribute(
        "aria-pressed",
        String(selected)
      );
    });
}

function updateCategoryAddress() {
  const url = new URL(window.location.href);

  if (krakenSelectedCategory === "all") {
    url.searchParams.delete("category");
  } else {
    url.searchParams.set(
      "category",
      krakenSelectedCategory
    );
  }

  history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}#customCoursesSection`
  );
}

function readCategoryFromAddress() {
  const params = new URLSearchParams(
    window.location.search
  );

  const requestedCategory =
    params.get("category");

  if (!requestedCategory) {
    return "all";
  }

  const validCategory = KRAKEN_CATEGORIES.find(
    category =>
      categoryMatches(
        category.name,
        requestedCategory
      )
  );

  return validCategory
    ? validCategory.name
    : "all";
}

/* =========================================================
   PAGE LABELS
   ========================================================= */

function updateBrowseLinks() {
  const clinicalSection =
    document.querySelector("#courses");

  const browseLink =
    clinicalSection?.querySelector(
      ".stream-section-heading > a"
    );

  if (browseLink) {
    browseLink.href =
      "#customCoursesSection";

    browseLink.textContent =
      "View all courses →";

    browseLink.addEventListener(
      "click",
      event => {
        event.preventDefault();
        selectCourseCategory("all");
      }
    );
  }

  const manageLink =
    document.querySelector(
      "#customCoursesSection .stream-section-heading > a"
    );

  if (manageLink) {
    manageLink.href = "admin.html";
    manageLink.textContent =
      "Manage courses →";
  }
}

/* =========================================================
   STYLES
   ========================================================= */

function installChannelStyles() {
  if (
    document.querySelector(
      "#krakenChannelStyles"
    )
  ) {
    return;
  }

  const styles = document.createElement("style");

  styles.id = "krakenChannelStyles";

  styles.textContent = `
    .dynamic-channel-card {
      appearance: none;
      width: 100%;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .dynamic-channel-card.selected-channel {
      border-color: #39d1a5;
      box-shadow:
        0 0 0 2px rgba(57, 209, 165, 0.18),
        0 24px 60px rgba(0, 0, 0, 0.36);
      transform: translateY(-5px);
    }

    .channel-latest-course {
      display: block;
      margin-top: 12px;
      color: rgba(237, 248, 243, 0.64);
      font-size: 0.68rem;
      line-height: 1.4;
    }

    .channel-empty-state {
      min-width: min(100%, 420px);
      padding: 28px;
      color: #edf8f3;
      background: rgba(255, 255, 255, 0.045);
      border: 1px dashed rgba(237, 248, 243, 0.22);
      border-radius: 24px;
    }

    .channel-empty-state strong {
      display: block;
      margin-bottom: 8px;
      font-size: 1.1rem;
    }

    .channel-empty-state p {
      margin: 0;
      color: rgba(237, 248, 243, 0.65);
    }

    .channel-reset-button {
      margin-top: 18px;
      padding: 12px 17px;
      color: #04100c;
      background: #39d1a5;
      border: 0;
      border-radius: 12px;
      font-weight: 800;
      cursor: pointer;
    }

    @media (max-width: 720px) {
      .dynamic-channel-card {
        min-width: 78vw;
      }
    }
  `;

  document.head.appendChild(styles);
}

/* =========================================================
   INITIALISE
   ========================================================= */

async function initialiseCourseChannels() {
  installChannelStyles();
  updateBrowseLinks();

  const clinicalShelf = document.querySelector(
    "#courses .stream-shelf"
  );

  if (clinicalShelf) {
    clinicalShelf.innerHTML = `
      <article class="channel-empty-state">
        <strong>Loading clinical areas</strong>
        <p>Connecting to the Kraken course catalogue…</p>
      </article>
    `;
  }

  try {
    const courses =
      await getPublicCoursesOnline();

    krakenPublishedCourses =
      Array.isArray(courses)
        ? courses
        : [];

    renderClinicalAreas();

    krakenSelectedCategory =
      readCategoryFromAddress();

    renderLatestCourses(
      krakenSelectedCategory
    );

    updateSelectedChannel();
  } catch (error) {
    console.error(
      "Could not load Kraken course channels:",
      error
    );

    if (clinicalShelf) {
      clinicalShelf.innerHTML = `
        <article class="channel-empty-state">
          <strong>Course catalogue unavailable</strong>
          <p>
            The clinical areas could not be loaded.
            Refresh the page to try again.
          </p>
        </article>
      `;
    }
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initialiseCourseChannels
);
