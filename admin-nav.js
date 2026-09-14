"use strict";

(() => {
  const ADMIN_PAGES = [
    { href: "admin-hub.html", label: "Admin hub", icon: "⌂" },
    { href: "admin.html", label: "Courses", icon: "▤" },
    { href: "instructor-package-builder.html", label: "Instructor packages", icon: "▣" },
    { href: "journal-admin.html", label: "Journal", icon: "☷" },
    { href: "resource-admin.html", label: "Uploads", icon: "⇧" },
    { href: "instructor.html", label: "Instructor hub", icon: "◎" },
    { href: "quiz-admin.html", label: "Quizzes", icon: "?" },
    { href: "certificate-admin.html", label: "Certificates", icon: "⌁" }
  ];

  const currentFile = (
    location.pathname.split("/").pop() || "index.html"
  ).toLowerCase();

  function makeLink(item) {
    const link = document.createElement("a");

    link.className =
      "kraken-admin-nav-link" +
      (currentFile === item.href.toLowerCase() ? " active" : "");

    link.href = item.href;

    link.innerHTML = `
      <span aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    `;

    return link;
  }

  function buildAdminNav() {
    if (document.querySelector(".kraken-admin-nav")) return;

    const nav = document.createElement("nav");
    nav.className = "kraken-admin-nav";
    nav.setAttribute("aria-label", "Kraken administration navigation");

    const brand = document.createElement("a");
    brand.className = "kraken-admin-nav-brand";
    brand.href = "admin-hub.html";
    brand.innerHTML = `
      <img src="assets/kraken-medical-logo.png" alt="">
      <span class="kraken-admin-nav-title">
        <strong>Kraken Admin</strong>
        <small>Command centre</small>
      </span>
    `;

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "kraken-admin-nav-menu-button";
    menuButton.setAttribute("aria-label", "Open admin navigation");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "☰";

    const mobileLabel = document.createElement("span");
    mobileLabel.className = "kraken-admin-nav-mobile-label";
    mobileLabel.textContent =
      ADMIN_PAGES.find(page => page.href.toLowerCase() === currentFile)?.label || "Admin";

    const links = document.createElement("div");
    links.className = "kraken-admin-nav-links";

    ADMIN_PAGES.forEach(item => links.appendChild(makeLink(item)));

    const separator = document.createElement("span");
    separator.className = "kraken-admin-nav-separator";
    links.appendChild(separator);

    const homeLink = document.createElement("a");
    homeLink.className = "kraken-admin-nav-link home-link";
    homeLink.href = "index.html";
    homeLink.innerHTML = `
      <span aria-hidden="true">↗</span>
      <span>View website</span>
    `;
    links.appendChild(homeLink);

    nav.appendChild(brand);
    nav.appendChild(menuButton);
    nav.appendChild(mobileLabel);
    nav.appendChild(links);

    document.body.prepend(nav);

    menuButton.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "×" : "☰";
    });

    document.addEventListener("click", event => {
      if (nav.classList.contains("open") && !nav.contains(event.target)) {
        nav.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.textContent = "☰";
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.textContent = "☰";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildAdminNav);
  } else {
    buildAdminNav();
  }
})();
