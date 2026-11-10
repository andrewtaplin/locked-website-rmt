const ABOUT_SECTIONS = [
  {
    kicker: "Academic stress management",
    title: "Planning that accounts for how students feel",
    html: `
      <p class="about-body">Scattered deadlines, competing commitments, and procrastination can turn a busy week into academic overwhelm. Locked supports emotion regulation: <strong>perceive</strong> with quick check-ins, <strong>use</strong> energy to place demanding work, <strong>understand</strong> workload pileups, and <strong>manage</strong> by breaking work into steps.</p>
      <p class="about-body">Prior research links emotional intelligence and academic performance (Mayer et al., 2016; MacCann et al., 2020), social-emotional learning and academic gains (Durlak et al., 2011), academic emotions and self-regulation (Pekrun et al., 2002), and procrastination with short-term mood regulation (Sirois &amp; Pychyl, 2013). These are prior findings—not Locked pilot results.</p>
    `,
  },
  {
    kicker: "Situation analysis",
    title: "This section wasn’t in the Figma capture",
    html: `<p class="about-empty">The landing page in the Figma file only includes copy for Problem Definition. The other project tabs are interactive so you can switch sections, but their body content was not present on the captured canvas.</p>`,
  },
  {
    kicker: "Consumer research",
    title: "This section wasn’t in the Figma capture",
    html: `<p class="about-empty">The landing page in the Figma file only includes copy for Problem Definition. The other project tabs are interactive so you can switch sections, but their body content was not present on the captured canvas.</p>`,
  },
  {
    kicker: "Segmentation & target audience",
    title: "This section wasn’t in the Figma capture",
    html: `<p class="about-empty">The landing page in the Figma file only includes copy for Problem Definition. The other project tabs are interactive so you can switch sections, but their body content was not present on the captured canvas.</p>`,
  },
  {
    kicker: "Value proposition",
    title: "This section wasn’t in the Figma capture",
    html: `<p class="about-empty">The landing page in the Figma file only includes copy for Problem Definition. The other project tabs are interactive so you can switch sections, but their body content was not present on the captured canvas.</p>`,
  },
  {
    kicker: "Marketing strategy",
    title: "This section wasn’t in the Figma capture",
    html: `<p class="about-empty">The landing page in the Figma file only includes copy for Problem Definition. The other project tabs are interactive so you can switch sections, but their body content was not present on the captured canvas.</p>`,
  },
  {
    kicker: "Prototype design",
    title: "This section wasn’t in the Figma capture",
    html: `<p class="about-empty">The landing page in the Figma file only includes copy for Problem Definition. The other project tabs are interactive so you can switch sections, but their body content was not present on the captured canvas.</p>`,
  },
  {
    kicker: "Measurement plan",
    title: "This section wasn’t in the Figma capture",
    html: `<p class="about-empty">The landing page in the Figma file only includes copy for Problem Definition. The other project tabs are interactive so you can switch sections, but their body content was not present on the captured canvas.</p>`,
  },
];

const homePage = document.getElementById("page-home");
const demoPage = document.getElementById("page-demo");
const canvasModal = document.getElementById("canvas-modal");
const aboutContent = document.getElementById("about-content");
const aboutButtons = document.querySelectorAll(".about-nav button");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.getElementById("main-nav");

function renderAbout(index) {
  const section = ABOUT_SECTIONS[index] || ABOUT_SECTIONS[0];
  aboutContent.innerHTML = `
    <p class="about-kicker">${section.kicker}</p>
    <h3>${section.title}</h3>
    ${section.html}
  `;
}

function showHome() {
  demoPage.hidden = true;
  homePage.hidden = false;
  if (location.hash === "#demo") {
    history.replaceState(null, "", "#home");
  }
}

function showDemo() {
  closeCanvas();
  homePage.hidden = true;
  demoPage.hidden = false;
  window.scrollTo(0, 0);
  closeMenu();
}

function openCanvas() {
  canvasModal.hidden = false;
  document.body.style.overflow = "hidden";
  closeMenu();
}

function closeCanvas() {
  canvasModal.hidden = true;
  document.body.style.overflow = "";
}

function closeMenu() {
  if (!navLinks) return;
  navLinks.classList.remove("is-open");
  if (navToggle) navToggle.setAttribute("aria-expanded", "false");
}

renderAbout(0);

aboutButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.tab);
    aboutButtons.forEach((other) => {
      other.classList.toggle("is-active", other === button);
      other.setAttribute("aria-pressed", other === button ? "true" : "false");
    });
    renderAbout(index);
  });
});

document.querySelectorAll("[data-open-demo]").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    showDemo();
  });
});

document.querySelectorAll("[data-close-demo], [data-nav='home']").forEach((el) => {
  el.addEventListener("click", (event) => {
    if (el.matches("[data-close-demo]") || !demoPage.hidden) {
      event.preventDefault();
      showHome();
      if (el.getAttribute("href") === "#home" || el.matches("[data-close-demo]")) {
        window.scrollTo(0, 0);
      }
    }
  });
});

document.querySelectorAll("[data-open-canvas]").forEach((el) => {
  el.addEventListener("click", openCanvas);
});

document.querySelectorAll("[data-close-canvas]").forEach((el) => {
  el.addEventListener("click", closeCanvas);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCanvas();
});

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

if (location.hash === "#demo") {
  showDemo();
}
