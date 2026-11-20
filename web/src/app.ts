const icons: Record<string, string> = {
  wave: "M2 15c4 0 3-9 9-9 4 0 5 4 3 6 4-2 6 0 8 3M2 19c4-4 7 4 11 0s6 3 9 0",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  calendar: "M4 5h16v16H4zM8 3v4M16 3v4M4 10h16",
  book: "M4 3h16v18H4zM8 7h8M8 11h8M8 15h4",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6",
  sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
  plus: "M12 5v14M5 12h14",
  left: "m14 6-6 6 6 6",
  right: "m10 6 6 6-6 6",
  euro: "M18 5a7 7 0 1 0 0 14M3 10h11M3 14h10",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  check: "m5 12 4 4L19 6",
};
const ic = (n: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[n] || icons.wave}"/></svg>`;
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

type Student = {
  id: string;
  name: string;
  email: string;
  level: "beginner" | "intermediate";
  archived?: number;
};
type Teacher = {
  id: string;
  name: string;
  role: string;
  color: string;
  archived?: number;
};
type Lesson = {
  id: string;
  teacher: string;
  date: string;
  time: string;
  duration: number;
  beach: string;
  level: "beginner" | "intermediate" | "private";
  capacity: number;
  price: number;
  priceCents: number;
};
type Booking = {
  id: string;
  student: string;
  lesson: string;
  paid: boolean;
  priceCents: number;
};
type User = { id: string; schoolId: string; name: string; email: string };
type State = {
  school: string;
  teachers: Teacher[];
  students: Student[];
  lessons: Lesson[];
  bookings: Booking[];
};
let db: State = {
  school: "SurfOS",
  teachers: [],
  students: [],
  lessons: [],
  bookings: [],
};
let user: User | null = null;
let lang = localStorage.getItem("surfos-lang") || "pt",
  page = "agenda",
  date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(
    new Date(),
  ),
  view = "calendar",
  query = "",
  statusFilter = "all";
const t = (pt: string, en: string) => (lang === "pt" ? pt : en);
const levels: Record<string, [string, string]> = {
  beginner: ["Iniciação", "Beginner"],
  intermediate: ["Intermédio", "Intermediate"],
  private: ["Aula privada", "Private lesson"],
};
const level = (l: string) => levels[l][lang === "pt" ? 0 : 1];
const teacher = (id: string) => db.teachers.find((x) => x.id === id)!;
const student = (id: string) => db.students.find((x) => x.id === id)!;
const lesson = (id: string) => db.lessons.find((x) => x.id === id)!;
const bookings = (id: string) => db.bookings.filter((x) => x.lesson === id);
const today = () =>
  db.lessons
    .filter((x) => x.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));
const initials = (name: string) =>
  name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
const av = (name: string, color?: string) =>
  `<span class="avatar" style="background:${color || "#e9e6da"}">${esc(initials(name))}</span>`;
const cash = (n: number) =>
  new Intl.NumberFormat(lang === "pt" ? "pt-PT" : "en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

const fmt = (d: string) =>
  new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric",
    month: "long",
  }).format(new Date(d + "T12:00:00"));
const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
const end = (l: Lesson) => {
  const n = minutes(l.time) + Number(l.duration);
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
};
const navs = [
  ["agenda", "calendar", "Agenda", "Schedule"],
  ["bookings", "book", "Reservas", "Bookings"],
  ["students", "users", "Alunos", "Students"],
  ["team", "users", "Equipa", "Team"],
  ["conditions", "wave", "Condições de surf", "Surf conditions"],
];
function toast(s: string) {
  const el = document.querySelector<HTMLElement>("#toast")!;
  el.textContent = s;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}
function stats() {
  const ls = today(),
    bs = db.bookings.filter((b) => ls.some((l) => l.id === b.lesson)),
    paid = bs.filter((b) => b.paid).reduce((n, b) => n + b.priceCents / 100, 0),
    capacity = ls.reduce((n, l) => n + l.capacity, 0);
  return `<div class="stats">${[
    [
      t("Aulas agendadas", "Scheduled lessons"),
      ls.length,
      t("O dia está a ganhar forma", "Your day is taking shape"),
      "calendar",
    ],
    [
      t("Alunos inscritos", "Booked students"),
      new Set(bs.map((b) => b.student)).size,
      t("Prontos para entrar na água", "Ready to get in the water"),
      "users",
    ],
    [
      t("Ocupação das aulas", "Lesson occupancy"),
      `${capacity ? Math.round((bs.length / capacity) * 100) : 0}%`,
      `${bs.length} / ${capacity} ${t("lugares reservados", "spots booked")}`,
      "grid",
    ],
    [
      t("Receita recebida", "Payments received"),
      cash(paid),
      `${bs.filter((b) => !b.paid).length} ${t("pagamentos pendentes", "pending payments")}`,
      "euro",
    ],
  ]
    .map(
      ([label, value, foot, icon]) =>
        `<div class="stat"><div class="stat-label">${label}${ic(String(icon))}</div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>`,
    )
    .join("")}</div>`;
}
function forecast() {
  return `<div class="forecast"><div class="sea-art"><span class="forecast-tag">${t("COSTA VICENTINA · DEMONSTRAÇÃO", "COSTA VICENTINA · DEMO")}</span></div><div class="forecast-body"><div class="forecast-title"><span>${t("CONDIÇÕES SIMULADAS", "SIMULATED CONDITIONS")}</span>${ic("wave")}</div><h3>Arrifana</h3><div class="forecast-values"><div><strong>0.8–1.2<span style="font-size:11px"> m</span></strong><small>${t("Ondulação", "Swell")}</small></div><div><strong>12<span style="font-size:11px"> s</span></strong><small>${t("Período", "Period")}</small></div><div><strong>NE <span style="font-size:11px">8 kn</span></strong><small>${t("Vento", "Wind")}</small></div></div><div class="forecast-message">${t("Exemplo de condições favoráveis para iniciação durante a manhã.", "Example of favourable conditions for beginner lessons in the morning.")}<br><span style="color:#91aea0">${t("Sem ligação a previsões reais.", "No live forecast connected.")}</span></div></div></div>`;
}
function recommendation() {
  return `<div class="panel recommend"><div class="recommend-label">${ic("spark")} SURFOS INSIGHTS</div><h2>${t("Uma boa manhã para começar.", "A good morning to begin.")}</h2><p>${t("Exemplo: agrupa os alunos de iniciação na Arrifana às 10h. Confirma sempre as condições no local antes da aula.", "Example: group beginners at Arrifana at 10am. Always check conditions on site before a lesson.")}</p><button class="text-btn" data-action="suggest">${t("Planear uma aula", "Plan a lesson")} +</button></div>`;
}
function teamPanel() {
  return `<div class="panel team-panel"><div class="team-title"><h2>${t("A tua equipa", "Your team")}</h2><span class="small">${db.teachers.length}</span></div>${db.teachers.map((p) => `<div class="team-row">${av(p.name, p.color)}<div>${esc(p.name)}<small>${today().filter((l) => l.teacher === p.id).length} ${t("aulas hoje", "lessons today")}</small></div><span class="available">${t("Ativo", "Active")}</span></div>`).join("")}<div style="padding:12px 18px 17px"><button class="text-btn" data-nav="team">${t("Ver equipa", "View team")}</button></div></div>`;
}
function agenda() {
  return `${stats()}<div class="workspace"><section class="panel"><div class="panel-head"><h2>${t("Agenda de aulas", "Lesson schedule")}</h2><div class="date-controls"><button class="icon-btn" data-shift="-1" aria-label="${t("Dia anterior", "Previous day")}">${ic("left")}</button><input aria-label="${t("Data da agenda", "Schedule date")}" id="schedule-date" type="date" value="${date}"><button class="icon-btn" data-shift="1" aria-label="${t("Dia seguinte", "Next day")}">${ic("right")}</button></div></div><div class="schedule-toolbar"><div class="tabs"><button data-view="calendar" class="${view === "calendar" ? "selected" : ""}">${t("Por instrutor", "By instructor")}</button><button data-view="list" class="${view === "list" ? "selected" : ""}">${t("Lista", "List")}</button></div><div class="legend"><span>${t("Iniciação", "Beginner")}</span><span>${t("Intermédio", "Intermediate")}</span><span>${t("Privada", "Private")}</span></div></div>${view === "calendar" ? calendar() : lessonList()}</section><aside class="rightcol">${forecast()}${recommendation()}${teamPanel()}</aside></div>`;
}
function calendar() {
  return `<div class="calendar-scroll"><div class="calendar" style="--teachers:${Math.max(db.teachers.filter((p) => !p.archived).length, 1)}"><div></div>${db.teachers
    .filter((p) => !p.archived)
    .map(
      (p) =>
        `<div class="cal-head"><strong>${esc(p.name)}</strong><small>${today().filter((l) => l.teacher === p.id).length} ${t("aulas", "lessons")}</small></div>`,
    )
    .join(
      "",
    )}<div class="timecol">${[9, 10, 11, 12, 13, 14].map((h, i) => `<span style="top:${i * 80 + 8}px">${h}:00</span>`).join("")}</div>${db.teachers
    .filter((p) => !p.archived)
    .map(
      (p) =>
        `<div class="daycol">${today()
          .filter((l) => l.teacher === p.id)
          .map(
            (l) =>
              `<button class="lesson ${l.level} ${l.duration === 60 ? "short" : ""}" data-detail="${l.id}" style="top:${((minutes(l.time) - 540) / 60) * 80 + 7}px;height:${(l.duration / 60) * 80 - 10}px"><div class="clock">${l.time} – ${end(l)}</div><strong>${level(l.level)}</strong><div class="beach">${esc(l.beach)}</div><div class="lesson-bottom"><span><span class="avatar mini-av">${esc(initials(p.name))}</span>${p.name.split(" ")[0]}</span><span>${bookings(l.id).length}/${l.capacity} ${ic("users")}</span></div></button>`,
          )
          .join("")}</div>`,
    )
    .join("")}</div></div>`;
}
function lessonList() {
  return today().length
    ? today()
        .map(
          (l) =>
            `<button class="list-lesson" data-detail="${l.id}"><div><strong>${l.time} · ${level(l.level)}</strong><small>${esc(l.beach)} · ${esc(teacher(l.teacher).name)}</small></div><span>${bookings(l.id).length}/${l.capacity} ${t("alunos", "students")}</span></button>`,
        )
        .join("")
    : `<div class="empty">${t("Ainda não há aulas neste dia. Cria a primeira!", "No lessons on this day. Create your first one!")}</div>`;
}
function bookingPage() {
  let rows = db.bookings.filter((b) => {
    let s = student(b.student),
      l = lesson(b.lesson);
    return (
      `${s.name} ${l.beach} ${l.date}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (statusFilter === "all" || (statusFilter === "paid" ? b.paid : !b.paid))
    );
  });
  return `<div class="panel"><div class="filters"><input type="search" id="search" placeholder="${t("Pesquisar aluno ou praia…", "Search student or beach…")}" value="${esc(query)}"><select id="status-filter"><option value="all">${t("Todos os pagamentos", "All payments")}</option><option value="paid" ${statusFilter === "paid" ? "selected" : ""}>${t("Pago", "Paid")}</option><option value="pending" ${statusFilter === "pending" ? "selected" : ""}>${t("Pendente", "Pending")}</option></select></div><div class="table-wrap"><table><thead><tr>${[t("Aluno", "Student"), t("Aula", "Lesson"), t("Data", "Date"), t("Valor", "Amount"), t("Pagamento", "Payment"), ""].map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows
    .map((b) => {
      let s = student(b.student),
        l = lesson(b.lesson);
      return `<tr><td><div class="table-name">${av(s.name)}<strong>${esc(s.name)}</strong></div></td><td>${level(l.level)}<div class="small">${esc(l.beach)}</div></td><td>${fmt(l.date)}<div class="small">${l.time}</div></td><td>${cash(b.priceCents / 100)}</td><td><button class="badge ${b.paid ? "" : "pending"}" data-pay="${b.id}" title="${t("Alterar estado do pagamento", "Toggle payment status")}">${b.paid ? t("Pago", "Paid") : t("Pendente", "Pending")}</button></td><td><button class="text-btn danger" data-cancel="${b.id}">${t("Cancelar", "Cancel")}</button></td></tr>`;
    })
    .join(
      "",
    )}</tbody></table>${!rows.length ? `<div class="empty">${t("Nenhuma reserva encontrada.", "No bookings found.")}</div>` : ""}</div></div>`;
}
function studentsPage() {
  const rows = db.students
    .filter((s) => !s.archived)
    .filter((s) =>
      `${s.name} ${s.email}`.toLowerCase().includes(query.toLowerCase()),
    );
  return `<div class="panel"><div class="filters"><input type="search" id="search" value="${esc(query)}" placeholder="${t("Pesquisar alunos…", "Search students…")}"><span class="small">${rows.length} ${t("alunos", "students")}</span></div><div class="table-wrap"><table><thead><tr>${[t("Aluno", "Student"), "Email", t("Nível", "Level"), t("Reservas", "Bookings"), ""].map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map((s) => `<tr><td><div class="table-name">${av(s.name)}<button class="text-btn" data-edit-student="${s.id}">${esc(s.name)}</button></div></td><td>${esc(s.email)}</td><td><span class="badge">${level(s.level)}</span></td><td>${db.bookings.filter((b) => b.student === s.id).length}</td><td><button class="text-btn" data-book-student="${s.id}">${t("Reservar aula", "Book lesson")}</button></td></tr>`).join("")}</tbody></table>${!rows.length ? `<div class="empty">${t("Nenhum aluno encontrado.", "No students found.")}</div>` : ""}</div></div>`;
}
function teamPage() {
  return `<div class="cards-grid">${db.teachers
    .filter((p) => !p.archived)
    .map(
      (p) =>
        `<div class="panel instructor">${av(p.name, p.color)}<h3>${esc(p.name)}</h3><p>${esc(p.role)}</p><button class="text-btn" data-edit-teacher="${p.id}">${t("Editar", "Edit")}</button> <span class="badge">${t("Ativo", "Active")}</span><div class="counts" style="margin-top:20px"><span>${t("Aulas neste dia", "Lessons on this day")}</span><strong>${today().filter((l) => l.teacher === p.id).length}</strong></div><div class="small" style="margin-top:12px">${
          today()
            .filter((l) => l.teacher === p.id)
            .map((l) => l.time + " · " + esc(l.beach))
            .join("<br>") || t("Sem aulas agendadas", "No lessons scheduled")
        }</div></div>`,
    )
    .join("")}</div>`;
}
function conditionsPage() {
  return `<div class="workspace"><div><div class="panel recommend" style="margin-bottom:20px"><h2>${t("Previsões de demonstração", "Demo forecasts")}</h2><p>${t("Estes dados servem para explorar o produto. A integração com um fornecedor de previsões reais e a validação das recomendações ficam para uma próxima fase.", "This data lets you explore the product. Live forecast integration and recommendation validation are planned for a future phase.")}</p></div><div class="panel"><table><thead><tr><th>${t("Praia", "Beach")}</th><th>${t("Ondas", "Waves")}</th><th>${t("Vento", "Wind")}</th><th>${t("Nível sugerido (exemplo)", "Suggested level (example)")}</th></tr></thead><tbody>${[
    ["Arrifana", "0.8–1.2 m", "NE · 8 kn", "beginner"],
    ["Monte Clérigo", "1.2–1.8 m", "NE · 10 kn", "intermediate"],
    ["Amoreira", "0.6–1.0 m", "E · 6 kn", "beginner"],
  ]
    .map(
      ([a, b, c, d]) =>
        `<tr><td><strong>${a}</strong></td><td>${b}</td><td>${c}</td><td>${level(d)}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div></div><aside class="rightcol">${forecast()}${recommendation()}</aside></div>`;
}
function settingsPage() {
  return `<div class="panel settings"><form id="settings-form"><h2>${t("A tua escola", "Your school")}</h2><label>${t("Nome da escola", "School name")}<input name="school" required minlength="2" maxlength="100" value="${esc(db.school)}"></label><p class="small">${t("Fuso horário: Europe/Lisbon. Previsões de demonstração.", "Timezone: Europe/Lisbon. Demo forecasts.")}</p><button class="primary" type="submit">${t("Guardar alterações", "Save changes")}</button></form><div class="form-actions"><button class="secondary" data-action="history">${t("Reservas canceladas", "Cancelled bookings")}</button><button class="secondary" data-action="logout">${t("Terminar sessão", "Log out")}</button></div></div>`;
}
function render() {
  const title =
    page === "agenda"
      ? t("O teu dia, em boas mãos.", "Your day, in good hands.")
      : page === "bookings"
        ? t("Reservas", "Bookings")
        : page === "students"
          ? t("Alunos", "Students")
          : page === "team"
            ? t("A tua equipa", "Your team")
            : page === "conditions"
              ? t("De olho no mar.", "An eye on the ocean.")
              : t("Definições", "Settings");
  const sub =
    page === "agenda"
      ? t(
          "Menos gestão. Mais tempo dentro de água.",
          "Less admin. More time in the water.",
        )
      : page === "bookings"
        ? t(
            "Todas as sessões e pagamentos, num só lugar.",
            "Every session and payment, in one place.",
          )
        : page === "students"
          ? t(
              "Conhece quem vem surfar contigo.",
              "Know who is surfing with you.",
            )
          : page === "team"
            ? t(
                "As pessoas que fazem a tua escola acontecer.",
                "The people who make your school happen.",
              )
            : page === "conditions"
              ? t(
                  "Condições por praia para planear as tuas aulas.",
                  "Beach conditions to help plan your lessons.",
                )
              : t("Personaliza o teu espaço.", "Make this space yours.");
  document.documentElement.lang = lang;
  document.querySelector<HTMLElement>("#app")!.innerHTML =
    `<div class="shell"><aside class="sidebar"><div class="brand">${ic("wave")}<span>surf<span>os</span><span style="font-size:11px;letter-spacing:0;color:#94a58f;margin-left:5px">®</span></span></div><div class="school"><span class="school-icon">${ic("sun")}</span><div><strong>${esc(db.school)}</strong><small>Aljezur, Portugal</small></div></div><div class="label">WORKSPACE</div><nav class="nav">${navs.map(([id, icon, pt, en]) => `<button data-nav="${id}" class="${page === id ? "active" : ""}">${ic(String(icon))}${t(pt, en)}${id === "bookings" ? `<b>${db.bookings.length}</b>` : ""}</button>`).join("")}</nav><div class="sidebar-footer"><div class="demo-note"><strong>${t("A tua escola. O teu ritmo.", "Your school. Your rhythm.")}</strong>${t("Uma operação mais simples começa aqui.", "A simpler operation starts here.")}</div><nav class="nav"><button data-nav="settings" class="${page === "settings" ? "active" : ""}">${ic("settings")}${t("Definições", "Settings")}</button></nav><div class="profile">${av(user!.name, "#dfe7d9")}<div><strong>${esc(user!.name)}</strong><small>${t("Administrador", "Administrator")}</small></div></div></div></aside><main class="main"><header class="topbar"><span>${esc(db.school)} <span style="margin:0 10px;color:#c2ccc4">/</span> <strong>${t(navs.find((x) => x[0] === page)?.[2] || "Definições", navs.find((x) => x[0] === page)?.[3] || "Settings")}</strong></span><div class="top-actions"><span class="demo-pill">${"MVP · v0.1"}</span><div class="lang"><button data-lang="pt" class="${lang === "pt" ? "on" : ""}">PT</button><button data-lang="en" class="${lang === "en" ? "on" : ""}">EN</button></div>${av(user!.name, "#dfe7d9")}</div></header><div class="content"><div class="heading"><div><h1>${title}</h1><p class="subtitle">${sub}</p></div>${["agenda", "bookings", "students", "team"].includes(page) ? `<button class="primary" data-action="${page === "agenda" ? "lesson" : page === "bookings" ? "booking" : page === "students" ? "student" : "teacher"}">${ic("plus")}${page === "agenda" ? t("Nova aula", "New lesson") : page === "bookings" ? t("Nova reserva", "New booking") : page === "students" ? t("Novo aluno", "New student") : t("Novo instrutor", "New instructor")}</button>` : ""}</div>${page === "agenda" ? agenda() : page === "bookings" ? bookingPage() : page === "students" ? studentsPage() : page === "team" ? teamPage() : page === "conditions" ? conditionsPage() : settingsPage()}<div class="footnote">SURFOS · ${t("Feito para viver ao ritmo do mar.", "Made for life by the ocean.")} <span style="margin:0 7px">·</span> BIS</div></div></main></div>`;
  if (page === "settings") bindSettings();
}
const modal = document.querySelector<HTMLDialogElement>("#modal")!;
const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
function openModal(title: string, body: string) {
  modal.innerHTML = `<div class="modal-top"><h2>${esc(title)}</h2><button data-close aria-label="${t("Fechar", "Close")}">×</button></div>${body}`;
  modal.showModal();
}
function formEnd(label: string) {
  return `<p class="error" id="form-error" role="alert"></p><div class="form-actions"><button type="button" class="secondary" data-close>${t("Cancelar", "Cancel")}</button><button class="primary" type="submit">${label}</button></div></form>`;
}
function showError(s: string) {
  $("#form-error").textContent = s;
}
async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-SurfOS": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    if (res.status === 401 && user) {
      user = null;
      modal.close();
      await loginScreen();
    }
    throw new Error(
      Array.isArray(e.message)
        ? e.message.join(" · ")
        : e.message || `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}
async function load() {
  const data = await api<{
    school: { name: string };
    teachers: Teacher[];
    students: Student[];
    lessons: Lesson[];
    bookings: Booking[];
  }>("/workspace");
  db = {
    ...data,
    school: data.school.name,
    lessons: data.lessons.map((l) => ({ ...l, price: l.priceCents / 100 })),
  };
}
function formSubmit(
  selector: string,
  fn: (data: Record<string, string>) => Promise<void>,
) {
  $(selector).addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const button = form.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    )!;
    button.disabled = true;
    try {
      await fn(
        Object.fromEntries(new FormData(form)) as Record<string, string>,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (modal.open) showError(msg);
      else toast(msg);
    } finally {
      button.disabled = false;
    }
  });
}
async function changed(message: string) {
  await load();
  modal.close();
  render();
  toast(message);
}
function lessonForm(suggest = false, editing?: Lesson) {
  const instructors = db.teachers.filter((p) => !p.archived);
  if (!instructors.length) {
    toast(
      t(
        "Adiciona primeiro um instrutor na Equipa.",
        "Add an instructor in Team first.",
      ),
    );
    return;
  }
  const v = editing || {
    date,
    time: suggest ? "10:00" : "09:00",
    duration: 90,
    teacher: instructors[0].id,
    beach: "Arrifana",
    level: "beginner",
    capacity: 6,
    price: 45,
  };
  openModal(
    editing ? t("Editar aula", "Edit lesson") : t("Nova aula", "New lesson"),
    `<form id="lesson-form"><div class="form-row"><label>${t("Data", "Date")}<input name="date" type="date" required value="${v.date}"></label><label>${t("Hora de início", "Start time")}<input name="time" type="time" min="09:00" max="14:00" step="1800" required value="${v.time}"></label></div><div class="form-row"><label>${t("Duração", "Duration")}<select name="duration">${[60, 90, 120].map((n) => `<option value="${n}" ${n === v.duration ? "selected" : ""}>${n} min</option>`).join("")}</select></label><label>${t("Instrutor", "Instructor")}<select name="teacher">${instructors.map((p) => `<option value="${p.id}" ${p.id === v.teacher ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label></div><div class="form-row"><label>${t("Praia", "Beach")}<select name="beach">${["Arrifana", "Monte Clérigo", "Amoreira", "Odeceixe"].map((b) => `<option ${b === v.beach ? "selected" : ""}>${b}</option>`).join("")}</select></label><label>${t("Tipo de aula", "Lesson type")}<select name="level">${Object.keys(
      levels,
    )
      .map(
        (l) =>
          `<option value="${l}" ${l === v.level ? "selected" : ""}>${level(l)}</option>`,
      )
      .join(
        "",
      )}</select></label></div><div class="form-row"><label>${t("Lugares", "Capacity")}<input name="capacity" type="number" min="1" max="12" required value="${v.capacity}"></label><label>${t("Preço por aluno (€)", "Price per student (€)")}<input name="price" type="number" step="0.01" min="0" max="999" required value="${v.price}"></label></div><p class="small">${t("Agenda das 09:00 às 15:00. Alterar o preço não altera reservas já existentes.", "Schedule: 09:00–15:00. Price changes do not affect existing bookings.")}</p>${formEnd(t("Guardar aula", "Save lesson"))}`,
  );
  formSubmit("#lesson-form", async (d) => {
    const { price, ...rest } = d;
    await api(
      editing ? `/lessons/${editing.id}` : "/lessons",
      editing ? "PATCH" : "POST",
      {
        ...rest,
        duration: Number(d.duration),
        capacity: Number(d.capacity),
        priceCents: Math.round(Number(price) * 100),
      },
    );
    date = d.date;
    await changed(t("Aula guardada.", "Lesson saved."));
  });
}
function bookingForm(preLesson = "", preStudent = "") {
  const options = db.lessons
    .filter((l) => bookings(l.id).length < l.capacity)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const students = db.students.filter((s) => !s.archived);
  if (!options.length || !students.length) {
    toast(
      t(
        "Adiciona um aluno e uma aula com lugares disponíveis.",
        "Add a student and a lesson with available spots.",
      ),
    );
    return;
  }
  openModal(
    t("Nova reserva", "New booking"),
    `<form id="booking-form"><label>${t("Aluno", "Student")}<select name="student">${students.map((s) => `<option value="${s.id}" ${s.id === preStudent ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label><label>${t("Aula", "Lesson")}<select name="lesson">${options.map((l) => `<option value="${l.id}" ${l.id === preLesson ? "selected" : ""}>${fmt(l.date)} · ${l.time} · ${l.beach} · ${level(l.level)} · ${cash(l.price)} (${l.capacity - bookings(l.id).length} ${t("livres", "free")})</option>`).join("")}</select></label><label>${t("Pagamento (registo manual)", "Payment (manual record)")}<select name="paid"><option value="false">${t("Pendente", "Pending")}</option><option value="true">${t("Pago", "Paid")}</option></select></label>${formEnd(t("Confirmar reserva", "Confirm booking"))}`,
  );
  formSubmit("#booking-form", async (d) => {
    await api("/bookings", "POST", { ...d, paid: d.paid === "true" });
    await changed(t("Reserva confirmada.", "Booking confirmed."));
  });
}
function personForm(isTeacher = false, id?: string) {
  const value = id ? (isTeacher ? teacher(id) : student(id)) : null;
  openModal(
    id
      ? t("Editar registo", "Edit record")
      : isTeacher
        ? t("Novo instrutor", "New instructor")
        : t("Novo aluno", "New student"),
    `<form id="person-form"><label>${t("Nome completo", "Full name")}<input name="name" required minlength="2" maxlength="80" value="${esc(value?.name || "")}"></label>${isTeacher ? `<label>${t("Função", "Role")}<input name="role" required value="${esc((value as Teacher)?.role || "Surf coach")}" maxlength="60"></label>` : `<label>Email<input name="email" type="email" required maxlength="160" value="${esc((value as Student)?.email || "")}"></label><label>${t("Nível de surf", "Surf level")}<select name="level">${["beginner", "intermediate"].map((l) => `<option value="${l}" ${l === (value as Student)?.level ? "selected" : ""}>${level(l)}</option>`).join("")}</select></label>`}${id ? `<button type="button" class="text-btn danger" data-archive="${id}" data-kind="${isTeacher ? "teachers" : "students"}">${t("Arquivar registo", "Archive record")}</button>` : ""}${formEnd(t("Guardar", "Save"))}`,
  );
  formSubmit("#person-form", async (d) => {
    const kind = isTeacher ? "teachers" : "students";
    await api(
      `/${kind}${id ? "/" + id : ""}`,
      id ? "PATCH" : "POST",
      isTeacher ? { ...d, color: (value as Teacher)?.color || "#dce7d6" } : d,
    );
    await changed(t("Registo guardado.", "Record saved."));
  });
}
function detail(id: string) {
  const l = lesson(id),
    bs = bookings(id);
  openModal(
    level(l.level),
    `<div class="detail">${fmt(l.date)} · ${l.time}–${end(l)}<br><strong>${esc(l.beach)}</strong> · ${esc(teacher(l.teacher).name)}<br>${bs.length}/${l.capacity} ${t("lugares reservados", "spots booked")} · ${cash(l.price)} / ${t("aluno", "student")}</div><h3 style="font-size:14px;margin:20px 0 10px">${t("Alunos inscritos", "Booked students")}</h3>${bs.length ? bs.map((b) => `<div class="team-row" style="padding-left:0">${av(student(b.student).name)}<span>${esc(student(b.student).name)}</span><span class="badge ${b.paid ? "" : "pending"}" style="margin-left:auto">${cash(b.priceCents / 100)} · ${b.paid ? t("Pago", "Paid") : t("Pendente", "Pending")}</span></div>`).join("") : `<p class="small">${t("Ainda sem reservas.", "No bookings yet.")}</p>`}<p id="form-error" class="error" role="alert"></p><div class="form-actions"><button class="secondary" data-edit-lesson="${id}">${t("Editar", "Edit")}</button><button class="secondary danger" data-delete-lesson="${id}">${t("Cancelar aula", "Cancel lesson")}</button>${bs.length < l.capacity ? `<button class="primary" data-book-lesson="${id}">${t("Nova reserva", "New booking")}</button>` : ""}</div>`,
  );
}
function confirmAction(
  title: string,
  message: string,
  callback: () => Promise<void>,
) {
  if (modal.open) modal.close();
  openModal(
    title,
    `<p class="detail">${message}</p><p id="form-error" class="error" role="alert"></p><div class="form-actions"><button class="secondary" data-close>${t("Voltar", "Back")}</button><button class="primary" id="confirm-action">${t("Confirmar", "Confirm")}</button></div>`,
  );
  $("#confirm-action").onclick = async () => {
    const btn = $<HTMLButtonElement>("#confirm-action");
    btn.disabled = true;
    try {
      await callback();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      btn.disabled = false;
    }
  };
}
function bindSettings() {
  formSubmit("#settings-form", async (d) => {
    await api("/school", "PATCH", { name: d.school });
    await load();
    render();
    toast(t("Escola atualizada.", "School updated."));
  });
}
async function cancellationHistory() {
  const records = await api<(Booking & { status: string })[]>(
    "/bookings/cancelled",
  );
  openModal(
    t("Reservas canceladas", "Cancelled bookings"),
    `<p class="small">${t("Pagamentos registados não são reembolsados automaticamente.", "Recorded payments are not automatically refunded.")}</p><div class="table-wrap"><table><thead><tr><th>${t("Aluno", "Student")}</th><th>${t("Valor", "Amount")}</th><th>${t("Pagamento", "Payment")}</th></tr></thead><tbody>${records.map((b) => `<tr><td>${esc(student(b.student)?.name || b.student)}</td><td>${cash(b.priceCents / 100)}</td><td>${b.paid ? t("Pago — regularizar manualmente", "Paid — reconcile manually") : t("Pendente", "Pending")}</td></tr>`).join("")}</tbody></table></div>`,
  );
}
document.addEventListener("click", async (e) => {
  const el = (e.target as Element).closest("button");
  if (!el) return;
  const d = el.dataset;
  try {
    if (d.close !== undefined) {
      modal.close();
      return;
    }
    if (d.nav) {
      page = d.nav;
      query = "";
      statusFilter = "all";
      await load();
      render();
    }
    if (d.lang) {
      lang = d.lang;
      localStorage.setItem("surfos-lang", lang);
      if (user) render();
      else await loginScreen();
    }
    if (d.shift) {
      const dt = new Date(date + "T12:00:00Z");
      dt.setUTCDate(dt.getUTCDate() + Number(d.shift));
      date = dt.toISOString().slice(0, 10);
      render();
    }
    if (d.view) {
      view = d.view;
      render();
    }
    if (d.detail) detail(d.detail);
    if (d.action === "lesson") lessonForm();
    if (d.action === "suggest") lessonForm(true);
    if (d.action === "booking") bookingForm();
    if (d.action === "student") personForm();
    if (d.action === "teacher") personForm(true);
    if (d.editStudent) personForm(false, d.editStudent);
    if (d.editTeacher) personForm(true, d.editTeacher);
    if (d.bookLesson) {
      modal.close();
      bookingForm(d.bookLesson);
    }
    if (d.bookStudent) bookingForm("", d.bookStudent);
    if (d.editLesson) {
      modal.close();
      lessonForm(false, lesson(d.editLesson));
    }
    if (d.deleteLesson)
      confirmAction(
        t("Cancelar aula?", "Cancel lesson?"),
        t(
          "A aula e as suas reservas serão canceladas. O histórico será mantido. Não será processado qualquer reembolso.",
          "The lesson and its bookings will be cancelled. History is retained. No refunds will be processed.",
        ),
        async () => {
          await api(`/lessons/${d.deleteLesson}`, "DELETE");
          await changed(t("Aula cancelada.", "Lesson cancelled."));
        },
      );
    if (d.pay) {
      const b = db.bookings.find((b) => b.id === d.pay)!;
      el.disabled = true;
      await api(`/bookings/${b.id}/payment`, "PATCH", { paid: !b.paid });
      await changed(t("Pagamento atualizado.", "Payment updated."));
    }
    if (d.cancel)
      confirmAction(
        t("Cancelar reserva?", "Cancel booking?"),
        t(
          "O lugar ficará disponível. O histórico do pagamento será mantido e não será processado qualquer reembolso.",
          "The spot will become available. Payment history is retained and no refund will be processed.",
        ),
        async () => {
          await api(`/bookings/${d.cancel}`, "DELETE");
          await changed(t("Reserva cancelada.", "Booking cancelled."));
        },
      );
    if (d.archive)
      confirmAction(
        t("Arquivar registo?", "Archive record?"),
        t(
          "O histórico será mantido. Não é possível arquivar registos com compromissos futuros.",
          "History is retained. Records with future commitments cannot be archived.",
        ),
        async () => {
          await api(`/${d.kind}/${d.archive}`, "DELETE");
          await changed(t("Registo arquivado.", "Record archived."));
        },
      );
    if (d.action === "logout") {
      await api("/auth/logout", "POST");
      user = null;
      await loginScreen();
    }
    if (d.action === "history") await cancellationHistory();
  } catch (e) {
    toast((e as Error).message);
  } finally {
    el.disabled = false;
  }
});
document.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === "schedule-date" && el.value) {
    date = el.value;
    render();
  }
  if (el.id === "status-filter") {
    statusFilter = el.value;
    render();
  }
});
document.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === "search") {
    const pos = el.selectionStart;
    query = el.value;
    render();
    const next = $<HTMLInputElement>("#search");
    next.focus();
    next.setSelectionRange(pos, pos);
  }
});
async function loginScreen(register = false) {
  const configuration = await api<{ registration: boolean }>("/config");
  $("#app").innerHTML =
    `<div class="login-shell"><div class="login-brand">${ic("wave")} surfos</div><h1>${t("Mais surf. Menos gestão.", "More surf. Less admin.")}</h1><p class="subtitle">${register ? t("Cria o espaço da tua escola.", "Create your school workspace.") : t("Entra no espaço da tua escola.", "Sign in to your school workspace.")}</p><form id="login-form">${register ? `<label>${t("A tua escola", "Your school")}<input name="school" required minlength="2" maxlength="100" autocomplete="organization"></label><label>${t("O teu nome", "Your name")}<input name="name" required minlength="2" maxlength="80" autocomplete="name"></label>` : ""}<label>Email<input name="email" type="email" autocomplete="username" required maxlength="160"></label><label>${t("Palavra-passe (mín. 12 caracteres)", "Password (min. 12 characters)")}<input name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" minlength="12" maxlength="128" required></label><p id="login-error" class="error" role="alert"></p><button type="submit" class="primary">${register ? t("Criar escola", "Create school") : t("Entrar", "Sign in")}</button></form><div class="form-actions"><button id="switch-auth" class="text-btn">${configuration.registration ? (register ? t("Já tenho conta", "I already have an account") : t("Criar uma escola", "Create a school")) : ""}</button><button data-lang="pt" class="secondary">PT</button><button data-lang="en" class="secondary">EN</button></div></div>`;
  $("#switch-auth").onclick = () => {
    if (configuration.registration) void loginScreen(!register);
  };
  $("#login-form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const button = form.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    )!;
    button.disabled = true;
    try {
      user = await api<User>(
        register ? "/auth/register" : "/auth/login",
        "POST",
        Object.fromEntries(new FormData(form)),
      );
      await load();
      render();
    } catch (e) {
      $("#login-error").textContent = (e as Error).message;
    } finally {
      button.disabled = false;
    }
  };
}
async function boot() {
  try {
    user = await api<User>("/auth/me");
    await load();
    render();
  } catch {
    await loginScreen();
  }
}
void boot().catch(() => {
  $("#app").innerHTML =
    '<div class="login-shell"><h1>SurfOS</h1><p>Não foi possível ligar ao servidor. Tenta atualizar a página.</p></div>';
});

export {};
