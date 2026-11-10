const LOCKED_CONFIG = {
  // TODO: Phase 1 survey URL is not known.
  phase1SurveyUrl: "",
  surveyLinks: {
    midPilot: "",
    endOfPilot: "",
  },
};

const KEYS = {
  items: "locked-items",
  files: "locked-files",
  checkins: "locked-checkins",
  settings: "locked-settings",
  issues: "locked-issues",
  uids: "locked-ics-uids",
  seeded: "locked-seed-v1",
};

const COURSES = ["PSY 110", "MKT 201", "STA 202"];
const SOURCE_CLASS = { Canvas: "is-canvas", Syllabus: "is-syllabus", Manual: "is-manual" };

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedItems() {
  return [
    { id: "seed-1", uid: "seed-research-response-7", title: "Research response 7", course: "PSY 110", type: "Assignment", due: "2026-11-10T23:00", plannedStart: "", priority: "Medium", minutes: 45, notes: "", steps: [], source: "Canvas", completed: false },
    { id: "seed-2", uid: "seed-midterm-examination", title: "Midterm examination", course: "MKT 201", type: "Exam", due: "2026-11-12T11:00", plannedStart: "", priority: "High", minutes: 90, notes: "", steps: [], source: "Canvas", completed: false },
    { id: "seed-3", uid: "seed-excel-skills-check", title: "Excel skills check", course: "STA 202", type: "Quiz", due: "2026-11-14T17:00", plannedStart: "", priority: "Medium", minutes: 30, notes: "", steps: [], source: "Syllabus", completed: false },
  ];
}

function ensureSeed() {
  if (load(KEYS.seeded, false)) return;
  const existing = load(KEYS.items, null);
  if (!existing || existing.length === 0) save(KEYS.items, seedItems());
  const uids = load(KEYS.uids, []);
  seedItems().forEach((item) => {
    if (item.uid && !uids.includes(item.uid)) uids.push(item.uid);
  });
  save(KEYS.uids, uids);
  save(KEYS.seeded, true);
}

function resetDemo() {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  save(KEYS.items, seedItems());
  save(KEYS.uids, seedItems().map((item) => item.uid));
  save(KEYS.settings, { focusWindow: "Afternoon", notifications: "Gentle" });
  save(KEYS.seeded, true);
  pendingIcs = [];
  lastUploadId = null;
  renderApp();
}

function getItems() {
  return load(KEYS.items, []);
}

function setItems(items) {
  save(KEYS.items, items);
}

function getSettings() {
  return Object.assign({ focusWindow: "Afternoon", notifications: "Gentle" }, load(KEYS.settings, {}));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function parseLocal(s) {
  if (!s) return null;
  const [date, time = "00:00"] = String(s).split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

function toLocalInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  return toLocalInput(d);
}

function fmtTime(s) {
  const d = parseLocal(s);
  if (!d) return "";
  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${ap}`;
}

function fmtDay(s) {
  const d = parseLocal(s);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function openDueSoon(items, days = 7) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  return items.filter((item) => {
    if (item.completed || !item.due) return false;
    const due = parseLocal(item.due);
    return due && due >= start && due <= end;
  });
}

function weekStatus(count) {
  if (count >= 9) return { title: "Heavy week", label: "HEAVY" };
  if (count >= 5) return { title: "Busy week", label: "BUSY" };
  return { title: "Steady week", label: "MANAGEABLE" };
}

function nextOpenItem(items) {
  return items
    .filter((item) => !item.completed && item.due)
    .sort((a, b) => parseLocal(a.due) - parseLocal(b.due))[0] || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uid() {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function inferCourse(text) {
  const bracket = String(text).match(/\[([A-Z]{2,4}\s*\d{3})\]/i);
  if (bracket) return bracket[1].toUpperCase().replace(/([A-Z]+)(\d)/, "$1 $2").replace(/\s+/, " ");
  const open = String(text).match(/\b([A-Z]{2,4})\s*(\d{3})\b/);
  return open ? `${open[1].toUpperCase()} ${open[2]}` : "";
}

const surveyIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4 2.5H2.5v7h7V8M6.5 2.5H9.5V5.5M9.5 2.5 5 7" stroke="currentColor" stroke-linecap="round"/></svg>`;

function phase1Link() {
  // TODO: Phase 1 survey URL is not known; use LOCKED_CONFIG.phase1SurveyUrl when approved.
  const href = LOCKED_CONFIG.phase1SurveyUrl || "#";
  const extra = LOCKED_CONFIG.phase1SurveyUrl ? ` target="_blank" rel="noopener noreferrer"` : "";
  return `<a class="about-link" href="${escapeHtml(href)}"${extra}>Open the original Phase 1 survey ${surveyIcon}</a>`;
}

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
    kicker: "The opportunity",
    title: "One calm layer across scattered tools",
    html: `
      <table class="about-table">
        <thead><tr><th>Tool</th><th>Good at</th><th>Gap</th></tr></thead>
        <tbody>
          <tr><td>Canvas</td><td>Official course data</td><td>Hard to prioritize across courses</td></tr>
          <tr><td>Google / Apple Calendar</td><td>Time visibility</td><td>Manual academic setup</td></tr>
          <tr><td>Notion / Todoist</td><td>Flexible planning</td><td>Imports require effort</td></tr>
          <tr><td>Paper / spreadsheets</td><td>Personal control</td><td>Easy to miss updates</td></tr>
        </tbody>
      </table>
      <p class="about-body">AI can reduce setup by suggesting deadlines and steps, but extraction can be wrong. Locked requires student review before adding syllabus items.</p>
    `,
  },
  {
    kicker: "Phase 1 discovery research",
    title: "Students already use a patchwork",
    html: `
      <p class="about-body">The deck reports percentages consistent with <strong>7 responses</strong>; that inferred count should be verified against Qualtrics before publication. The assignment recruitment target is 30–35 students and is not the response count.</p>
      <div class="about-bars">
        ${[
          ["Canvas", 86],
          ["Calendar", 71],
          ["Notes app", 43],
          ["Memory", 43],
          ["Paper planner", 29],
        ].map(([name, pct]) => `<div class="about-bar"><span>${name}</span><div class="about-bar-track"><i style="width:${pct}%"></i></div><b>${pct}%</b></div>`).join("")}
      </div>
      <p class="about-body">Students described Canvas tracking frustration, uncertainty about what to start, and stress when exams and assignments pile up. ${phase1Link()}</p>
    `,
  },
  {
    kicker: "Primary audience",
    title: "Overwhelmed UM first-year students",
    html: `
      <p class="about-lead">Secondary segments include highly involved students and students who procrastinate.</p>
      <div class="persona-grid">
        <article class="persona-card">
          <h4>Emma, 18</h4>
          <p><strong>Pain:</strong> deadlines live everywhere.</p>
          <p><strong>Goal:</strong> one clear checklist.</p>
          <p><strong>Barrier:</strong> setup must be minimal.</p>
        </article>
        <article class="persona-card">
          <h4>Jordan, 19</h4>
          <p><strong>Pain:</strong> plans break when weeks change.</p>
          <p><strong>Goal:</strong> a flexible daily plan.</p>
          <p><strong>Barrier:</strong> too many notifications.</p>
        </article>
      </div>
    `,
  },
  {
    kicker: "One clear next action",
    title: "Canvas + syllabi + personal tasks → one plan",
    html: `
      <div class="about-flow">
        <div class="flow-box flow-box--green">3 exams<br>2 assignments<br>practice</div>
        <div class="flow-arrow" aria-hidden="true">→</div>
        <div class="flow-box flow-box--navy">
          <span class="flow-kicker">Start here</span>
          <strong>Draft PSY response</strong>
          <small>45 minutes</small>
        </div>
      </div>
      <p class="about-body">Locked preserves the real deadline while turning a heavy week into manageable, editable steps.</p>
    `,
  },
  {
    kicker: "The four Ps",
    title: "Start at UM, learn, then expand",
    html: `
      <div class="ps-grid">
        <article class="ps-card"><span class="ps-label">Product</span><p>Locked planner</p></article>
        <article class="ps-card"><span class="ps-label">Price</span><p>proposal — Free pilot; future $5.99/month or $59.99/year, or university-funded</p></article>
        <article class="ps-card"><span class="ps-label">Place</span><p>Any-device website; UM first</p></article>
        <article class="ps-card"><span class="ps-label">Promotion</span><p>Tabling, student email, live demos, social media</p></article>
      </div>
    `,
  },
  {
    kicker: "Design thinking",
    title: "Empathize → Define → Ideate → Prototype → Test",
    html: `
      <div class="design-chips">
        ${["Connect", "Upload", "Review", "Adjust", "Plan"].map((label, i) => `<span class="design-chip"><i>${i + 1}</i>${label}</span>`).join("")}
      </div>
      <button class="about-cta" type="button" data-open-demo>Open functional demo →</button>
      <p class="about-fine">Optional Locked Feud uses five PSY 110, MKT 201, and STA 202 questions from a clearly labeled sample calendar.</p>
    `,
  },
  {
    kicker: "Phase 2 pilot",
    title: "10–15 participants • 2–3 weeks",
    html: `
      <p class="about-body">Pair consented pre/post responses with study IDs, not names. Measures: full 16-item WLEIS (with Regulation of Emotion separate), PSS-10, optional weekly stress, UES-SF, SUS, satisfaction, recommendation, intent, behavior, and open feedback. Every metric reports its denominator and missing responses.</p>
      <div class="stat-row">
        <div class="stat-tile"><strong>70+</strong><span>SUS target</span></div>
        <div class="stat-tile"><strong>4/5+</strong><span>Satisfaction</span></div>
        <div class="stat-tile"><strong>70%</strong><span>Task completion</span></div>
      </div>
      <p class="about-body">Results remain empty until real data is entered. A future study proposes 30–50 students over 4–6 weeks; the 60% Week 4 retention target applies only if that follow-up occurs.</p>
    `,
  },
];

let currentView = "today";
const _now = new Date();
let calendarCursor = { y: _now.getFullYear(), m: _now.getMonth() };
let calendarMode = "month";
let taskFilter = "All";
let taskQuery = "";
let itemDraftSteps = [];
let editingId = null;
let pendingIcs = [];
let lastUploadId = null;

const homePage = document.getElementById("page-home");
const demoPage = document.getElementById("page-demo");
const canvasModal = document.getElementById("canvas-modal");
const itemModal = document.getElementById("item-modal");
const aboutContent = document.getElementById("about-content");
const aboutButtons = document.querySelectorAll(".about-nav button");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.getElementById("main-nav");
const appMain = document.getElementById("app-main");

function renderAbout(index) {
  const section = ABOUT_SECTIONS[index] || ABOUT_SECTIONS[0];
  aboutContent.innerHTML = `
    <p class="about-kicker">${section.kicker}</p>
    <h3>${section.title}</h3>
    ${section.html}
  `;
}

function closeMenu() {
  if (!navLinks) return;
  navLinks.classList.remove("is-open");
  if (navToggle) navToggle.setAttribute("aria-expanded", "false");
}

function showHome() {
  closeItemModal();
  demoPage.hidden = true;
  homePage.hidden = false;
  if (location.hash.startsWith("#demo")) history.replaceState(null, "", "#home");
}

function showDemo(view) {
  closeCanvas();
  closeMenu();
  ensureSeed();
  homePage.hidden = true;
  demoPage.hidden = false;
  setView(view || currentView || "today", true);
  window.scrollTo(0, 0);
}

function setView(name, pushHash) {
  currentView = name;
  document.querySelectorAll(".app-nav [data-view]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === name);
  });
  if (pushHash !== false) {
    const hash = `#demo/${name}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }
  renderApp();
}

function closeCanvas() {
  canvasModal.hidden = true;
  document.body.style.overflow = itemModal.hidden ? "" : "hidden";
}

function openCanvas() {
  canvasModal.hidden = false;
  document.body.style.overflow = "hidden";
  closeMenu();
}

function todayMood() {
  const all = load(KEYS.checkins, {});
  return (all[todayKey()] || {}).todayQuick || "";
}

function saveTodayMood(value) {
  const all = load(KEYS.checkins, {});
  const key = todayKey();
  all[key] = Object.assign({}, all[key], { todayQuick: value, date: key });
  if (value && !all[key].mood) all[key].mood = value === "Low" || value === "Okay" || value === "Good" ? value : all[key].mood;
  save(KEYS.checkins, all);
  renderApp();
}

function renderApp() {
  if (!appMain || demoPage.hidden) return;
  const views = {
    today: renderToday,
    calendar: renderCalendar,
    tasks: renderTasks,
    files: renderFiles,
    checkin: renderCheckin,
    integrations: renderIntegrations,
    feedback: renderFeedback,
    settings: renderSettings,
  };
  (views[currentView] || renderToday)();
}

function addTaskButton(label) {
  return `<button class="btn btn--forest" type="button" data-open-item>${escapeHtml(label)}</button>`;
}

function renderToday() {
  const items = getItems();
  const upcoming = items
    .filter((item) => !item.completed)
    .sort((a, b) => (parseLocal(a.due) || 0) - (parseLocal(b.due) || 0));
  const dueSoon = openDueSoon(items);
  const status = weekStatus(dueSoon.length);
  const next = nextOpenItem(items);
  const now = new Date();
  const eyebrow = `Today · ${now.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase()}`;
  const mood = todayMood();
  const start = next
    ? `<p class="start-kicker">✦ Start here</p>
       <h2>${escapeHtml(next.title)}</h2>
       <p>${escapeHtml(next.course || "Personal")} · ${escapeHtml(fmtTime(next.due) || "No time")} · ${escapeHtml(String(next.minutes || ""))}${next.minutes ? " min" : ""}</p>
       <button class="btn-black" type="button" data-open-item data-item-id="${next.id}">Open task</button>`
    : `<p class="start-kicker">✦ Start here</p>
       <h2>You're all caught up.</h2>
       <p>Add something when you're ready.</p>
       <button class="btn-black" type="button" data-open-item>Add a task</button>`;
  const coming = upcoming.length
    ? `<div class="upcoming-list">${upcoming.map((item) => `
        <div class="upcoming-row">
          <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.course || "")} · ${escapeHtml(item.type)}</small></div>
          <div>${escapeHtml(fmtDay(item.due))}<br>${escapeHtml(fmtTime(item.due))}</div>
        </div>`).join("")}</div>`
    : `<div class="empty-state">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect x="6" y="8" width="24" height="22" rx="3" stroke="#8b938f"/><path d="M6 14h24M14 5v6M22 5v6" stroke="#8b938f"/></svg>
        <strong>No upcoming work</strong>
        <p>Your next task will appear here.</p>
      </div>`;
  appMain.innerHTML = `
    <header class="app-header">
      <div>
        <p class="app-eyebrow">${eyebrow}</p>
        <h1>Let's make today feel lighter.</h1>
        <p class="app-sub">You don't have to do everything at once. Start with what matters most.</p>
      </div>
      ${addTaskButton("+ Add Task")}
    </header>
    <div class="status-bar">
      <span class="status-dot" aria-hidden="true"></span>
      <div>
        <h2>${status.title}</h2>
        <p>${dueSoon.length} open item${dueSoon.length === 1 ? "" : "s"} due in the next seven days.</p>
      </div>
      <span class="status-label">${status.label}</span>
    </div>
    <div class="today-grid">
      <article class="start-card">${start}</article>
      <article class="check-card">
        <p class="app-eyebrow">Quick check-in · optional</p>
        <h2>How are you arriving today?</h2>
        <p>This helps Locked suggest a realistic pace. It is separate from pilot surveys.</p>
        <div class="mood-row">
          ${["Low", "Okay", "Good"].map((opt) => `<button type="button" class="chip${mood === opt ? " is-on" : ""}" data-mood="${opt}">${opt}</button>`).join("")}
        </div>
        <button type="button" class="skip-link" data-mood-skip>Skip for now</button>
      </article>
    </div>
    <section class="app-panel">
      <div class="coming-head">
        <div>
          <p class="app-eyebrow">Your plan</p>
          <h2>Coming up</h2>
        </div>
        <span class="pill">${upcoming.length} open</span>
      </div>
      ${coming}
    </section>
  `;
}

function renderCalendar() {
  const items = getItems();
  const { y, m } = calendarCursor;
  const label = new Date(y, m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i += 1) {
    cells.push({ day: prevDays - startDow + i + 1, out: true, date: new Date(y, m - 1, prevDays - startDow + i + 1) });
  }
  for (let d = 1; d <= daysInMonth; d += 1) cells.push({ day: d, out: false, date: new Date(y, m, d) });
  while (cells.length % 7 !== 0) {
    const d = cells.length - (startDow + daysInMonth) + 1;
    cells.push({ day: d, out: true, date: new Date(y, m + 1, d) });
  }
  const today = new Date();
  const isToday = (date) => date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  const itemsOn = (date) => items.filter((item) => {
    const due = parseLocal(item.due);
    return due && due.getFullYear() === date.getFullYear() && due.getMonth() === date.getMonth() && due.getDate() === date.getDate();
  });
  const monthGrid = `
    <div class="cal-grid">
      ${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => `<div class="cal-dow">${d}</div>`).join("")}
      ${cells.map((cell) => {
        const evts = itemsOn(cell.date);
        return `<div class="cal-cell${cell.out ? " is-out" : ""}">
          <span class="cal-day${isToday(cell.date) ? " is-today" : ""}">${cell.day}</span>
          ${evts.map((item) => `<div class="cal-chip ${SOURCE_CLASS[item.source] || "is-manual"}"><time>${escapeHtml(fmtTime(item.due))}</time>${escapeHtml(item.title)}</div>`).join("")}
        </div>`;
      }).join("")}
    </div>`;
  const agendaItems = items
    .filter((item) => {
      const due = parseLocal(item.due);
      return due && due.getFullYear() === y && due.getMonth() === m;
    })
    .sort((a, b) => parseLocal(a.due) - parseLocal(b.due));
  const agenda = agendaItems.length
    ? `<div class="agenda-list">${agendaItems.map((item) => `
        <div class="agenda-row">
          <div>${escapeHtml(fmtDay(item.due))}<br>${escapeHtml(fmtTime(item.due))}</div>
          <div><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.course || "")}</div>
          <div class="task-meta"><span class="badge badge-${(item.source || "manual").toLowerCase()}">${escapeHtml((item.source || "Manual").toUpperCase())}</span><span class="type-pill">${escapeHtml(item.type)}</span></div>
        </div>`).join("")}</div>`
    : `<div class="empty-state"><strong>No items this month</strong><p>Add an event to see it here.</p></div>`;
  appMain.innerHTML = `
    <header class="app-header">
      <div>
        <p class="app-eyebrow">Calendar</p>
        <h1>See the whole picture.</h1>
        <p class="app-sub">Deadlines and your own tasks, together.</p>
      </div>
      ${addTaskButton("+ Add Event")}
    </header>
    <section class="app-panel">
      <div class="cal-toolbar">
        <div class="cal-nav">
          <button class="icon-btn" type="button" data-cal-shift="-1" aria-label="Previous month">‹</button>
          <h2>${label}</h2>
          <button class="icon-btn" type="button" data-cal-shift="1" aria-label="Next month">›</button>
        </div>
        <div class="segmented">
          <button type="button" class="${calendarMode === "month" ? "is-on" : ""}" data-cal-mode="month">Month</button>
          <button type="button" class="${calendarMode === "agenda" ? "is-on" : ""}" data-cal-mode="agenda">Agenda</button>
        </div>
      </div>
      ${calendarMode === "month" ? monthGrid : agenda}
      <div class="cal-legend">
        <span><i class="dot-canvas"></i>Canvas</span>
        <span><i class="dot-syllabus"></i>Syllabus</span>
        <span><i class="dot-manual"></i>Manual</span>
      </div>
    </section>
  `;
}

function renderTasks() {
  const q = taskQuery.trim().toLowerCase();
  const items = getItems()
    .filter((item) => {
      if (taskFilter === "Open" && item.completed) return false;
      if (taskFilter === "Completed" && !item.completed) return false;
      if (!q) return true;
      return `${item.title} ${item.course}`.toLowerCase().includes(q);
    })
    .sort((a, b) => (parseLocal(a.due) || 0) - (parseLocal(b.due) || 0));
  const rows = items.length
    ? items.map((item) => `
      <div class="task-row${item.completed ? " is-done" : ""}">
        <button class="task-check" type="button" data-toggle-item="${item.id}" aria-label="Toggle complete"></button>
        <div>
          <span class="task-title">${escapeHtml(item.title)}</span>
          <span class="task-course">${escapeHtml(item.course || "")}</span>
        </div>
        <div class="task-meta">
          <span class="badge badge-${(item.source || "manual").toLowerCase()}">${escapeHtml((item.source || "Manual").toUpperCase())}</span>
          <span class="type-pill">${escapeHtml(item.type)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="task-when"><b>${escapeHtml(fmtDay(item.due))}</b><span>${escapeHtml(fmtTime(item.due))}</span></div>
          <button class="edit-btn" type="button" data-edit-item="${item.id}" aria-label="Edit">✎</button>
        </div>
      </div>`).join("")
    : `<div class="empty-state"><strong>No tasks match</strong><p>Try another filter or add a task.</p></div>`;
  appMain.innerHTML = `
    <header class="app-header">
      <div>
        <p class="app-eyebrow">Tasks</p>
        <h1>Your work, in one place.</h1>
        <p class="app-sub">Create, reschedule, complete, or remove any Locked item.</p>
      </div>
      ${addTaskButton("+ Add Task")}
    </header>
    <section class="app-panel">
      <div class="toolbar">
        <div class="search">
          <span class="search-icon">⌕</span>
          <input type="search" id="task-search" placeholder="Search tasks or courses" value="${escapeHtml(taskQuery)}">
        </div>
        <div class="segmented">
          ${["All", "Open", "Completed"].map((f) => `<button type="button" class="${taskFilter === f ? "is-on" : ""}" data-task-filter="${f}">${f}</button>`).join("")}
        </div>
      </div>
      ${rows}
    </section>
  `;
}

function renderFiles() {
  const files = load(KEYS.files, []);
  const review = lastUploadId ? files.find((f) => f.id === lastUploadId) : null;
  const list = files.length
    ? `<div class="file-list">${files.map((file) => `
        <div class="file-row">
          <div><strong>${escapeHtml(file.name)}</strong><br><small>${escapeHtml(file.course)} · ${escapeHtml(file.sizeLabel)} · ${escapeHtml(file.date)}</small></div>
          <button class="text-btn-dark" type="button" data-remove-file="${file.id}">Remove</button>
        </div>`).join("")}</div>`
    : `<div class="empty-state"><strong>No files uploaded</strong><p>Your syllabus uploads will appear here.</p></div>`;
  appMain.innerHTML = `
    <header class="app-header">
      <div>
        <p class="app-eyebrow">Files &amp; syllabi</p>
        <h1>Turn your syllabus into a plan.</h1>
        <p class="app-sub">Locked suggests dates. You review and approve every item.</p>
      </div>
    </header>
    <section class="app-panel" style="margin-bottom:16px">
      <label class="file-label" for="file-course">Course for this file</label>
      <select id="file-course" class="file-select">${COURSES.map((c) => `<option>${c}</option>`).join("")}</select>
      <div class="dropzone" id="dropzone">
        <div class="drop-icon">↑</div>
        <h2>Drop a syllabus PDF here</h2>
        <p>or choose a file from your device · PDF up to 20 MB</p>
        <button class="btn btn--forest" type="button" id="choose-pdf">Choose PDF</button>
      </div>
      ${review ? `<div class="review-box">
        <h3>Review suggested items</h3>
        <p>Locked does not auto-extract deadlines from this file. Review the syllabus and add items yourself so nothing is saved without your approval.</p>
        <button class="btn btn--forest" type="button" data-open-item data-preset-course="${escapeHtml(review.course)}" data-preset-source="Syllabus" style="margin-top:12px">Add an item from this syllabus</button>
      </div>` : ""}
    </section>
    <section class="app-panel">
      <div class="coming-head">
        <div>
          <p class="app-eyebrow">Private files</p>
          <h2>Your uploads</h2>
        </div>
        <span class="pill">${files.length} file${files.length === 1 ? "" : "s"}</span>
      </div>
      ${list}
    </section>
  `;
}

function renderCheckin() {
  const today = load(KEYS.checkins, {})[todayKey()] || {};
  const rows = [
    { key: "mood", title: "Mood", sub: "How are you feeling?", options: ["Low", "Okay", "Good"] },
    { key: "energy", title: "Energy", sub: "What pace feels realistic?", options: ["Low", "Okay", "Good"] },
    { key: "stress", title: "Stress", sub: "What is taking up the most space?", options: ["Exams", "Assignments", "Personal", "Other"] },
  ];
  appMain.innerHTML = `
    <header class="app-header">
      <div>
        <p class="app-eyebrow">Check-in</p>
        <h1>A quick pause before the plan.</h1>
        <p class="app-sub">Everyday check-ins are optional and always separate from formal pilot surveys.</p>
      </div>
    </header>
    <section class="app-panel">
      <div class="row-list">
        ${rows.map((row) => `
          <div class="row-item" data-row="${row.key}">
            <button type="button" class="row-toggle">
              <div>
                <h3>${row.title}</h3>
                <p>${row.sub}</p>
              </div>
              <span class="row-value">${escapeHtml(today[row.key] || "")}</span>
              <span class="chev">›</span>
            </button>
            <div class="row-panel">
              <div class="mood-row">
                ${row.options.map((opt) => `<button type="button" class="chip${today[row.key] === opt ? " is-on" : ""}" data-checkin-key="${row.key}" data-checkin-value="${opt}">${opt}</button>`).join("")}
              </div>
            </div>
          </div>`).join("")}
      </div>
    </section>
  `;
}

function renderIntegrations() {
  const review = pendingIcs.length
    ? `<div class="ics-review">
        <h3 class="about-kicker" style="margin-bottom:10px">Review imported events</h3>
        ${pendingIcs.map((ev, i) => `
          <label><input type="checkbox" data-ics-index="${i}" ${ev.selected ? "checked" : ""}> <span><strong>${escapeHtml(ev.title)}</strong> · ${escapeHtml(ev.course || "No course")} · ${escapeHtml(fmtDay(ev.due))} ${escapeHtml(fmtTime(ev.due))}${ev.duplicate ? " (already imported)" : ""}</span></label>`).join("")}
        <button class="btn btn--forest" type="button" id="ics-add" style="margin-top:12px">Add selected to Locked</button>
      </div>`
    : "";
  appMain.innerHTML = `
    <header class="app-header">
      <div>
        <p class="app-eyebrow">Integrations</p>
        <h1>Bring Canvas into Locked.</h1>
        <p class="app-sub">Use a calendar snapshot now; secure OAuth becomes available after campus approval.</p>
      </div>
    </header>
    <article class="int-card">
      <div class="int-top">
        <div class="int-tile">🔒</div>
        <div>
          <span class="badge badge-pending">SETUP PENDING</span>
          <h2>Continue with Canvas</h2>
          <p>Canvas OAuth needs the university-approved developer key and secure server callback. Locked will never ask for your CaneID password or API token.</p>
          <button class="btn btn--forest" type="button" disabled>Continue with Canvas</button>
          <a class="ext-link" href="https://umiami.instructure.com" target="_blank" rel="noopener noreferrer">Open University of Miami Canvas ↗</a>
        </div>
      </div>
    </article>
    <article class="int-card">
      <div class="int-top">
        <div class="int-tile">▦</div>
        <div style="flex:1">
          <span class="badge badge-now">AVAILABLE NOW</span>
          <h2>Import Canvas Calendar (.ics)</h2>
          <p>Export your Canvas calendar and upload it here. This is a snapshot, not a live sync.</p>
          <button class="btn btn--outline" type="button" id="choose-ics">⇪ Choose .ics file</button>
          ${review}
        </div>
      </div>
    </article>
    <article class="int-card">
      <p class="app-eyebrow">Owner setup checklist</p>
      <h2>Secure Canvas OAuth requirements</h2>
      <ul class="check-list">
        <li>Verified instance: <code>https://umiami.instructure.com</code></li>
        <li>Registered HTTPS callback: <code>https://YOUR_DEPLOYED_DOMAIN/api/canvas/callback</code></li>
        <li>Read-only scopes: courses, assignments, calendar events</li>
        <li>Server variables: <span class="code-chip">CANVAS_BASE_URL</span> <span class="code-chip">CANVAS_CLIENT_ID</span> <span class="code-chip">CANVAS_CLIENT_SECRET</span> <span class="code-chip">CANVAS_REDIRECT_URI</span> <span class="code-chip">SESSION_SECRET</span></li>
      </ul>
    </article>
  `;
}

function renderFeedback() {
  const mid = LOCKED_CONFIG.surveyLinks.midPilot;
  const end = LOCKED_CONFIG.surveyLinks.endOfPilot;
  const issues = load(KEYS.issues, []);
  const last = issues[issues.length - 1];
  const pendingNote = `<p class="muted-note">Link coming once the protocol is approved.</p>`;
  appMain.innerHTML = `
    <header class="app-header">
      <div>
        <p class="app-eyebrow">Pilot feedback</p>
        <h1>Help shape a calmer pilot.</h1>
        <p class="app-sub">Phase 2 forms remain configurable until the research protocol and links are approved.</p>
      </div>
    </header>
    <section class="app-panel">
      <div class="row-list">
        <div class="row-item">
          <button type="button" class="row-toggle"><div><h3>Mid-pilot check-in</h3></div><span class="chev">›</span></button>
          <div class="row-panel">${mid ? `<a class="about-link" href="${escapeHtml(mid)}" target="_blank" rel="noopener noreferrer">Open mid-pilot check-in ↗</a>` : pendingNote}</div>
        </div>
        <div class="row-item">
          <button type="button" class="row-toggle"><div><h3>End-of-pilot survey</h3></div><span class="chev">›</span></button>
          <div class="row-panel">${end ? `<a class="about-link" href="${escapeHtml(end)}" target="_blank" rel="noopener noreferrer">Open end-of-pilot survey ↗</a>` : pendingNote}</div>
        </div>
        <div class="row-item">
          <button type="button" class="row-toggle"><div><h3>Report an issue</h3></div><span class="chev">›</span></button>
          <div class="row-panel">
            <form class="issue-form" id="issue-form">
              <label>What happened?<textarea name="detail" rows="4" required placeholder="Describe the issue"></textarea></label>
              <label>Your name or study ID (optional)<input name="who" type="text"></label>
              <button class="btn btn--forest" type="submit">Save locally</button>
            </form>
            ${last ? `<p class="confirm-note">Saved on this device at ${escapeHtml(last.savedAt)}. Nothing was sent.</p>` : ""}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderSettings() {
  const settings = getSettings();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  appMain.innerHTML = `
    <header class="app-header">
      <div>
        <p class="app-eyebrow">Settings</p>
        <h1>Make Locked work your way.</h1>
        <p class="app-sub">Personalize your planning without changing imported deadlines.</p>
      </div>
    </header>
    <section class="app-panel">
      <div class="row-list">
        <div class="row-item">
          <button type="button" class="row-toggle"><div><h3>Timezone</h3><p>Local device time</p></div><span class="row-value">${escapeHtml(zone)}</span><span class="chev">›</span></button>
          <div class="row-panel"><p>Detected zone: <strong>${escapeHtml(zone)}</strong>. Locked uses your device clock for dates and times.</p></div>
        </div>
        <div class="row-item">
          <button type="button" class="row-toggle"><div><h3>Focus window</h3></div><span class="row-value">${escapeHtml(settings.focusWindow)}</span><span class="chev">›</span></button>
          <div class="row-panel"><div class="mood-row">${["Morning", "Afternoon", "Evening"].map((opt) => `<button type="button" class="chip${settings.focusWindow === opt ? " is-on" : ""}" data-setting="focusWindow" data-value="${opt}">${opt}</button>`).join("")}</div></div>
        </div>
        <div class="row-item">
          <button type="button" class="row-toggle"><div><h3>Notifications</h3></div><span class="row-value">${escapeHtml(settings.notifications)}</span><span class="chev">›</span></button>
          <div class="row-panel"><div class="mood-row">${["Off", "Gentle", "Standard"].map((opt) => `<button type="button" class="chip${settings.notifications === opt ? " is-on" : ""}" data-setting="notifications" data-value="${opt}">${opt}</button>`).join("")}</div></div>
        </div>
      </div>
      <button class="reset-btn" type="button" id="reset-demo">Reset demo data</button>
    </section>
  `;
}

function openItemModal(item, presets) {
  editingId = item ? item.id : null;
  itemDraftSteps = item && Array.isArray(item.steps) ? item.steps.slice() : [];
  document.getElementById("item-eyebrow").textContent = item ? "Edit item" : "New item";
  document.getElementById("item-heading").textContent = item ? "Edit task or event" : "Add a task or event";
  document.getElementById("item-title").value = item ? item.title : "";
  document.getElementById("item-course").value = item ? item.course || "" : (presets && presets.course) || "";
  document.getElementById("item-type").value = item ? item.type : (presets && presets.type) || "Task";
  document.getElementById("item-due").value = item && item.due ? item.due : defaultDue();
  document.getElementById("item-start").value = item && item.plannedStart ? item.plannedStart : "";
  document.getElementById("item-priority").value = item ? item.priority || "Medium" : "Medium";
  document.getElementById("item-minutes").value = item && item.minutes != null ? item.minutes : 30;
  document.getElementById("item-notes").value = item ? item.notes || "" : "";
  document.getElementById("item-delete").hidden = !item;
  document.getElementById("item-form").dataset.source = item ? item.source || "Manual" : (presets && presets.source) || "Manual";
  renderSteps();
  syncSaveEnabled();
  itemModal.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("item-title").focus();
}

function renderSteps() {
  const list = document.getElementById("item-steps");
  list.innerHTML = itemDraftSteps.map((step, i) => `<li>${escapeHtml(step)} <button type="button" data-remove-step="${i}">Remove</button></li>`).join("");
}

function closeItemModal() {
  itemModal.hidden = true;
  document.body.style.overflow = canvasModal.hidden ? "" : "hidden";
  editingId = null;
}

function syncSaveEnabled() {
  const title = document.getElementById("item-title").value.trim();
  document.getElementById("item-save").disabled = !title;
}

function saveItem(event) {
  event.preventDefault();
  const title = document.getElementById("item-title").value.trim();
  if (!title) return;
  const payload = {
    id: editingId || uid(),
    uid: editingId ? (getItems().find((i) => i.id === editingId) || {}).uid : undefined,
    title,
    course: document.getElementById("item-course").value.trim(),
    type: document.getElementById("item-type").value,
    due: document.getElementById("item-due").value,
    plannedStart: document.getElementById("item-start").value,
    priority: document.getElementById("item-priority").value,
    minutes: Number(document.getElementById("item-minutes").value || 0),
    notes: document.getElementById("item-notes").value.trim(),
    steps: itemDraftSteps.slice(),
    source: document.getElementById("item-form").dataset.source || "Manual",
    completed: false,
  };
  const items = getItems();
  if (editingId) {
    const prev = items.find((i) => i.id === editingId);
    payload.completed = prev ? prev.completed : false;
    payload.uid = prev && prev.uid;
    setItems(items.map((i) => (i.id === editingId ? payload : i)));
  } else {
    items.push(payload);
    setItems(items);
  }
  closeItemModal();
  renderApp();
}

function deleteEditing() {
  if (!editingId) return;
  setItems(getItems().filter((i) => i.id !== editingId));
  closeItemModal();
  renderApp();
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function handlePdf(file) {
  if (!file) return;
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    window.alert("Please choose a PDF file.");
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    window.alert("That file is larger than 20 MB.");
    return;
  }
  const course = (document.getElementById("file-course") || {}).value || COURSES[0];
  const entry = {
    id: uid(),
    name: file.name,
    size: file.size,
    sizeLabel: formatSize(file.size),
    course,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
  const files = load(KEYS.files, []);
  files.push(entry);
  save(KEYS.files, files);
  lastUploadId = entry.id;
  renderApp();
}

function parseIcsDate(params, value) {
  if (!value) return { local: "", allDay: false };
  const raw = value.trim();
  const allDay = /VALUE=DATE/i.test(params || "") || /^\d{8}$/.test(raw);
  if (allDay) {
    const y = raw.slice(0, 4);
    const mo = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return { local: `${y}-${mo}-${d}T00:00`, allDay: true };
  }
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return { local: raw, allDay: false };
  const tzid = (params || "").match(/TZID=([^;]+)/i);
  if (m[7] === "Z") {
    const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
    return { local: toLocalInput(dt), allDay: false };
  }
  if (tzid) {
    try {
      const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || "00"}`;
      const asUtc = new Date(iso + "Z");
      const inTz = new Date(asUtc.toLocaleString("en-US", { timeZone: tzid[1].trim() }));
      const offset = asUtc.getTime() - inTz.getTime();
      return { local: toLocalInput(new Date(asUtc.getTime() + offset)), allDay: false };
    } catch {
      return { local: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`, allDay: false };
    }
  }
  return { local: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`, allDay: false };
}

function parseICS(text) {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").replace(/\r\n/g, "\n");
  const chunks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
  const known = load(KEYS.uids, []);
  return chunks.map((chunk) => {
    const body = chunk.split(/END:VEVENT/i)[0];
    const get = (name) => {
      const re = new RegExp(`^${name}(;[^:\\n]*)?:(.*)$`, "im");
      const match = body.match(re);
      return match ? { params: match[1] || "", value: (match[2] || "").replace(/\\n/g, "\n").replace(/\\,/g, ",") } : { params: "", value: "" };
    };
    const summary = get("SUMMARY").value.trim();
    const start = parseIcsDate(get("DTSTART").params, get("DTSTART").value);
    const evUid = get("UID").value.trim();
    return {
      uid: evUid || `ics-${summary}-${start.local}`,
      title: summary || "Untitled event",
      course: inferCourse(`${summary} ${get("DESCRIPTION").value}`),
      type: "Event",
      due: start.local,
      notes: get("DESCRIPTION").value.trim(),
      url: get("URL").value.trim(),
      source: "Canvas",
      selected: evUid ? !known.includes(evUid) : true,
      duplicate: evUid ? known.includes(evUid) : false,
    };
  });
}

function handleIcs(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      pendingIcs = parseICS(String(reader.result || ""));
      if (!pendingIcs.length) window.alert("No events were found in that file.");
      renderApp();
    } catch (err) {
      console.error(err);
      window.alert("That calendar file could not be parsed.");
    }
  };
  reader.readAsText(file);
}

function addSelectedIcs() {
  const known = load(KEYS.uids, []);
  const items = getItems();
  pendingIcs.forEach((ev) => {
    if (!ev.selected || ev.duplicate || (ev.uid && known.includes(ev.uid))) return;
    items.push({
      id: uid(),
      uid: ev.uid,
      title: ev.title,
      course: ev.course,
      type: "Event",
      due: ev.due,
      plannedStart: "",
      priority: "Medium",
      minutes: 30,
      notes: ev.notes,
      steps: [],
      source: "Canvas",
      completed: false,
    });
    if (ev.uid) known.push(ev.uid);
  });
  save(KEYS.uids, known);
  setItems(items);
  pendingIcs = [];
  renderApp();
}

function routeFromHash() {
  const hash = location.hash || "";
  if (hash.startsWith("#demo")) {
    const view = hash.split("/")[1] || "today";
    showDemo(view);
    return;
  }
  showHome();
}

ensureSeed();
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

document.addEventListener("click", (event) => {
  const openDemo = event.target.closest("[data-open-demo]");
  if (openDemo) {
    event.preventDefault();
    showDemo("today");
    return;
  }
  const closeDemo = event.target.closest("[data-close-demo]");
  if (closeDemo) {
    event.preventDefault();
    showHome();
    window.scrollTo(0, 0);
    return;
  }
  const homeNav = event.target.closest("[data-nav='home']");
  if (homeNav && !demoPage.hidden) {
    event.preventDefault();
    showHome();
    window.scrollTo(0, 0);
    return;
  }
  if (event.target.closest("[data-open-canvas]")) {
    openCanvas();
    return;
  }
  if (event.target.closest("[data-close-canvas]")) {
    closeCanvas();
    return;
  }
  const viewBtn = event.target.closest(".app-nav [data-view], .app-brand[data-view]");
  if (viewBtn) {
    event.preventDefault();
    setView(viewBtn.dataset.view);
    return;
  }
  if (event.target.closest("[data-open-item]")) {
    const btn = event.target.closest("[data-open-item]");
    const existing = btn.dataset.itemId ? getItems().find((i) => i.id === btn.dataset.itemId) : null;
    openItemModal(existing || null, { course: btn.dataset.presetCourse, source: btn.dataset.presetSource, type: btn.dataset.presetType });
    return;
  }
  if (event.target.closest("[data-close-item]")) {
    closeItemModal();
    return;
  }
  if (event.target.closest("[data-mood]")) {
    saveTodayMood(event.target.closest("[data-mood]").dataset.mood);
    return;
  }
  if (event.target.closest("[data-mood-skip]")) {
    saveTodayMood("");
    return;
  }
  const shift = event.target.closest("[data-cal-shift]");
  if (shift) {
    const next = new Date(calendarCursor.y, calendarCursor.m + Number(shift.dataset.calShift), 1);
    calendarCursor = { y: next.getFullYear(), m: next.getMonth() };
    renderApp();
    return;
  }
  if (event.target.closest("[data-cal-mode]")) {
    calendarMode = event.target.closest("[data-cal-mode]").dataset.calMode;
    renderApp();
    return;
  }
  if (event.target.closest("[data-task-filter]")) {
    taskFilter = event.target.closest("[data-task-filter]").dataset.taskFilter;
    renderApp();
    return;
  }
  const toggle = event.target.closest("[data-toggle-item]");
  if (toggle) {
    const id = toggle.dataset.toggleItem;
    setItems(getItems().map((item) => (item.id === id ? Object.assign({}, item, { completed: !item.completed }) : item)));
    renderApp();
    return;
  }
  const edit = event.target.closest("[data-edit-item]");
  if (edit) {
    const item = getItems().find((i) => i.id === edit.dataset.editItem);
    if (item) openItemModal(item);
    return;
  }
  if (event.target.closest("#item-step-add")) {
    const input = document.getElementById("item-step");
    const text = input.value.trim();
    if (text) {
      itemDraftSteps.push(text);
      input.value = "";
      renderSteps();
    }
    return;
  }
  const rmStep = event.target.closest("[data-remove-step]");
  if (rmStep) {
    itemDraftSteps.splice(Number(rmStep.dataset.removeStep), 1);
    renderSteps();
    return;
  }
  if (event.target.closest("#item-delete")) {
    deleteEditing();
    return;
  }
  if (event.target.closest("#choose-pdf")) {
    document.getElementById("pdf-file").click();
    return;
  }
  if (event.target.closest("#choose-ics")) {
    document.getElementById("ics-file").click();
    return;
  }
  if (event.target.closest("#ics-add")) {
    addSelectedIcs();
    return;
  }
  const rmFile = event.target.closest("[data-remove-file]");
  if (rmFile) {
    const files = load(KEYS.files, []).filter((f) => f.id !== rmFile.dataset.removeFile);
    save(KEYS.files, files);
    if (lastUploadId === rmFile.dataset.removeFile) lastUploadId = null;
    renderApp();
    return;
  }
  const rowToggle = event.target.closest(".row-toggle");
  if (rowToggle) {
    rowToggle.parentElement.classList.toggle("is-open");
    return;
  }
  const checkin = event.target.closest("[data-checkin-key]");
  if (checkin) {
    const all = load(KEYS.checkins, {});
    const key = todayKey();
    all[key] = Object.assign({}, all[key], { date: key, [checkin.dataset.checkinKey]: checkin.dataset.checkinValue });
    if (checkin.dataset.checkinKey === "mood") all[key].todayQuick = checkin.dataset.checkinValue;
    save(KEYS.checkins, all);
    renderApp();
    const openKey = checkin.dataset.checkinKey;
    const row = appMain.querySelector(`[data-row="${openKey}"]`);
    if (row) row.classList.add("is-open");
    return;
  }
  const setting = event.target.closest("[data-setting]");
  if (setting) {
    const next = Object.assign({}, getSettings(), { [setting.dataset.setting]: setting.dataset.value });
    save(KEYS.settings, next);
    renderApp();
    return;
  }
  if (event.target.closest("#reset-demo")) {
    if (window.confirm("Reset all demo tasks, files, check-ins, and settings on this device?")) resetDemo();
  }
});

document.getElementById("item-form").addEventListener("submit", saveItem);
document.getElementById("item-title").addEventListener("input", syncSaveEnabled);

document.addEventListener("input", (event) => {
  if (event.target.id === "task-search") {
    taskQuery = event.target.value;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target && event.target.id === "task-search") {
    event.preventDefault();
    renderApp();
  }
  if (event.key === "Escape") {
    closeItemModal();
    closeCanvas();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "task-search") {
    taskQuery = event.target.value;
    renderApp();
  }
  if (event.target.matches("[data-ics-index]")) {
    const i = Number(event.target.dataset.icsIndex);
    if (pendingIcs[i]) pendingIcs[i].selected = event.target.checked;
  }
  if (event.target.id === "pdf-file") {
    handlePdf(event.target.files && event.target.files[0]);
    event.target.value = "";
  }
  if (event.target.id === "ics-file") {
    handleIcs(event.target.files && event.target.files[0]);
    event.target.value = "";
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "issue-form") return;
  event.preventDefault();
  const form = event.target;
  const issues = load(KEYS.issues, []);
  issues.push({
    detail: form.detail.value.trim(),
    who: form.who.value.trim(),
    savedAt: new Date().toLocaleString(),
  });
  save(KEYS.issues, issues);
  renderApp();
  const last = appMain.querySelector(".row-item:last-child");
  if (last) last.classList.add("is-open");
});

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}
navLinks?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

document.addEventListener("dragover", (event) => {
  const zone = event.target.closest("#dropzone");
  if (!zone) return;
  event.preventDefault();
  zone.classList.add("is-over");
});
document.addEventListener("dragleave", (event) => {
  const zone = event.target.closest("#dropzone");
  if (zone) zone.classList.remove("is-over");
});
document.addEventListener("drop", (event) => {
  const zone = event.target.closest("#dropzone");
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove("is-over");
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  handlePdf(file);
});

window.addEventListener("hashchange", routeFromHash);
routeFromHash();
