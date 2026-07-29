const progress = getProgress();
const completedLessons = Object.values(progress.marchPaws || {}).filter(Boolean).length;
const percentage = Math.round((completedLessons / 6) * 100);

const heroProgress = $("#heroProgress");
const heroProgressText = $("#heroProgressText");

if (heroProgress) {
  heroProgress.style.width = `${percentage}%`;
}

if (heroProgressText) {
  heroProgressText.textContent = `${completedLessons} of 6 lessons`;
}

const featuredProgress = $("#featuredProgress");
const featuredProgressText = $("#featuredProgressText");
const featuredButton = $("#featuredButton");

if (featuredProgress) {
  featuredProgress.style.width = `${percentage}%`;
}

if (featuredProgressText) {
  featuredProgressText.textContent = `${completedLessons} of 6 lessons`;
}

if (featuredButton) {
  featuredButton.textContent = completedLessons ? "Continue module" : "Start module";
}

const searchInput = $("#courseSearch");
const courseCards = $$(".course-card");
const emptyState = $("#emptyState");
let activeFilter = "all";

function filterCourses() {
  if (!searchInput || !courseCards.length) return;

  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  courseCards.forEach(card => {
    const categoryMatches =
      activeFilter === "all" || card.dataset.category === activeFilter;

    const content =
      `${card.dataset.search || ""} ${card.textContent}`.toLowerCase();

    const queryMatches = content.includes(query);
    const visible = categoryMatches && queryMatches;

    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  if (emptyState) {
    emptyState.hidden = visibleCount !== 0;
  }
}

searchInput?.addEventListener("input", filterCourses);

$$(".filter-button").forEach(button => {
  button.addEventListener("click", () => {
    $$(".filter-button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter || "all";
    filterCourses();
  });
});


async function renderOnlineCourses() {
  const customSection = $("#customCoursesSection");
  const customGrid = $("#customCourseGrid");
  if (!customSection || !customGrid) return;

  try {
    const courses = await getPublicCoursesOnline();

    if (!courses.length) {
      customSection.hidden = true;
      return;
    }

    customSection.hidden = false;
    customGrid.innerHTML = courses.map(course => `
      <a class="card" href="course.html?id=${encodeURIComponent(course.id)}">
        <span class="card-icon">${escapeHtml(course.icon || "K")}</span>
        <span class="tag">${escapeHtml(course.category)}</span>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.description)}</p>
        <span class="card-link">Open course →</span>
      </a>
    `).join("");
  } catch (error) {
    console.error("Could not load online courses:", error);
    customSection.hidden = true;
  }
}

renderOnlineCourses();
