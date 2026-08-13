// ================= PROFILE (all roles) =================
async function profilePage(v) {
  const u = await API.get("/api/profile");
  const role = u.role;

  // village / district are common to every role; farm location is selected only while booking.
  const locBlock = `
    <div class="row">
      <div class="field"><label>${t("village")}</label><input id="pf_village" value="${esc(u.village || "")}" /></div>
      <div class="field"><label>${t("district")}</label><input id="pf_district" value="${esc(u.district || "")}" /></div>
    </div>`;

  let extra = locBlock;
  if (role === "FARMER") {
    extra += `<div class="field"><label>${t("farmSize")}</label><input id="pf_farm" type="number" step="0.1" value="${u.farmSizeVigha || ""}" /></div>`;
  } else if (role === "LABOUR") {
    extra += `
      <div class="field"><label>${t("selectSkills")}</label>
        <div id="pf_skills">${checkGrid(state.categories.WORK, u.skills || [], catLabel)}</div>
      </div>
      <div class="row">
        <div class="field"><label>${t("ratePerHour")}</label><input id="pf_rateHour" type="number" value="${u.ratePerHour || ""}" /></div>
        <div class="field"><label>${t("ratePerDay")}</label><input id="pf_rateDay" type="number" value="${u.ratePerDay || ""}" /></div>
      </div>
      <div class="field"><label>${t("ratePerVigha")}</label><input id="pf_rateVigha" type="number" value="${u.ratePerVigha || ""}" /></div>
      <div class="field"><label><input type="checkbox" id="pf_avail" style="width:auto" ${u.available ? "checked" : ""}/> ${t("available")}</label></div>`;
  }

  v.innerHTML = `
    <h1 class="page-title">${t("profile")}</h1>
    <div class="card" style="max-width:640px">
      <div class="field"><label>${t("name")}</label><input id="pf_name" value="${esc(u.name || "")}" /></div>
      <div class="row">
        <div class="field"><label>${t("email")}</label><input value="${esc(u.email)}" disabled /></div>
        <div class="field"><label>${t("phone")}</label><input id="pf_phone" value="${esc(u.phone || "")}" /></div>
      </div>
      <div class="field"><label>${t("language")}</label>
        <select id="pf_lang">
          <option value="en">English</option><option value="gu">ગુજરાતી</option><option value="hi">हिंदी</option>
        </select>
      </div>
      ${extra}
      <button class="btn mt" onclick="saveProfile('${role}')">${t("saveProfile")}</button>
    </div>
    ${role !== "ADMIN" ? `
    <div class="card mt" style="max-width:640px;border-color:#e57373">
      <h2 style="color:#c62828">${t("deleteAccount")}</h2>
      <p class="muted">${t("deleteAccountWarn")}</p>
      <button class="btn danger" onclick="deleteAccount()">${t("deleteAccount")}</button>
    </div>` : ""}`;

  document.getElementById("pf_lang").value = u.preferredLanguage || currentLang;
}

async function saveProfile(role) {
  const body = {
    name: val("pf_name"),
    phone: val("pf_phone"),
    preferredLanguage: val("pf_lang"),
    village: val("pf_village"),
    district: val("pf_district"),
  };
  if (role === "FARMER") {
    body.farmSizeVigha = numVal("pf_farm");
  } else if (role === "LABOUR") {
    body.skills = checkedKeys("pf_skills");
    body.ratePerHour = numVal("pf_rateHour");
    body.ratePerDay = numVal("pf_rateDay");
    body.ratePerVigha = numVal("pf_rateVigha");
    body.available = document.getElementById("pf_avail").checked;
  }
  try {
    const saved = await API.put("/api/profile", body);
    Object.assign(state.user, saved);
    sessionStorage.setItem("user", JSON.stringify(state.user));
    if (saved.preferredLanguage) setLang(saved.preferredLanguage);
    toast(t("updated"), "success");
    render();
  } catch (e) { toast(e.message, "error"); }
}

async function deleteAccount() {
  if (!confirm(t("deleteAccountConfirm"))) return;
  try {
    await API.del("/api/profile");
    API.clearAuth();
    state.user = null;
    toast(t("accountDeleted"), "success");
    goHash("#/home");
  } catch (e) { toast(e.message, "error"); }
}



// ================= NOTIFICATIONS =================
async function refreshNotifBadge() {
  try {
    // 1. Unread notifications
    const r = await API.get("/api/notifications/unread-count");
    const b = document.getElementById("notifBadge");
    const sDot = document.getElementById("sidebarNotifDot");
    if (r && r.count > 0) { 
      b.textContent = r.count; 
      b.classList.remove("hidden"); 
      if (sDot) sDot.classList.remove("hidden");
    } else {
      b.classList.add("hidden");
      if (sDot) sDot.classList.add("hidden");
    }

    // Hide all other dot badges by default
    document.querySelectorAll("[id^='dot_']").forEach(el => el.classList.add("hidden"));

    if (!state || !state.user) return;

    // 2. Fetch bookings to highlight incoming/ongoing/history actions
    if (state.user.role === "LABOUR" || state.user.role === "EQUIPMENT_OWNER") {
      const bookings = await API.get("/api/bookings/provider");
      const hasIncoming = bookings.some(b => b.status === "PENDING");
      const hasOngoing = bookings.some(b => b.status === "ACCEPTED" || b.status === "ONGOING");
      
      const dotIncoming = document.getElementById("dot_incoming");
      const dotOngoing = document.getElementById("dot_ongoing");
      if (hasIncoming && dotIncoming) dotIncoming.classList.remove("hidden");
      if (hasOngoing && dotOngoing) dotOngoing.classList.remove("hidden");
    } else if (state.user.role === "FARMER") {
      const bookings = await API.get("/api/bookings/farmer");
      const hasAction = bookings.some(b => 
        b.status === "SUBMITTED" || 
        (b.status === "COMPLETED" && (!b.paid || !b.rating))
      );
      
      const dotHistory = document.getElementById("dot_bookingHistory");
      if (hasAction && dotHistory) dotHistory.classList.remove("hidden");
    }
  } catch { /* ignore */ }
}

async function openNotifications() {
  const list = await API.get("/api/notifications");
  openModal(`
    <div class="flex-between">
      <h2>${t("notifications")}</h2>
      <button class="btn secondary sm" onclick="markAllRead()">${t("markAllRead")}</button>
    </div>
    <div style="max-height:60vh;overflow-y:auto" class="mt">
      ${list.length ? list.map(n => `
        <div class="notif-item ${n.read ? "" : "unread"}">
          <div class="n-title">${esc(n.title)}</div>
          <div class="n-msg">${esc(n.message)}</div>
          <div class="n-time">${fmtDateTime(n.createdAt)}</div>
        </div>`).join("") : `<div class="empty">${t("noData")}</div>`}
    </div>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">${t("close")}</button></div>`);
  // mark them read on view
  try { await API.post("/api/notifications/read-all"); refreshNotifBadge(); } catch {}
}

async function markAllRead() {
  await API.post("/api/notifications/read-all");
  refreshNotifBadge();
  closeModal();
}

function fmtDateTime(s) {
  if (!s) return "";
  return String(s).replace("T", " ").substring(0, 16);
}

// ================= MODAL =================
function openModal(html) {
  document.getElementById("modalBox").innerHTML = html;
  document.getElementById("modalBack").classList.add("open");
}
function closeModal() {
  document.getElementById("modalBack").classList.remove("open");
}
document.addEventListener("click", e => {
  if (e.target.id === "modalBack") closeModal();
});

// poll notifications every 30s
setInterval(() => { if (state.user) refreshNotifBadge(); }, 30000);
