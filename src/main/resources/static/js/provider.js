// ================= LABOUR + EQUIPMENT OWNER PAGES =================
async function providerPage(page, v, role) {
  if (page === "dashboard") return providerDashboard(v, role);
  if (page === "myEquipment") return myEquipment(v);
  if (page === "incoming") return providerBookings(v, "incoming");
  if (page === "ongoing") return providerBookings(v, "ongoing");
  if (page === "completed") return providerBookings(v, "completed");
  if (page === "wallet") return providerWallet(v);
  if (page === "earnings") return providerEarnings(v);
  if (page === "profile") return profilePage(v);
}

// ================= WALLET (labour + equipment owner) =================
async function providerWallet(v) {
  const w = await API.get("/api/payments/provider/wallet");
  const payments = await API.get("/api/payments/provider");

  const ratingCard = w.avgRating != null
    ? `<div class="card mt" style="padding: 16px 20px; background: #fffde7; border: 1.5px solid #ffe082; border-left: 5px solid #fbc02d; border-radius: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i data-feather="star" style="width: 26px; height: 26px; color: #f57f17; fill: #fbc02d;"></i>
            <div>
              <div style="font-weight: 700; color: #f57f17; font-size: 16px;">${t("yourRating")}</div>
              <div style="font-size: 13px; color: #795548; margin-top: 2px;">${t("totalReviews")}: <b>${w.ratingCount}</b></div>
            </div>
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #e65100; display: flex; align-items: center; gap: 4px;">
            <span>⭐ ${w.avgRating}</span> <span style="font-size: 14px; font-weight: 500; color: #8d6e63;">/ 10</span>
          </div>
        </div>
        ${(w.equipmentRatings && w.equipmentRatings.length > 0)
          ? `<div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #ffe082;">
              <div style="font-size: 13px; font-weight: 700; color: #5d4037; margin-bottom: 8px;">${t("equipmentRatings")}:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${w.equipmentRatings.map(eq => `
                  <div style="background: #ffffff; padding: 7px 12px; border-radius: 6px; border: 1px solid #ffd54f; font-size: 12.5px; display: flex; align-items: center; gap: 6px;">
                    <i data-feather="tool" style="width: 14px; height: 14px; color: #e65100;"></i>
                    <b>${esc(eq.equipmentName)}:</b>
                    <span style="color: #e65100; font-weight: 700;">${eq.avgRating != null ? `⭐ ${eq.avgRating}/10 (${eq.ratingCount})` : t("noRatingsYet")}</span>
                  </div>
                `).join("")}
              </div>
            </div>`
          : ""}
      </div>`
    : `<div class="card mt" style="padding: 14px 18px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13.5px; color: #616161; display: flex; align-items: center; gap: 10px;">
        <i data-feather="star" style="width: 20px; height: 20px; color: #bdbdbd;"></i>
        <span><b>${t("yourRating")}:</b> ${t("noRatingsYet")}</span>
      </div>`;

  v.innerHTML = `
    <h1 class="page-title">${t("wallet")}</h1>
    <div class="wallet-balance card">
      <div class="wb-label">${t("balance")} (${t("points")})</div>
      <div class="wb-amount">${money(w.balance)}</div>
    </div>
    <div class="stats mt">
      ${stat(money(w.totalCommission), t("commissionTotal"))}
      ${stat(money(w.onlineCommission), t("commissionOnline"))}
      ${stat(money(w.cashSettlementDue), t("cashSettlement"))}
      ${stat(w.transactions, t("transaction"))}
    </div>
    ${w.cashSettlementDue > 0
      ? `<div class="settle-note">${t("settleNote")}: <b>${money(w.cashSettlementDue)}</b></div>`
      : ""}
    ${ratingCard}
    <h2 class="section mt">${t("paymentHistory")}</h2>
    ${paymentTable(payments, "provider")}`;

  if (typeof feather !== "undefined") feather.replace();
}

async function providerDashboard(v, role) {
  const bookings = await API.get("/api/bookings/provider");
  const earn = await API.get("/api/payments/provider/earnings");
  const counts = countByStatus(bookings);
  v.innerHTML = `
    <h1 class="page-title">${t("welcome")}, ${esc(state.user.name)} <span style="font-size: 13px; font-weight: normal; color: var(--gray-500); margin-left: 8px;">(${role === "LABOUR" ? "Labour" : "Equipment Owner"})</span></h1>
    <div class="stats">
      ${stat(counts.PENDING || 0, t("pending"))}
      ${stat((counts.ACCEPTED || 0) + (counts.ONGOING || 0), t("ongoing"))}
      ${stat(counts.COMPLETED || 0, t("completed"))}
      ${stat(money(earn.totalEarnings), t("totalEarnings"))}
    </div>
    ${role === "EQUIPMENT_OWNER" ? `<button class="btn" onclick="go('myEquipment')">${t("myEquipment")}</button>` : ""}
  `;
}

async function providerBookings(v, filter) {
  const all = await API.get("/api/bookings/provider");
  let list;
  let title;
  if (filter === "incoming") { list = all.filter(b => b.status === "PENDING" || b.status === "ACCEPTED"); title = t("incomingBookings"); }
  else if (filter === "ongoing") { list = all.filter(b => b.status === "ONGOING" || b.status === "SUBMITTED"); title = t("ongoingBookings"); }
  else { list = all.filter(b => b.status === "COMPLETED" || b.status === "REJECTED"); title = t("completedBookings"); }

  if (!list.length) { v.innerHTML = `<h1 class="page-title">${title}</h1><div class="empty">${t("noData")}</div>`; return; }

  v.innerHTML = `<h1 class="page-title">${title}</h1>
    <div class="table-wrap"><table>
    <thead><tr>
      <th>${t("farmer")}</th><th>${t("resource")}</th><th>${t("bookingType")}</th>
      <th>${t("date")}</th><th>${t("amount")}</th><th>${t("status")}</th><th>${t("action")}</th>
    </tr></thead><tbody>
    ${list.map(b => `<tr>
      <td>${esc(b.farmerName)}</td>
      <td>${esc(b.resourceName)}</td>
      <td>${t(typeKey(b.bookingType))}</td>
      <td>${fmtDate(b.startDate)}${b.endDate ? " → " + fmtDate(b.endDate) : ""}${b.startTime ? `<br><span class="muted">${b.startTime}${b.endTime ? "-" + b.endTime : ""}</span>` : ""}</td>
      <td>${money(b.amount)}</td>
      <td>
        <span class="badge ${b.status}">${t(b.status.toLowerCase())}</span>
        ${b.rejectionReason ? `<br><span class="badge REJECTED" style="margin-top:4px;display:inline-block;font-size:11px;">${t("changesRequested")}</span>` : ""}
      </td>
      <td><div class="actions-cell">
        <button class="btn secondary sm" onclick='viewBookingModal(${JSON.stringify(b)})'>${t("view")}</button>
        ${providerActions(b)}
      </div></td>
    </tr>`).join("")}
    </tbody></table></div>`;
}

function providerActions(b) {
  let btns = "";
  // location + call the farmer (so provider can reach the farm)
  const map = mapsLink(b.farmerLat, b.farmerLng);
  const contact =
    (map ? `<a class="btn secondary sm" href="${map}" target="_blank">${t("viewLocation")}</a> ` : "") +
    (b.farmerPhone ? `<a class="btn secondary sm" href="tel:${esc(b.farmerPhone)}">${t("call")}</a> ` : "");

  if (b.status === "PENDING") {
    btns += `<button class="btn sm" onclick="bkAction('${b.id}','accept')">${t("accept")}</button> `;
    btns += `<button class="btn danger sm" onclick="bkAction('${b.id}','reject')">${t("reject")}</button>`;
  } else if (b.status === "ACCEPTED") {
    btns += contact;
    btns += `<button class="btn blue sm" onclick="bkAction('${b.id}','start')">${t("start")}</button>`;
  } else if (b.status === "ONGOING") {
    btns += contact;
    btns += `<button class="btn amber sm" onclick='openSubmitModal(${JSON.stringify(b)})'>${t("submitWork")}</button>`;
  } else if (b.status === "SUBMITTED") {
    btns += contact;
    btns += `<span class="badge SUBMITTED">${t("waitingApproval")}</span> `;
    btns += `<button class="btn secondary sm" onclick='openSubmitModal(${JSON.stringify(b)})'>${t("submitWork")}</button>`;
  }
  return btns || "-";
}

async function bkAction(id, action) {
  try { await API.post(`/api/bookings/${id}/${action}`); toast(t("updated"), "success"); render(); }
  catch (e) { toast(e.message, "error"); }
}

// Provider uploads a work-completion photo (camera or gallery) for the farmer to approve.
let submitPhoto = null;
function openSubmitModal(b) {
  submitPhoto = null;
  const feedbackHtml = b.rejectionReason 
    ? `<div style="background:var(--red-100);color:var(--red-600);padding:12px;border-radius:var(--radius-sm);margin-bottom:14px;font-weight:600;">
        ${t("rejectionReason")}: ${esc(b.rejectionReason)}
       </div>`
    : "";
  openModal(`
    <h2>${t("submitWork")}: ${esc(b.resourceName)}</h2>
    ${feedbackHtml}
    <p class="muted">${t("workProof")}</p>
    <input type="file" accept="image/*" capture="environment" onchange="pickSubmitPhoto(this)" />
    <div id="submitPreview" class="mt"></div>
    <div class="modal-actions">
      <button class="btn secondary" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn" onclick="doSubmitWork('${b.id}')">${t("submitWork")}</button>
    </div>`);
}
function pickSubmitPhoto(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  readImageCompressed(f, 1000, dataUrl => {
    submitPhoto = dataUrl;
    document.getElementById("submitPreview").innerHTML =
      `<img src="${dataUrl}" style="width:100%;border-radius:10px" />`;
  });
}
async function doSubmitWork(id) {
  if (!submitPhoto) { toast(t("photoRequired"), "error"); return; }
  try {
    await API.post(`/api/bookings/${id}/submit`, { photo: submitPhoto });
    closeModal();
    toast(t("updated"), "success");
    render();
  } catch (e) { toast(e.message, "error"); }
}

async function providerEarnings(v) {
  const payments = await API.get("/api/payments/provider");
  const earn = await API.get("/api/payments/provider/earnings");
  v.innerHTML = `<h1 class="page-title">${t("earnings")}</h1>
    <div class="stats">${stat(money(earn.totalEarnings), t("totalEarnings"))}</div>
    ${paymentTable(payments, "provider")}`;
}

// ================= EQUIPMENT MANAGEMENT (owner) =================
async function myEquipment(v) {
  const list = await API.get("/api/equipment/mine");
  v.innerHTML = `
    <div class="flex-between">
      <h1 class="page-title">${t("myEquipment")}</h1>
      <button class="btn" onclick="openEquipModal()">${t("addEquipment")}</button>
    </div>
    ${!list.length ? `<div class="empty">${t("noData")}</div>` :
      `<div class="grid">${list.map(ownerEquipCard).join("")}</div>`}`;
}

function ownerEquipCard(e) {
  const img = (e.photos && e.photos[0]) ? `<img class="thumb" src="${esc(e.photos[0])}" onerror="this.style.display='none'"/>` : `<div class="thumb"></div>`;
  return `<div class="card">
    ${img}
    <h3>${esc(e.name)}</h3>
    <div class="muted">${esc(e.categoryName || "")}</div>
    <div class="price">${rateLines(e)}</div>
    <div class="mt">
      <span class="badge ${e.available ? "COMPLETED" : "REJECTED"}">${e.available ? t("available") : t("notAvailable")}</span>
    </div>
    <div class="row mt">
      <button class="btn secondary sm" onclick='openEquipModal(${JSON.stringify(e)})'>${t("edit")}</button>
      <button class="btn danger sm" onclick="deleteEquip('${e.id}')">${t("delete")}</button>
    </div>
  </div>`;
}

function openEquipModal(eq) {
  const isEdit = !!eq;
  const cats = state.categories.EQUIPMENT;
  openModal(`
    <h2>${isEdit ? t("editEquipment") : t("addEquipment")}</h2>
    <div class="field"><label>${t("equipmentName")}</label><input id="eq_name" value="${isEdit ? esc(eq.name) : ""}" /></div>
    <div class="field"><label>${t("category")}</label>
      <select id="eq_cat">${cats.map(c => `<option value="${c.id}" ${isEdit && eq.categoryId === c.id ? "selected" : ""}>${esc(catLabel(c))}</option>`).join("")}</select>
    </div>
    <div class="field"><label>${t("description")}</label><textarea id="eq_desc">${isEdit ? esc(eq.description || "") : ""}</textarea></div>
    <div class="row">
      <div class="field"><label>${t("ratePerHour")}</label><input id="eq_rateHour" type="number" value="${isEdit ? (eq.ratePerHour || "") : ""}" /></div>
      <div class="field"><label>${t("ratePerDay")}</label><input id="eq_rateDay" type="number" value="${isEdit ? (eq.ratePerDay || "") : ""}" /></div>
    </div>
    <div class="field"><label>${t("ratePerVigha")}</label><input id="eq_rateVigha" type="number" value="${isEdit ? (eq.ratePerVigha || "") : ""}" /></div>
    <div class="field">
      <label>${t("photos")}</label>
      <input type="file" accept="image/*" capture="environment" multiple onchange="pickEquipPhotos(this)" />
      <div id="eq_preview" class="photo-preview mt"></div>
    </div>
    <div class="field"><label><input type="checkbox" id="eq_avail" style="width:auto" ${(!isEdit || eq.available) ? "checked" : ""} /> ${t("available")}</label></div>
    <div class="modal-actions">
      <button class="btn secondary" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn" onclick="submitEquip(${isEdit ? `'${eq.id}'` : "null"})">${t("save")}</button>
    </div>`);
  // start with existing photos (from gallery/camera or old URLs) and let owner add more
  equipPhotos = (isEdit && eq.photos) ? eq.photos.slice() : [];
  drawEquipPreview();
}

// photos being edited (base64 data-URIs). Owner can pick from gallery or take a picture.
let equipPhotos = [];
function pickEquipPhotos(input) {
  const files = [...(input.files || [])];
  let pending = files.length;
  files.forEach(f => readImageCompressed(f, 900, dataUrl => {
    equipPhotos.push(dataUrl);
    if (--pending <= 0) drawEquipPreview();
    else drawEquipPreview();
  }));
  input.value = "";
}
function drawEquipPreview() {
  const box = document.getElementById("eq_preview");
  if (!box) return;
  box.innerHTML = equipPhotos.map((p, i) =>
    `<div class="photo-thumb" style="display:inline-block; position:relative; margin:6px; border:1px solid var(--gray-300); border-radius:6px; overflow:hidden; width:80px; height:80px; vertical-align:top;">
       <img src="${p}" style="width:100%; height:100%; object-fit:cover;" />
       <button type="button" class="photo-x" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:50%; width:16px; height:16px; font-size:10px; cursor:pointer; line-height:16px; padding:0; text-align:center;" onclick="equipPhotos.splice(${i},1);drawEquipPreview()">×</button>
     </div>`).join("") || `<div class="muted">${t("selectPhoto")}</div>`;
}

async function submitEquip(id) {
  const body = {
    name: val("eq_name"),
    categoryId: val("eq_cat"),
    description: val("eq_desc"),
    ratePerHour: numVal("eq_rateHour"),
    ratePerDay: numVal("eq_rateDay"),
    ratePerVigha: numVal("eq_rateVigha"),
    available: document.getElementById("eq_avail").checked,
    photos: equipPhotos,
  };
  if (!body.name) { toast(t("equipmentName") + " ?", "error"); return; }
  try {
    if (id) await API.put(`/api/equipment/${id}`, body);
    else await API.post("/api/equipment", body);
    closeModal();
    toast(t("updated"), "success");
    myEquipment(document.getElementById("view"));
  } catch (e) { toast(e.message, "error"); }
}

async function deleteEquip(id) {
  if (!confirm(t("confirmDelete"))) return;
  try { await API.del(`/api/equipment/${id}`); toast(t("updated"), "success"); myEquipment(document.getElementById("view")); }
  catch (e) { toast(e.message, "error"); }
}
