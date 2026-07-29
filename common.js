const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const drawer = $("#drawer");
const backdrop = $("#drawerBackdrop");
const menuButton = $("#menuButton");
const closeMenuButton = $("#closeMenu");

function setDrawer(open) {
  drawer?.classList.toggle("open", open);
  backdrop?.classList.toggle("open", open);
  document.body.style.overflow = open ? "hidden" : "";
  menuButton?.setAttribute("aria-expanded", String(open));
}

menuButton?.addEventListener("click", () => setDrawer(true));
closeMenuButton?.addEventListener("click", () => setDrawer(false));
backdrop?.addEventListener("click", () => setDrawer(false));

document.addEventListener("keydown", event => {
  if (event.key === "Escape") setDrawer(false);
});

$$(".drawer-nav a").forEach(link => {
  link.addEventListener("click", () => setDrawer(false));
});

const oldMainNav = $("#mainNav");
if (menuButton && oldMainNav && !drawer) {
  menuButton.addEventListener("click", () => {
    const open = oldMainNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  $$("a", oldMainNav).forEach(link => {
    link.addEventListener("click", () => {
      oldMainNav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

const year = $("#year");
if (year) year.textContent = new Date().getFullYear();

function showToast(message) {
  let toast = $("#toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.kmtToastTimer);
  window.kmtToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem("kmtProgress") || "{}");
  } catch {
    return {};
  }
}

function setProgress(progress) {
  localStorage.setItem("kmtProgress", JSON.stringify(progress));
}

function isLoggedIn() {
  return Boolean(localStorage.getItem("kmtUser"));
}

$$("[data-requires-login]").forEach(link => {
  link.addEventListener("click", event => {
    if (!isLoggedIn()) {
      event.preventDefault();
      localStorage.setItem("kmtReturnTo", link.getAttribute("href"));
      window.location.href = "login.html";
    }
  });
});


const KMT_COURSES_KEY = "kmtCustomCourses";

function getCustomCourses() {
  try {
    return JSON.parse(localStorage.getItem(KMT_COURSES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCustomCourses(courses) {
  localStorage.setItem(KMT_COURSES_KEY, JSON.stringify(courses));
}

function createCourseId(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "course";

  const existing = new Set(getCustomCourses().map(course => course.id));
  let candidate = base;
  let number = 2;

  while (existing.has(candidate)) {
    candidate = `${base}-${number++}`;
  }

  return candidate;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}
