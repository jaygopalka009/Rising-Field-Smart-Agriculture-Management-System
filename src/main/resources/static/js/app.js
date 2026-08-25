// ================= RisingField SPA =================
let state = {
  user: null,
  page: null,
  categories: { WORK: [], EQUIPMENT: [] },
};
let booted = false;

function catLabel(c) {
  if (!c) return "";
  if (currentLang === "gu" && c.nameGu) return c.nameGu;
  if (currentLang === "hi" && c.nameHi) return c.nameHi;
  return c.name;
}

// ---------- boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  syncLangSelectors();
  applyStaticI18n();
  const yr = document.getElementById("copyYear");
  if (yr) yr.textContent = new Date().getFullYear();

  // Always load categories unconditionally so guest registration works
  await loadCategories();

  // restore an existing session if one is present (no forced redirect)
  const tk = API.token();
  if (tk) {
    try {
      const me = await API.get("/api/auth/me");
      state.user = me;
      if (state.user.preferredLanguage) {
        currentLang = state.user.preferredLanguage;
        localStorage.setItem("lang", currentLang);
        syncLangSelectors();
      }
    } catch { API.clearAuth(); }
  }

  booted = true;
  window.addEventListener("hashchange", handleRoute);
  handleRoute();   // render whatever the URL asks for
});

/* ---------------- HASH ROUTER ----------------
   #/home                landing page
   #/login  #/register   auth screen
   #/app/<page>          dashboard page (requires login)
   Back button & direct URLs work because every screen is a real hash state. */
function goHash(hash) {
  if (location.hash === hash) handleRoute();
  else location.hash = hash;
}
function currentHash() { return location.hash || "#/home"; }

async function handleRoute() {
  if (!booted) return;
  const parts = currentHash().replace(/^#\/?/, "").split("/");  // "app/dashboard" -> ["app","dashboard"]
  const root = parts[0] || "home";

  // ---- app / dashboard (requires login) ----
  if (root === "app") {
    if (!state.user) { location.replace("#/login"); return; }
    if (!state.page) await enterAppData();
    const menu = MENUS[state.user.role] || [];
    const wanted = parts[1];
    if (wanted && menu.some(m => m.key === wanted)) state.page = wanted;
    else if (!state.page) state.page = menu.length ? menu[0].key : null;
    showScreen("app");
    render();
    return;
  }

  // ---- auth ----
  if (root === "login" || root === "register") {
    if (state.user) { location.replace("#/app"); return; }
    authMode = (root === "register") ? "register" : "login";
    showScreen("auth");
    renderAuth();
    return;
  }

  // ---- home (default) ----
  showScreen("home");
  applyStaticI18n();
  if (parts[1]) scrollToSection(parts[1]);
}

function showScreen(name) {
  document.getElementById("homeScreen").style.display = (name === "home") ? "block" : "none";
  document.getElementById("authScreen").style.display = (name === "auth") ? "flex" : "none";
  document.getElementById("app").style.display        = (name === "app")  ? "block" : "none";
  window.scrollTo(0, 0);
}

// home nav: smooth-scroll to a section (updates hash so Back works)
function navHome(section) {
  if (currentHash().startsWith("#/home")) scrollToSection(section);
  else goHash("#/home/" + section);
}
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// fill every [data-i18n] element for the current language
function applyStaticI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
}
function syncLangSelectors() {
  ["authLang", "authLangTop", "topLang", "homeLang"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = currentLang;
  });
}

// ================= AUTH =================
let authMode = "login"; // or "register"

// kept for compatibility (401 handler): send the user to the login screen
function showAuth() { state.user = null; goHash("#/login"); }

function renderAuth() {
  document.getElementById("brandName").textContent = t("appName");
  document.getElementById("brandTag").textContent = t("tagline");
  document.getElementById("lblLangAuth").textContent = t("language");
  const box = document.getElementById("authForms");
  if (authMode === "login") {
    box.innerHTML = `
      <div class="field"><label>${t("email")}</label><input id="li_email" type="email" /></div>
      ${pwField("li_pass", "password")}
      <button class="btn block" onclick="doLogin()">${t("login")}</button>
      <p class="mt" style="text-align:center">
        <button class="btn secondary block" onclick="goHash('#/home')">${t("navHome")}</button>
      </p>
      <p class="mt" style="text-align:center">
        <button class="link" onclick="authMode='forgot';renderAuth()">${t("forgotPassword")}</button>
      </p>
      <p style="text-align:center">
        <button class="link" onclick="goHash('#/register')">${t("noAccount")}</button>
      </p>`;
  } else if (authMode === "forgot") {
    box.innerHTML = `
      <h3 style="margin-bottom:12px">${t("resetPassword")}</h3>
      <div class="field"><label>${t("email")}</label><input id="fp_email" type="email" /></div>
      <div class="field"><label>${t("phone")}</label><input id="fp_phone" /></div>
      ${pwField("fp_pass", "newPassword")}
      ${pwField("fp_pass2", "confirmPassword")}
      <button class="btn block" onclick="doForgot()">${t("resetPassword")}</button>
      <p class="mt" style="text-align:center">
        <button class="btn secondary block" onclick="goHash('#/home')">${t("navHome")}</button>
      </p>
      <p class="mt" style="text-align:center">
        <button class="link" onclick="goHash('#/login')">${t("haveAccount")}</button>
      </p>`;
  } else {
    box.innerHTML = `
      <div class="field"><label>${t("name")}</label><input id="rg_name" /></div>
      <div class="row">
        <div class="field"><label>${t("email")}</label><input id="rg_email" type="email" /></div>
        <div class="field"><label>${t("phone")}</label><input id="rg_phone" /></div>
      </div>
      ${pwField("rg_pass", "password")}
      ${pwField("rg_pass2", "confirmPassword")}
      <div class="field"><label>${t("role")}</label>
        <select id="rg_role" onchange="roleFields()">
          <option value="FARMER">${t("farmer")}</option>
          <option value="LABOUR">${t("labour")}</option>
          <option value="EQUIPMENT_OWNER">${t("equipmentOwner")}</option>
        </select>
      </div>
      <!-- village / district for every role -->
      <div class="row">
        <div class="field"><label>${t("village")}</label><input id="rg_village" /></div>
        <div class="field"><label>${t("district")}</label><input id="rg_district" /></div>
      </div>
      <div id="rg_extra"></div>
      <div class="field"><label>${t("language")}</label>
        <select id="rg_lang">
          <option value="en">English</option><option value="gu">ગુજરાતી</option><option value="hi">हिंदी</option>
        </select>
      </div>
      <button class="btn block" onclick="doRegister()">${t("register")}</button>
      <p class="mt" style="text-align:center">
        <button class="btn secondary block" onclick="goHash('#/home')">${t("navHome")}</button>
      </p>
      <p class="mt" style="text-align:center">
        <button class="link" onclick="goHash('#/login')">${t("haveAccount")}</button>
      </p>`;
    document.getElementById("rg_lang").value = currentLang;
    roleFields();
  }
}

function roleFields() {
  try {
    const role = document.getElementById("rg_role").value;
    const box = document.getElementById("rg_extra");
    if (role === "FARMER") {
      box.innerHTML = `
        <div class="field"><label>${t("farmSize")}</label><input id="rg_farm" type="number" step="0.1" /></div>`;
    } else if (role === "LABOUR") {
      box.innerHTML = `
        <div class="field"><label>${t("selectSkills")}</label>
          <div id="rg_skills">${checkGrid(state.categories.WORK, [], catLabel)}</div>
        </div>
        <div class="row">
          <div class="field"><label>${t("ratePerHour")}</label><input id="rg_rateHour" type="number" placeholder="100" /></div>
          <div class="field"><label>${t("ratePerDay")}</label><input id="rg_rateDay" type="number" placeholder="500" /></div>
        </div>
        <div class="field"><label>${t("ratePerVigha")}</label><input id="rg_rateVigha" type="number" placeholder="800" /></div>`;
    } else {
      box.innerHTML = "";
    }
  } catch (err) {
    console.error("Error in roleFields:", err);
  }
}

async function doLogin() {
  try {
    const res = await API.post("/api/auth/login", {
      email: document.getElementById("li_email").value.trim(),
      password: document.getElementById("li_pass").value,
    });
    API.setAuth(res.token, res.user);
    state.user = res.user;
    state.page = null;
    await enterAppData();
    location.replace("#/app");   // replace login entry -> Back returns to Home
  } catch (e) { toast(e.message, "error"); }
}

async function doForgot() {
  const p1 = document.getElementById("fp_pass").value;
  const p2 = document.getElementById("fp_pass2").value;
  if (p1 !== p2) { toast(t("passwordMismatch"), "error"); return; }
  try {
    await API.post("/api/auth/forgot-password", {
      email: val("fp_email"),
      phone: val("fp_phone"),
      newPassword: p1,
    });
    toast(t("updated"), "success");
    authMode = "login";
    renderAuth();
  } catch (e) { toast(e.message, "error"); }
}

async function doRegister() {
  const role = document.getElementById("rg_role").value;
  const p1 = document.getElementById("rg_pass").value;
  const p2 = document.getElementById("rg_pass2").value;

  // ---- all details are required before the account is created ----
  if (!val("rg_name")) { toast(t("nameRequired"), "error"); return; }
  const email = val("rg_email");
  if (!email || !/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(email)) { toast(t("emailRequired"), "error"); return; }
  const phone = val("rg_phone");
  if (!phone || !/^\d{10}$/.test(phone)) { toast(t("phoneRequired"), "error"); return; }
  if (!p1 || p1.length < 6) { toast(t("passwordTooShort"), "error"); return; }
  if (p1 !== p2) { toast(t("passwordMismatch"), "error"); return; }
  if (!val("rg_village")) { toast(t("villageRequired"), "error"); return; }
  if (!val("rg_district")) { toast(t("districtRequired"), "error"); return; }
  if (role === "FARMER" && !numVal("rg_farm")) { toast(t("farmSizeRequired"), "error"); return; }
  if (role === "LABOUR") {
    if (!checkedKeys("rg_skills").length) { toast(t("skillsRequired"), "error"); return; }
    if (!numVal("rg_rateHour") && !numVal("rg_rateDay") && !numVal("rg_rateVigha")) {
      toast(t("rateRequired"), "error"); return;
    }
  }

  const body = {
    name: document.getElementById("rg_name").value.trim(),
    email: document.getElementById("rg_email").value.trim(),
    phone: document.getElementById("rg_phone").value.trim(),
    password: p1,
    role,
    preferredLanguage: document.getElementById("rg_lang").value,
    village: val("rg_village"),
    district: val("rg_district"),
  };
  if (role === "FARMER") {
    body.farmSizeVigha = numVal("rg_farm");
  } else if (role === "LABOUR") {
    body.skills = checkedKeys("rg_skills");
    body.ratePerHour = numVal("rg_rateHour");
    body.ratePerDay = numVal("rg_rateDay");
    body.ratePerVigha = numVal("rg_rateVigha");
  }
  try {
    const res = await API.post("/api/auth/register", body);
    API.setAuth(res.token, res.user);
    state.user = res.user;
    state.page = null;
    await enterAppData();
    location.replace("#/app");
  } catch (e) { toast(e.message, "error"); }
}

function val(id) { const e = document.getElementById(id); return e ? e.value.trim() : null; }
function numVal(id) { const v = val(id); return v ? parseFloat(v) : null; }

// ================= APP DATA (prepare, no screen switching) =================
async function enterAppData() {
  if (state.user && state.user.preferredLanguage) {
    currentLang = state.user.preferredLanguage;
    localStorage.setItem("lang", currentLang);
    syncLangSelectors();
  }
  await loadCategories();
  if (state.user && state.user.role === "FARMER") {
    try {
      state.farms = await API.get("/api/profile/farms");
    } catch (e) {
      state.farms = [];
    }
  }
  const menu = MENUS[state.user.role] || [];
  if (!state.page) state.page = menu.length ? menu[0].key : null;
  refreshNotifBadge();
}

function logout() {
  API.clearAuth();
  state.user = null;
  state.page = null;
  goHash("#/home");
}

async function loadCategories() {
  try {
    const all = await API.get("/api/public/categories");
    state.categories.WORK = all.filter(c => c.type === "WORK" && c.active);
    state.categories.EQUIPMENT = all.filter(c => c.type === "EQUIPMENT" && c.active);
  } catch { /* ignore */ }
}

// ================= MENUS =================
const MENUS = {
  FARMER: [
    { key: "dashboard", label: "dashboard", icon: "home" },
    { key: "bookLabour", label: "bookLabour", icon: "users" },
    { key: "bookEquipment", label: "bookEquipment", icon: "tool" },
    { key: "bookingHistory", label: "bookingHistory", icon: "calendar" },
    { key: "paymentHistory", label: "paymentHistory", icon: "credit-card" },
    { key: "myFarms", label: "myFarms", icon: "crop" },
    { key: "profile", label: "profile", icon: "user" },
  ],
  LABOUR: [
    { key: "dashboard", label: "dashboard", icon: "home" },
    { key: "incoming", label: "incomingBookings", icon: "download" },
    { key: "ongoing", label: "ongoingBookings", icon: "play-circle" },
    { key: "completed", label: "completedBookings", icon: "check-circle" },
    { key: "wallet", label: "wallet", icon: "briefcase" },
    { key: "earnings", label: "earnings", icon: "dollar-sign" },
    { key: "profile", label: "profile", icon: "user" },
  ],
  EQUIPMENT_OWNER: [
    { key: "dashboard", label: "dashboard", icon: "home" },
    { key: "myEquipment", label: "myEquipment", icon: "tool" },
    { key: "incoming", label: "incomingBookings", icon: "download" },
    { key: "ongoing", label: "ongoingBookings", icon: "play-circle" },
    { key: "completed", label: "completedBookings", icon: "check-circle" },
    { key: "wallet", label: "wallet", icon: "briefcase" },
    { key: "earnings", label: "earnings", icon: "dollar-sign" },
    { key: "profile", label: "profile", icon: "user" },
  ],
  ADMIN: [
    { key: "dashboard", label: "dashboard", icon: "home" },
    { key: "farmers", label: "manageFarmers", icon: "users" },
    { key: "labour", label: "manageLabour", icon: "briefcase" },
    { key: "owners", label: "manageOwners", icon: "user-check" },
    { key: "workCat", label: "manageWorkCat", icon: "grid" },
    { key: "equipCat", label: "manageEquipCat", icon: "layers" },
    { key: "adminBookings", label: "viewBookings", icon: "calendar" },
    { key: "adminPayments", label: "viewPayments", icon: "credit-card" },
    { key: "adminRatings", label: "viewRatings", icon: "star" },
    { key: "reports", label: "reports", icon: "bar-chart-2" },
    { key: "settings", label: "settings", icon: "settings" },
    { key: "broadcast", label: "broadcast", icon: "radio" },
  ],
};

// ================= RENDER =================
function render() {
  if (!state.user) { goHash("#/login"); return; }
  document.getElementById("topAppName").textContent = t("appName");
  const roleDisplay = formatRoleName(state.user.role);
  document.getElementById("topUser").innerHTML = `${esc(state.user.name)} <span style="font-size: 11px; opacity: 0.75; font-weight: normal; margin-left: 4px; background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 4px;">${roleDisplay}</span>`;
  document.getElementById("btnLogout").innerHTML = `<i data-feather="log-out" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i> <span style="vertical-align: middle;">${t("logout")}</span>`;
  const btnHome = document.getElementById("btnTopHome");
  if (btnHome) btnHome.innerHTML = `<i data-feather="home" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i> <span style="vertical-align: middle;">${t("navHome")}</span>`;

  // sidebar with feather icons
  const menu = MENUS[state.user.role] || [];
  document.getElementById("sidebar").innerHTML = menu.map(m => {
    const dotId = m.key === "dashboard" ? "sidebarNotifDot" : `dot_${m.key}`;
    const dot = `<span id="${dotId}" class="badge hidden" style="background:#c62828; width:8px; height:8px; border-radius:50%; margin-left:auto; padding:0; display:inline-block;"></span>`;
    return `<a class="${state.page === m.key ? "active" : ""}" onclick="go('${m.key}')" style="display: flex; align-items: center; gap: 8px; width: 100%;">
       <i data-feather="${m.icon}" style="width: 18px; height: 18px;"></i>
       <span>${t(m.label)}</span>
       ${dot}
     </a>`;
  }).join("");

  routePage();
}

// navigate between dashboard pages via the hash so the Back button works
function go(key) { goHash("#/app/" + key); }

// language change: refresh only the screen that is currently visible
function onLangChange() {
  syncLangSelectors();
  applyStaticI18n();
  const h = currentHash();
  if (h.startsWith("#/app") && state.user) render();
  else if (h.startsWith("#/login") || h.startsWith("#/register")) renderAuth();
}

function routePage() {
  const v = document.getElementById("view");
  v.innerHTML = `<div class="empty">${t("loading")}</div>`;
  const p = state.page;
  const r = state.user.role;
  if (r === "FARMER") return farmerPage(p, v);
  if (r === "LABOUR") return providerPage(p, v, "LABOUR");
  if (r === "EQUIPMENT_OWNER") return providerPage(p, v, "EQUIPMENT_OWNER");
  if (r === "ADMIN") return adminPage(p, v);
}

function formatRoleName(role) {
  if (role === "FARMER") return "Farmer";
  if (role === "LABOUR") return "Labour";
  if (role === "EQUIPMENT_OWNER") return "Equipment Owner";
  if (role === "ADMIN") return "Admin";
  return role;
}
