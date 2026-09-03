// ================= ADMIN PAGES =================
async function adminPage(page, v) {
  switch (page) {
    case "dashboard": return adminDashboard(v);
    case "farmers": return adminUsers(v, "FARMER", t("manageFarmers"));
    case "labour": return adminUsers(v, "LABOUR", t("manageLabour"));
    case "owners": return adminUsers(v, "EQUIPMENT_OWNER", t("manageOwners"));
    case "workCat": return adminCategories(v, "WORK", t("manageWorkCat"));
    case "equipCat": return adminCategories(v, "EQUIPMENT", t("manageEquipCat"));
    case "adminEquipment": return adminEquipment(v);
    case "adminBookings": return adminBookings(v);
    case "adminPayments": return adminPayments(v);
    case "adminRatings": return adminRatings(v);
    case "reports": return adminReports(v);
    case "settings": return adminSettings(v);
    case "broadcast": return adminBroadcast(v);
  }
}


async function adminDashboard(v) {
  const d = await API.get("/api/admin/dashboard");
  v.innerHTML = `
    <h1 class="page-title">${t("dashboard")} <span style="font-size: 13px; font-weight: normal; color: var(--gray-500); margin-left: 8px;">(Admin)</span></h1>
    <div class="stats">
      ${stat(d.farmers, t("manageFarmers"))}
      ${stat(d.labour, t("manageLabour"))}
      ${stat(d.equipmentOwners, t("manageOwners"))}
      ${stat(d.equipmentCount, t("myEquipment"))}
      ${stat(d.totalBookings, t("bookingHistory"))}
      ${stat(d.pendingBookings, t("pending"))}
      ${stat(d.completedBookings, t("completed"))}
      ${stat(money(d.totalRevenue), t("totalRevenue"))}
      ${stat(money(d.totalCommission), t("totalCommission"))}
    </div>`;
}

async function adminUsers(v, role, title) {
  const users = await API.get("/api/admin/users?role=" + role);
  v.innerHTML = `<h1 class="page-title">${title}</h1>` +
    (!users.length ? `<div class="empty">${t("noData")}</div>` :
    `<div class="table-wrap"><table>
      <thead><tr><th>${t("name")}</th><th>${t("email")}</th><th>${t("phone")}</th><th>${t("status")}</th><th>${t("action")}</th></tr></thead>
      <tbody>${users.map(u => `<tr>
        <td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone || "-")}</td>
        <td>
          <span class="badge ${u.active ? "COMPLETED" : "REJECTED"}">${u.active ? t("active") : t("blocked")}</span>
          ${u.role === "LABOUR" ? `<br><span class="badge ${u.available ? "COMPLETED" : "REJECTED"}" style="margin-top:4px;display:inline-block">${u.available ? t("available") : t("notAvailable")}</span>` : ""}
        </td>
        <td><div class="actions-cell">
          <button class="btn secondary sm" onclick='viewUserModal(${JSON.stringify(u)})'>${t("view")}</button>
          <button class="btn ${u.active ? "danger" : ""} sm" onclick="toggleUser('${u.id}', ${!u.active})">${u.active ? t("block") : t("unblock")}</button>
          <button class="btn secondary sm" onclick="delUser('${u.id}')">${t("delete")}</button>
        </div></td></tr>`).join("")}</tbody></table></div>`);
}

async function toggleUser(id, active) {
  try { await API.patch(`/api/admin/users/${id}/active?active=${active}`); toast(t("updated"), "success"); render(); }
  catch (e) { toast(e.message, "error"); }
}
async function delUser(id) {
  if (!confirm(t("confirmDelete"))) return;
  try { await API.del(`/api/admin/users/${id}`); toast(t("updated"), "success"); render(); }
  catch (e) { toast(e.message, "error"); }
}

async function adminCategories(v, type, title) {
  const cats = await API.get("/api/admin/categories?type=" + type);
  v.innerHTML = `
    <div class="flex-between">
      <h1 class="page-title">${title}</h1>
      <button class="btn" onclick="openCatModal('${type}')">${t("add")}</button>
    </div>
    ${!cats.length ? `<div class="empty">${t("noData")}</div>` :
      `<div class="table-wrap"><table>
        <thead><tr><th>${t("categoryName")}</th><th>${t("status")}</th><th>${t("action")}</th></tr></thead>
        <tbody>${cats.map(c => `<tr>
          <td>${esc(catLabel(c))}${c.nameGu || c.nameHi ? ` <span class="muted">(${esc(c.name)})</span>` : ""}</td>
          <td><span class="badge ${c.active ? "COMPLETED" : "REJECTED"}">${c.active ? t("active") : t("blocked")}</span></td>
          <td><div class="actions-cell">
            <button class="btn secondary sm" onclick='openCatModal("${type}", ${JSON.stringify(c)})'>${t("edit")}</button>
            <button class="btn danger sm" onclick="delCat('${c.id}')">${t("delete")}</button>
          </div></td></tr>`).join("")}</tbody></table></div>`}`;
}

function openCatModal(type, cat) {
  const isEdit = !!cat;
  openModal(`
    <h2>${isEdit ? t("edit") : t("add")} — ${type === "WORK" ? t("manageWorkCat") : t("manageEquipCat")}</h2>
    <p class="muted">${t("catLangHint")}</p>
    <div class="field"><label>${t("categoryName")} — English</label><input id="cat_name" value="${isEdit ? esc(cat.name || "") : ""}" placeholder="Tractor" /></div>
    <div class="field"><label>${t("categoryName")} — ગુજરાતી</label><input id="cat_nameGu" value="${isEdit ? esc(cat.nameGu || "") : ""}" placeholder="ટ્રેક્ટર" /></div>
    <div class="field"><label>${t("categoryName")} — हिंदी</label><input id="cat_nameHi" value="${isEdit ? esc(cat.nameHi || "") : ""}" placeholder="ट्रैक्टर" /></div>
    ${isEdit ? `<div class="field"><label><input type="checkbox" id="cat_active" style="width:auto" ${cat.active ? "checked" : ""}/> ${t("active")}</label></div>` : ""}
    <div class="modal-actions">
      <button class="btn secondary" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn" onclick="submitCat('${type}', ${isEdit ? `'${cat.id}'` : "null"})">${t("save")}</button>
    </div>`);
}

async function submitCat(type, id) {
  const body = {
    name: val("cat_name"),
    nameGu: val("cat_nameGu"),
    nameHi: val("cat_nameHi"),
    type,
    active: id ? document.getElementById("cat_active").checked : true,
  };
  if (!body.name) { toast(t("categoryName") + " ?", "error"); return; }
  try {
    if (id) await API.put(`/api/admin/categories/${id}`, body);
    else await API.post("/api/admin/categories", body);
    closeModal();
    await loadCategories();
    toast(t("updated"), "success");
    render();
  } catch (e) { toast(e.message, "error"); }
}
async function delCat(id) {
  if (!confirm(t("confirmDelete"))) return;
  try { await API.del(`/api/admin/categories/${id}`); await loadCategories(); toast(t("updated"), "success"); render(); }
  catch (e) { toast(e.message, "error"); }
}

async function adminEquipment(v) {
  const list = await API.get("/api/admin/equipment");
  v.innerHTML = `<h1 class="page-title">${t("myEquipment")}</h1>` +
    (!list.length ? `<div class="empty">${t("noData")}</div>` :
    `<div class="table-wrap"><table>
      <thead><tr><th>${t("equipmentName")}</th><th>${t("category")}</th><th>${t("rate")}</th><th>${t("availability")}</th><th>${t("action")}</th></tr></thead>
      <tbody>${list.map(e => `<tr>
        <td>${esc(e.name)}</td><td>${esc(e.categoryName || "-")}</td>
        <td>${rateLines(e)}</td>
        <td><span class="badge ${e.available ? "COMPLETED" : "REJECTED"}">${e.available ? t("available") : t("notAvailable")}</span></td>
        <td><button class="btn danger sm" onclick="adminDelEquip('${e.id}')">${t("delete")}</button></td>
      </tr>`).join("")}</tbody></table></div>`);
}
async function adminDelEquip(id) {
  if (!confirm(t("confirmDelete"))) return;
  try { await API.del(`/api/admin/equipment/${id}`); toast(t("updated"), "success"); render(); }
  catch (e) { toast(e.message, "error"); }
}

async function adminBookings(v) {
  const list = await API.get("/api/admin/bookings");
  v.innerHTML = `<h1 class="page-title">${t("manageBookings")}</h1>` +
    (!list.length ? `<div class="empty">${t("noData")}</div>` :
    `<div class="table-wrap"><table>
      <thead><tr><th>${t("farmer")}</th><th>${t("resource")}</th><th>${t("provider")}</th><th>${t("bookingType")}</th><th>${t("date")}</th><th>${t("amount")}</th><th>${t("status")}</th><th>${t("action")}</th></tr></thead>
      <tbody>${list.map(b => `<tr>
        <td>${esc(b.farmerName)}</td><td>${esc(b.resourceName)}</td><td>${esc(b.providerName)}</td>
        <td>${t(typeKey(b.bookingType))}</td>
        <td>${fmtDate(b.startDate)}${b.endDate ? " → " + fmtDate(b.endDate) : ""}</td>
        <td>${money(b.amount)}</td>
        <td><span class="badge ${b.status}">${t(b.status.toLowerCase())}</span></td>
        <td><button class="btn secondary sm" onclick='viewBookingModal(${JSON.stringify(b)})'>${t("view")}</button></td>
      </tr>`).join("")}</tbody></table></div>`);
}

async function adminPayments(v) {
  const list = await API.get("/api/admin/payments");
  v.innerHTML = `<h1 class="page-title">${t("managePayments")}</h1>` +
    (!list.length ? `<div class="empty">${t("noData")}</div>` :
    `<div class="table-wrap"><table>
      <thead><tr><th>${t("transaction")}</th><th>${t("farmer")}</th><th>${t("provider")}</th><th>${t("amount")}</th><th>${t("commissionAmt")}</th><th>${t("yourEarning")}</th><th>${t("method")}</th><th>${t("status")}</th><th>${t("date")}</th><th>${t("action")}</th></tr></thead>
      <tbody>${list.map(p => `<tr>
        <td>${esc(p.transactionRef)}</td><td>${esc(p.farmerName || "-")}</td><td>${esc(p.providerName)}</td>
        <td>${money(p.amount)}</td><td>${money(p.commission)}</td><td>${money(p.providerEarning)}</td>
        <td>${t(p.method.toLowerCase())}</td>
        <td><span class="badge ${p.status}">${p.status}</span></td>
        <td>${fmtDate(p.createdAt)}</td>
        <td><button class="btn secondary sm" onclick='viewPaymentModal(${JSON.stringify(p)})'>${t("view")}</button></td>
      </tr>`).join("")}</tbody></table></div>`);
}

async function adminReports(v) {
  const r = await API.get("/api/admin/reports");
  const byStatus = r.bookingsByStatus || {};
  v.innerHTML = `
    <h1 class="page-title">${t("reports")}</h1>
    <div class="section">
      <h2>${t("overview")}</h2>
      <div class="stats">
        ${stat(money(r.totalRevenue), t("totalRevenue"))}
        ${stat(money(r.totalCommission), t("totalCommission"))}
        ${stat(money(r.totalProviderPayouts), t("earnings"))}
        ${stat(r.cashPayments, t("cash"))}
        ${stat(r.onlinePayments, t("online"))}
      </div>
    </div>
    <div class="section">
      <h2>${t("bookingHistory")} — ${t("status")}</h2>
      <div class="stats">
        ${Object.keys(byStatus).map(s => stat(byStatus[s], t(s.toLowerCase()))).join("")}
      </div>
    </div>
    <div class="section">
      <h2>${t("resource")}</h2>
      <div class="stats">
        ${stat((r.bookingsByResource || {}).LABOUR || 0, t("labour"))}
        ${stat((r.bookingsByResource || {}).EQUIPMENT || 0, t("equipmentOwner"))}
      </div>
    </div>`;
}

async function adminSettings(v) {
  const s = await API.get("/api/admin/settings");
  v.innerHTML = `
    <h1 class="page-title">${t("settings")}</h1>
    <div class="card" style="max-width:420px">
      <div class="field"><label>${t("commissionHour")}</label>
        <input id="set_comm_h" type="number" step="0.1" value="${s.commissionPercentHour ?? 10}" />
      </div>
      <div class="field"><label>${t("commissionDay")}</label>
        <input id="set_comm_d" type="number" step="0.1" value="${s.commissionPercentDay ?? 10}" />
      </div>
      <div class="field"><label>${t("commissionVigha")}</label>
        <input id="set_comm_v" type="number" step="0.1" value="${s.commissionPercentVigha ?? 10}" />
      </div>
      <button class="btn" onclick="saveSettings()">${t("save")}</button>
    </div>`;
}
async function saveSettings() {
  try {
    await API.put("/api/admin/settings", {
      commissionPercentHour: numVal("set_comm_h"),
      commissionPercentDay: numVal("set_comm_d"),
      commissionPercentVigha: numVal("set_comm_v"),
    });
    toast(t("updated"), "success");
  } catch (e) { toast(e.message, "error"); }
}

async function adminBroadcast(v) {
  v.innerHTML = `
    <h1 class="page-title">${t("broadcast")}</h1>
    <div class="card" style="max-width:520px">
      <div class="field"><label>${t("role")}</label>
        <select id="bc_role">
          <option value="">${t("all")}</option>
          <option value="FARMER">${t("farmer")}</option>
          <option value="LABOUR">${t("labour")}</option>
          <option value="EQUIPMENT_OWNER">${t("equipmentOwner")}</option>
        </select>
      </div>
      <div class="field"><label>${t("title")}</label><input id="bc_title" /></div>
      <div class="field"><label>${t("message")}</label><textarea id="bc_msg"></textarea></div>
      <button class="btn" onclick="sendBroadcast()">${t("send")}</button>
    </div>`;
}
async function sendBroadcast() {
  const body = { role: val("bc_role") || null, title: val("bc_title"), message: val("bc_msg") };
  if (!body.message) { toast(t("message") + " ?", "error"); return; }
  try {
    const r = await API.post("/api/admin/notify", body);
    toast(t("send") + " ✓ (" + r.sent + ")", "success");
  } catch (e) { toast(e.message, "error"); }
}

async function adminRatings(v) {
  const list = await API.get("/api/admin/ratings");
  v.innerHTML = `<h1 class="page-title">${t("ratings")}</h1>` +
    (!list.length ? `<div class="empty">${t("noData")}</div>` :
    `<div class="table-wrap"><table>
      <thead><tr><th>${t("farmer")}</th><th>${t("bookingType") + " ID"}</th><th>${t("provider")}</th><th>${t("rate")}</th><th>${t("description")}</th><th>${t("date")}</th><th>${t("action")}</th></tr></thead>
      <tbody>${list.map(r => `<tr>
        <td>${esc(r.farmerName)}</td>
        <td>#${r.bookingId}</td>
        <td>${esc(r.targetName)}</td>
        <td><span style="color:#fbc02d;font-weight:bold">${r.rating}/10</span></td>
        <td>${esc(r.review || "-")}</td>
        <td>${fmtDate(r.createdAt)}</td>
        <td><button class="btn secondary sm" onclick='viewRatingModal(${JSON.stringify(r)})'>${t("view")}</button></td>
      </tr>`).join("")}</tbody></table></div>`);
}

// ---- View Detail Modals ----
function viewBookingModal(b) {
  openModal(`
    <h2>${t("bookingHistory")} #${b.id || ""}</h2>
    <div class="field"><label>${t("farmer")}</label><div>${esc(b.farmerName)}</div></div>
    <div class="field"><label>${t("resource")}</label><div>${esc(b.resourceName)}</div></div>
    <div class="field"><label>${t("provider")}</label><div>${esc(b.providerName)}</div></div>
    <div class="field"><label>${t("bookingType")}</label><div>${t(typeKey(b.bookingType))}</div></div>
    <div class="row">
      <div class="field"><label>${t("startDate")}</label><div>${fmtDate(b.startDate)}</div></div>
      ${b.endDate ? `<div class="field"><label>${t("endDate")}</label><div>${fmtDate(b.endDate)}</div></div>` : ""}
    </div>
    ${b.startTime ? `<div class="field"><label>${t("arrivalTime")}</label><div>${b.startTime}${b.endTime ? " - " + b.endTime : ""}</div></div>` : ""}
    <div class="row">
      <div class="field"><label>${t("rateUnit")}</label><div>${b.rateUnit || "-"}</div></div>
      <div class="field"><label>${t("quantity")}</label><div>${b.quantity || "-"}</div></div>
    </div>
    <div class="field"><label>${t("amount")}</label><div class="price">${money(b.amount)}</div></div>
    <div class="field"><label>${t("status")}</label><div><span class="badge ${b.status}">${t(b.status.toLowerCase())}</span></div></div>
    ${b.rejectionReason ? `<div class="field" style="color:var(--red-600);"><label>${t("rejectionReason")}</label><div><b>${esc(b.rejectionReason)}</b></div></div>` : ""}
    ${b.notes ? `<div class="field"><label>${t("notes")}</label><div>${esc(b.notes)}</div></div>` : ""}
    ${b.completionPhoto ? `<div class="field"><label>${t("workProof")}</label><img src="${b.completionPhoto}" style="width:100%;border-radius:10px;margin-top:4px"/></div>` : ""}
    <div class="modal-actions"><button class="btn secondary" onclick="closeModal()">${t("close")}</button></div>
  `);
}

function viewPaymentModal(p) {
  openModal(`
    <h2>${t("paymentHistory")} — ${esc(p.transactionRef)}</h2>
    <div class="field"><label>${t("transaction")}</label><div>${esc(p.transactionRef)}</div></div>
    <div class="row">
      <div class="field"><label>${t("farmer")}</label><div>${esc(p.farmerName || "-")}</div></div>
      <div class="field"><label>${t("provider")}</label><div>${esc(p.providerName)}</div></div>
    </div>
    <div class="field"><label>${t("amount")}</label><div class="price">${money(p.amount)}</div></div>
    <div class="row">
      <div class="field"><label>${t("commissionAmt")}</label><div>${money(p.commission)}</div></div>
      <div class="field"><label>${t("yourEarning")}</label><div>${money(p.providerEarning)}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>${t("method")}</label><div>${t(p.method.toLowerCase())}</div></div>
      <div class="field"><label>${t("status")}</label><div><span class="badge ${p.status}">${p.status}</span></div></div>
    </div>
    <div class="field"><label>${t("date")}</label><div>${fmtDate(p.createdAt)}</div></div>
    <div class="modal-actions"><button class="btn secondary" onclick="closeModal()">${t("close")}</button></div>
  `);
}

function viewRatingModal(r) {
  openModal(`
    <h2>${t("ratings")} — ${t("view")}</h2>
    <div class="field"><label>${t("farmer")}</label><div>${esc(r.farmerName)}</div></div>
    <div class="field"><label>${t("provider")}</label><div>${esc(r.targetName)}</div></div>
    <div class="field"><label>${t("bookingType")} ID</label><div>#${r.bookingId}</div></div>
    <div class="field"><label>${t("rate")}</label><div style="font-size:28px;color:#fbc02d;font-weight:bold">${r.rating}/10</div></div>
    <div class="field"><label>${t("review")}</label><div>${esc(r.review || "-")}</div></div>
    <div class="field"><label>${t("date")}</label><div>${fmtDate(r.createdAt)}</div></div>
    <div class="modal-actions"><button class="btn secondary" onclick="closeModal()">${t("close")}</button></div>
  `);
}

function formatRoleName(r) {
  if (r === "FARMER") return t("farmer");
  if (r === "LABOUR") return t("labour");
  if (r === "EQUIPMENT_OWNER") return t("equipmentOwner");
  return r;
}

function viewUserModal(u) {
  let extraHtml = "";
  if (u.role === "FARMER") {
    extraHtml = `<div class="field"><label>${t("farmSize")}</label><div>${u.farmSizeVigha || "-"} vigha</div></div>`;
  } else if (u.role === "LABOUR") {
    const skillsList = (u.skills || []).map(s => `<span class="tag" style="background:var(--gray-200);color:var(--gray-700);padding:4px 8px;border-radius:4px;font-size:12px;margin-right:4px;display:inline-block;">${esc(skillName(s))}</span>`).join(" ");
    extraHtml = `
      <div class="field" style="margin-top:12px"><label>${t("skills")}</label><div style="margin-top:4px">${skillsList || "-"}</div></div>
      <div class="field"><label>${t("rate")}</label>
        <div>
          ${u.ratePerHour ? `<b>₹${u.ratePerHour}</b> / ${t("hour")} · ` : ""}
          ${u.ratePerDay ? `<b>₹${u.ratePerDay}</b> / ${t("day")} · ` : ""}
          ${u.ratePerVigha ? `<b>₹${u.ratePerVigha}</b> / ${t("vigha")}` : ""}
        </div>
      </div>
      <div class="field"><label>${t("availability")}</label><div><span class="badge ${u.available ? "COMPLETED" : "REJECTED"}">${u.available ? t("available") : t("notAvailable")}</span></div></div>`;
  }

  openModal(`
    <h2>${t("profile")} — ${formatRoleName(u.role)}</h2>
    <div class="field"><label>${t("name")}</label><div><b>${esc(u.name)}</b></div></div>
    <div class="field"><label>${t("email")}</label><div>${esc(u.email)}</div></div>
    <div class="field"><label>${t("phone")}</label><div>${esc(u.phone || "-")}</div></div>
    <div class="row">
      <div class="field"><label>${t("village")}</label><div>${esc(u.village || "-")}</div></div>
      <div class="field"><label>${t("district")}</label><div>${esc(u.district || "-")}</div></div>
    </div>
    ${extraHtml}
    <div class="modal-actions" style="margin-top:16px"><button class="btn secondary" onclick="closeModal()">${t("close")}</button></div>
  `);
}
