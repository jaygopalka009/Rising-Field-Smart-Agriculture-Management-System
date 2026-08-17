// ================= FARMER PAGES =================
async function farmerPage(page, v) {
  if (page === "dashboard") return farmerDashboard(v);
  if (page === "bookLabour") return browseCatalog(v, "LABOUR");
  if (page === "bookEquipment") return browseCatalog(v, "EQUIPMENT");
  if (page === "bookingHistory") return farmerBookings(v);
  if (page === "paymentHistory") return farmerPayments(v);
  if (page === "profile") return profilePage(v);
}

async function farmerDashboard(v) {
  const bookings = (await API.get("/api/bookings/farmer")) || [];
  const payments = (await API.get("/api/payments/farmer")) || [];
  const spent = Array.isArray(payments) ? payments.reduce((s, p) => s + (p.amount || 0), 0) : 0;
  const counts = countByStatus(Array.isArray(bookings) ? bookings : []);
  const userName = (state.user && state.user.name) ? state.user.name : "Jay Patel";
  v.innerHTML = `
    <h1 class="page-title">${t("welcome")}, ${esc(userName)} <span style="font-size: 13px; font-weight: normal; color: var(--gray-500); margin-left: 8px;">(${t("farmer")})</span></h1>
    <div class="stats">
      ${stat(bookings.length, t("bookingHistory"))}
      ${stat(counts.PENDING || 0, t("pending"))}
      ${stat(counts.COMPLETED || 0, t("completed"))}
      ${stat(money(spent), t("paymentHistory"))}
    </div>
    <div class="row">
      <button class="btn" onclick="go('bookLabour')">${t("bookLabour")}</button>
      <button class="btn blue" onclick="go('bookEquipment')">${t("bookEquipment")}</button>
    </div>`;
}

// catalog items currently on screen, by id (used by profile + book buttons)
let catalogCache = {};

async function browseCatalog(v, type, village) {
  const q = village ? "?village=" + encodeURIComponent(village) : "";
  const items = type === "LABOUR"
    ? await API.get("/api/catalog/labour" + q)
    : await API.get("/api/catalog/equipment" + q);
  catalogCache = {};
  items.forEach(it => { catalogCache[it.id] = it; });
  const title = type === "LABOUR" ? t("bookLabour") : t("bookEquipment");

  // village search bar (shown on both labour and equipment catalogs)
  const searchBar = `
    <div class="row" style="max-width:480px;margin-bottom:14px">
      <input id="cat_village" placeholder="${t("searchVillage")}" value="${esc(village || "")}"
        onkeydown="if(event.key==='Enter')searchCatalog('${type}')" />
      <button class="btn sm" onclick="searchCatalog('${type}')">${t("search")}</button>
      ${village ? `<button class="btn secondary sm" onclick="searchCatalog('${type}', true)">${t("clear")}</button>` : ""}
    </div>`;

  const list = !items.length
    ? `<div class="empty">${t("noData")}</div>`
    : `<div class="grid">${items.map(it => type === "LABOUR" ? labourCard(it) : equipCard(it)).join("")}</div>`;
  v.innerHTML = `<h1 class="page-title">${title}</h1>${searchBar}${list}`;
}

function searchCatalog(type, clear) {
  const v = document.getElementById("view");
  const village = clear ? "" : val("cat_village");
  browseCatalog(v, type, village);
}

function labourCard(l) {
  const skills = (l.skills || []).map(s => `<span class="tag">${esc(skillName(s))}</span>`).join("");
  const ratingHtml = l.avgRating ? ` <span style="color:#fbc02d;font-weight:bold;font-size:0.95rem">Rating: ${l.avgRating}/10 (${l.ratingCount})</span>` : "";
  return `<div class="card">
    <h3>${esc(l.name)}${ratingHtml}</h3>
    <div class="muted">${t("location")}: ${esc(l.village || "-")}, ${esc(l.district || "-")}</div>
    ${l.phone ? `<div class="muted">${t("phone")}: <a href="tel:${esc(l.phone)}">${esc(l.phone)}</a></div>` : ""}
    <div class="mt">${skills || '<span class="muted">-</span>'}</div>
    ${busyLine(l)}
    <div class="price">${rateLines(l)}</div>
    <div class="row mt">
      <button class="btn secondary sm" onclick="openLabourProfile('${l.id}')">${t("profile")}</button>
      <button class="btn sm" onclick="bookFromCache('${l.id}','LABOUR')">${t("book")}</button>
    </div>
  </div>`;
}

// "Not available - free after 16:00 / from 2026-07-21" line for busy resources
function busyLine(it) {
  if (!it.busy) return "";
  let when = "";
  if (it.busyUntilTime) when = `${t("freeAfter")} ${it.busyUntilTime}`;
  else if (it.availableFrom) when = `${t("availableFromLbl")}: ${it.availableFrom}`;
  return `<div class="mt"><span class="badge REJECTED">${t("notAvailable")}</span>
    ${when ? `<span class="muted"> ${when}</span>` : ""}</div>`;
}

// full saved profile of a labour (what work they do, rates, location) before booking
function openLabourProfile(id) {
  const l = catalogCache[id];
  if (!l) return;
  const skills = (l.skills || []).map(s => `<span class="tag">${esc(skillName(s))}</span>`).join("");
  const ratingHtml = l.avgRating ? ` <span style="color:#fbc02d;font-weight:bold;font-size:1.1rem">Rating: ${l.avgRating}/10 (${l.ratingCount})</span>` : "";
  openModal(`
    <h2>${esc(l.name)}${ratingHtml}</h2>
    <div class="muted">${t("village")}: ${esc(l.village || "-")} · ${t("district")}: ${esc(l.district || "-")}</div>
    ${l.phone ? `<div class="muted">${t("phone")}: <a href="tel:${esc(l.phone)}">${esc(l.phone)}</a></div>` : ""}
    <h3 class="mt">${t("skills")}</h3>
    <div>${skills || `<span class="muted">${t("noData")}</span>`}</div>
    <h3 class="mt">${t("rate")}</h3>
    <div class="price">${rateLines(l)}</div>
    <div class="modal-actions mt">
      <button class="btn secondary" onclick="closeModal()">${t("close")}</button>
      <button class="btn" onclick="closeModal();bookFromCache('${l.id}','LABOUR')">${t("book")}</button>
    </div>`);
}

// full saved details of an equipment (photos, description, owner) before booking
function openEquipProfile(id) {
  const e = catalogCache[id];
  if (!e) return;
  const photos = (e.photos || []).map(p =>
    `<img src="${esc(p)}" style="width:100%;border-radius:10px;margin:6px 0" onerror="this.style.display='none'"/>`).join("");
  const ratingHtml = e.avgRating ? ` <span style="color:#fbc02d;font-weight:bold;font-size:1.1rem">Rating: ${e.avgRating}/10 (${e.ratingCount})</span>` : "";
  openModal(`
    <h2>${esc(e.name)}${ratingHtml}</h2>
    <div class="muted">${esc(e.categoryName || "")}</div>
    ${photos}
    <p>${esc(e.description || "")}</p>
    ${e.ownerPhone ? `<div class="muted">${t("phone")}: <a href="tel:${esc(e.ownerPhone)}">${esc(e.ownerPhone)}</a></div>` : ""}
    <h3 class="mt">${t("rate")}</h3>
    <div class="price">${rateLines(e)}</div>
    <div class="modal-actions mt">
      <button class="btn secondary" onclick="closeModal()">${t("close")}</button>
      <button class="btn" onclick="closeModal();bookFromCache('${e.id}','EQUIPMENT')">${t("book")}</button>
    </div>`);
}

// open the booking modal for a cached catalog item
function bookFromCache(id, type) {
  const it = catalogCache[id];
  if (!it) return;
  openBookModal({
    resourceType: type, resourceId: it.id, resourceName: it.name,
    ratePerHour: it.ratePerHour, ratePerDay: it.ratePerDay, ratePerVigha: it.ratePerVigha,
  });
}

// "₹100 / Hour · ₹500 / Day · ₹800 / Vigha" — shows only the rates the provider set
function rateLines(o) {
  const parts = [];
  if (o.ratePerHour) parts.push(`${money(o.ratePerHour)} / ${t("hour")}`);
  if (o.ratePerDay) parts.push(`${money(o.ratePerDay)} / ${t("day")}`);
  if (o.ratePerVigha) parts.push(`${money(o.ratePerVigha)} / ${t("vigha")}`);
  return parts.length ? parts.join(" · ") : "-";
}

function equipCard(e) {
  const img = (e.photos && e.photos[0]) ? `<img class="thumb" src="${esc(e.photos[0])}" onerror="this.style.display='none'"/>` : `<div class="thumb"></div>`;
  const ratingHtml = e.avgRating ? ` <span style="color:#fbc02d;font-weight:bold;font-size:0.95rem">Rating: ${e.avgRating}/10 (${e.ratingCount})</span>` : "";
  return `<div class="card">
    ${img}
    <h3>${esc(e.name)}${ratingHtml}</h3>
    <div class="muted">${esc(e.categoryName || "")}</div>
    ${e.village ? `<div class="muted">${t("location")}: ${esc(e.village)}, ${esc(e.district || "-")}</div>` : ""}
    ${e.ownerPhone ? `<div class="muted">${t("phone")}: <a href="tel:${esc(e.ownerPhone)}">${esc(e.ownerPhone)}</a></div>` : ""}
    ${busyLine(e)}
    <div class="price">${rateLines(e)}</div>
    <div class="row mt">
      <button class="btn secondary sm" onclick="openEquipProfile('${e.id}')">${t("description")}</button>
      <button class="btn sm" onclick="bookFromCache('${e.id}','EQUIPMENT')">${t("book")}</button>
    </div>
  </div>`;
}

let bookRes = null;   // resource being booked (with its 3 rates)

function openBookModal(res) {
  bookRes = res;
  // only offer the units for which the provider has set a price
  const units = [];
  if (res.ratePerHour) units.push(["HOUR", t("perHour"), res.ratePerHour]);
  if (res.ratePerDay) units.push(["DAY", t("perDay"), res.ratePerDay]);
  if (res.ratePerVigha) units.push(["VIGHA", t("perVigha"), res.ratePerVigha]);
  if (!units.length) { toast(t("noData"), "error"); return; }
  const farms = state.farms || [];
  const farmSelect = farms.length ? `
    <div class="field"><label>${t("selectFarm")}</label>
      <select id="bk_farm_id" onchange="onBookingFarmChange()">
        <option value="">-- ${t("selectFarm")} --</option>
        ${farms.map(f => `<option value="${f.id}">${esc(f.name)} (${f.sizeVigha} vigha - ${esc(f.village)})</option>`).join("")}
      </select>
    </div>` : "";

  openModal(`
    <h2>${t("book")}: ${esc(res.resourceName)}</h2>
    ${farmSelect}
    <div class="field"><label>${t("bookingType")}</label>
      <select id="bk_type" onchange="bookTypeChange()">
        <option value="ONE_DAY">${t("oneDay")}</option>
        <option value="MULTIPLE_DAYS">${t("multipleDays")}</option>
        <option value="MONTHLY">${t("monthly")}</option>
      </select>
    </div>
    <div class="row">
      <div class="field"><label>${t("startDate")}</label><input id="bk_start" type="date" onchange="onBookingStartDateChange()" /></div>
      <div class="field" id="bk_end_wrap"><label>${t("endDate")}</label><input id="bk_end" type="date" onchange="updateBookTotal()" /></div>
    </div>
    <div class="field"><label>${t("arrivalTime")}</label><input id="bk_time" type="time" value="08:00" /></div>
    <div class="row">
      <div class="field"><label>${t("rateUnit")}</label>
        <select id="bk_unit" onchange="updateBookTotal()">
          ${units.map(u => `<option value="${u[0]}">${u[1]} — ${money(u[2])}</option>`).join("")}
        </select>
      </div>
      <div class="field" id="bk_qty_wrap"><label>${t("quantity")}</label><input id="bk_qty" type="number" step="0.1" placeholder="1" oninput="updateBookTotal()" /></div>
    </div>
    <div class="field"><label>${t("notes")}</label><textarea id="bk_notes"></textarea></div>
    <div class="field">
      <label>${t("location")}</label>
      <div class="row">
        <button type="button" class="btn secondary" style="flex:1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" id="bk_locBtn" onclick="grabBookLocation()">
          <i data-feather="map-pin" style="width: 14px; height: 14px;"></i>
          <span>${t("useLocation")}</span>
        </button>
        <button type="button" class="btn blue" style="flex:1" onclick="pickBookLocationOnMap()">${t("pickOnMap")}</button>
      </div>
      <div class="muted" id="bk_locInfo" style="margin-top:4px"></div>
    </div>
    <div class="price" id="bk_total"></div>
    <div class="modal-actions">
      <button class="btn secondary" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn" onclick="submitBooking(bookRes)">${t("book")}</button>
    </div>`);
  // Farm location is selected only for this booking. The map starts with the
  // farmer's saved district, so Junagadh/Surendranagar opens in Gujarat there.
  bookLoc = { lat: null, lng: null };
  bookTypeChange();
  updateBookTotal();
}

function onBookingFarmChange() {
  const farmId = val("bk_farm_id");
  if (!farmId) return;
  const f = (state.farms || []).find(x => x.id == farmId);
  if (!f) return;

  const unit = val("bk_unit");
  if (unit === "VIGHA") {
    const qtyInput = document.getElementById("bk_qty");
    if (qtyInput) {
      qtyInput.value = f.sizeVigha;
      updateBookTotal();
    }
  }

  showBookLocInfo(`${f.name}: ${f.village}, ${f.district} (${f.sizeVigha} vigha)`);
  bookLoc = { lat: null, lng: null };
}

// rate for the unit the farmer picked
function bookRateFor(res, unit) {
  if (unit === "HOUR") return res.ratePerHour || 0;
  if (unit === "VIGHA") return res.ratePerVigha || 0;
  return res.ratePerDay || 0;
}

function onBookingStartDateChange() {
  const type = val("bk_type");
  const startVal = val("bk_start");
  if (type === "MONTHLY" && startVal) {
    const startDate = new Date(startVal);
    startDate.setDate(startDate.getDate() + 29);
    const yyyy = startDate.getFullYear();
    const mm = String(startDate.getMonth() + 1).padStart(2, '0');
    const dd = String(startDate.getDate()).padStart(2, '0');
    document.getElementById("bk_end").value = `${yyyy}-${mm}-${dd}`;
  }
  updateBookTotal();
}

// live total shown in the modal: rate × quantity
// (per-day bookings default the quantity to the number of days selected)
function updateBookTotal() {
  if (!bookRes) return;
  const unit = val("bk_unit");
  const type = val("bk_type");
  const s = val("bk_start");
  const e = val("bk_end");
  const qtyEl = document.getElementById("bk_qty");
  
  let days = 1;
  if (type === "MONTHLY") {
    days = 30;
  } else if (type === "MULTIPLE_DAYS" && s && e) {
    days = Math.max(1, Math.round((new Date(e) - new Date(s)) / 86400000) + 1);
  }

  const qtyWrap = document.getElementById("bk_qty_wrap");
  if (unit === "DAY") {
    if (qtyWrap) qtyWrap.style.display = "none";
    if (qtyEl) qtyEl.value = 1;
  } else {
    if (qtyWrap) {
      qtyWrap.style.display = "block";
    }
  }

  const rate = bookRateFor(bookRes, unit);
  let qty = qtyEl ? parseFloat(qtyEl.value) : 1;
  if (isNaN(qty) || qty <= 0) qty = 1;

  let total = 0;
  let formulaDesc = "";
  if (unit === "DAY") {
    total = rate * days;
    formulaDesc = `${money(rate)} / ${t("perDay")} × ${days} ${t("days")}`;
  } else if (unit === "HOUR") {
    total = rate * qty * days;
    formulaDesc = `${money(rate)} / ${t("perHour")} × ${qty} ${t("hours")}/day × ${days} ${t("days")}`;
  } else if (unit === "VIGHA") {
    total = rate * qty;
    formulaDesc = `${money(rate)} / ${t("perVigha")} × ${qty} vigha`;
  }

  const el = document.getElementById("bk_total");
  if (el) el.textContent = `${t("totalAmount")}: ${money(total)} (${formulaDesc})`;
}

let bookLoc = { lat: null, lng: null };
function grabBookLocation() {
  captureLocation((lat, lng) => {
    bookLoc = { lat, lng };
    const b = document.getElementById("bk_locBtn");
    if (b) b.innerHTML = `<i data-feather="check" style="width: 14px; height: 14px;"></i> <span>${t("locationSaved")}</span>`;
    showBookLocInfo(t("liveLocationUsed"));
  });
}

// Farmer ghare hoy ne farm alag jagya e hoy: map par farm par click kari location mokle
function pickBookLocationOnMap() {
  openMapPicker((lat, lng) => {
    bookLoc = { lat, lng };
    const b = document.getElementById("bk_locBtn");
    if (b) b.innerHTML = `<i data-feather="map-pin" style="width: 14px; height: 14px;"></i> <span>${t("useLocation")}</span>`;
    showBookLocInfo(`${t("farmLocationPicked")} (${lat}, ${lng})`);
  }, bookLoc.lat, bookLoc.lng, state.user && state.user.district ? state.user.district : "");
}

// show helper location
function showBookLocInfo(msg) {
  const el = document.getElementById("bk_locInfo");
  if (el) el.textContent = msg;
}

function bookTypeChange() {
  const type = document.getElementById("bk_type").value;
  const endWrap = document.getElementById("bk_end_wrap");
  const endInput = document.getElementById("bk_end");
  if (type === "MULTIPLE_DAYS") {
    endWrap.style.display = "block";
    endInput.removeAttribute("readonly");
    endInput.value = "";
  } else if (type === "MONTHLY") {
    endWrap.style.display = "block";
    endInput.setAttribute("readonly", "true");
    onBookingStartDateChange();
  } else {
    endWrap.style.display = "none";
  }
  updateBookTotal();
}

async function submitBooking(res) {
  const type = document.getElementById("bk_type").value;
  const farmId = val("bk_farm_id");
  let notes = val("bk_notes");
  if (farmId) {
    const f = (state.farms || []).find(x => x.id == farmId);
    if (f) {
      notes = `[Farm: ${f.name} - ${f.village}, ${f.district}] ` + (notes || "");
    }
  }

  const body = {
    resourceType: res.resourceType,
    resourceId: res.resourceId,
    bookingType: type,
    startDate: val("bk_start"),
    endDate: val("bk_end") || null,
    startTime: val("bk_time"),
    rateUnit: val("bk_unit"),
    quantity: numVal("bk_qty"),
    notes: notes,
    farmerLat: bookLoc.lat,
    farmerLng: bookLoc.lng,
  };
  if (!body.startDate) { toast(t("startDate") + " ?", "error"); return; }
  if (!body.startTime) { toast(t("arrivalTime") + " ?", "error"); return; }
  try {
    await API.post("/api/bookings", body);
    closeModal();
    toast(t("updated"), "success");
    go("bookingHistory");
  } catch (e) { toast(e.message, "error"); }
}

async function farmerBookings(v) {
  const bookings = await API.get("/api/bookings/farmer");
  v.innerHTML = `<h1 class="page-title">${t("bookingHistory")}</h1>` + bookingTable(bookings, "farmer");
}

function bookingTable(bookings, viewer) {
  if (!bookings || !bookings.length) return `<div class="empty">${t("noData")}</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("resource")}</th><th>${viewer === "farmer" ? t("provider") : t("farmer")}</th>
      <th>${t("bookingType")}</th><th>${t("date")}</th><th>${t("amount")}</th>
      <th>${t("status")}</th><th>${t("action")}</th>
    </tr></thead><tbody>
    ${bookings.map(b => {
      const st = (b.status || "PENDING").toLowerCase();
      return `<tr>
        <td>${esc(b.resourceName || "-")}</td>
        <td>${esc(viewer === "farmer" ? (b.providerName || "-") : (b.farmerName || "-"))}</td>
        <td>${t(typeKey(b.bookingType))}</td>
        <td>${fmtDate(b.startDate)}${b.endDate ? " → " + fmtDate(b.endDate) : ""}${b.startTime ? `<br><span class="muted">${b.startTime}${b.endTime ? "-" + b.endTime : ""}</span>` : ""}</td>
        <td>${money(b.amount)}</td>
        <td>
          <span class="badge ${b.status || "PENDING"}">${t(st) || b.status}</span>
          ${b.rejectionReason ? `<br><span class="badge REJECTED" style="margin-top:4px;display:inline-block;font-size:11px;">${t("changesRequested")}</span>` : ""}
        </td>
        <td><div class="actions-cell">
          <button class="btn secondary sm" onclick='viewBookingModal(${JSON.stringify(b)})'>${t("view")}</button>
          ${farmerBookingActions(b)}
        </div></td>
      </tr>`;
    }).join("")}
    </tbody></table></div>`;
}

function farmerBookingActions(b) {
  let btns = "";
  // let the farmer call the provider (useful if the farmer is not at the farm)
  if (b.providerPhone && b.status !== "REJECTED" && b.status !== "CANCELLED" && b.status !== "COMPLETED") {
    btns += `<a class="btn secondary sm" href="tel:${esc(b.providerPhone)}">${t("call")}</a> `;
  }
  if (b.status === "PENDING" || b.status === "ACCEPTED") {
    btns += `<button class="btn danger sm" onclick="cancelBooking('${b.id}')">${t("cancel")}</button> `;
  }
  // provider sent a completion photo -> farmer reviews, then approves
  if (b.status === "SUBMITTED") {
    btns += `<button class="btn blue sm" onclick='openProofModal(${JSON.stringify(b)})'>${t("reviewApprove")}</button> `;
  }
  // completed but not yet paid -> Pay Now; already paid -> just show "Paid"
  if (b.status === "COMPLETED") {
    if (b.paid) {
      btns += `<span class="badge COMPLETED">${t("alreadyPaid")}</span> `;
    } else {
      btns += `<button class="btn sm" onclick='openPayModal(${JSON.stringify({ id: b.id, name: b.resourceName, amount: b.amount })})'>${t("pay")}</button> `;
    }
    if (b.rating) {
      btns += `<span class="badge" style="background:#fbc02d;color:#fff;margin-left:4px">${t("ratingLabel") || "Rating"}: ${b.rating}/10</span>`;
    } else {
      btns += `<button class="btn sm" style="background:#fbc02d;color:#fff;margin-left:4px" onclick='openRateModal(${JSON.stringify(b)})'>${t("rate")}</button>`;
    }
  }
  return btns || "-";
}

// Farmer reviews the provider's work photo, then approves or calls for remaining work.
function openProofModal(b) {
  const call = b.providerPhone
    ? `<a class="btn amber block" href="tel:${esc(b.providerPhone)}">${t("callProvider")} (${esc(b.providerName)})</a>`
    : "";
  openModal(`
    <h2>${t("workProof")}: ${esc(b.resourceName)}</h2>
    ${b.completionPhoto
      ? `<img src="${b.completionPhoto}" style="width:100%;border-radius:10px;margin:8px 0" />`
      : `<div class="empty">${t("noData")}</div>`}
    <p class="muted">${esc(b.providerName)}</p>
    
    <div class="field mt" id="rejection_wrap" style="display:none">
      <label>${t("rejectionReason")}</label>
      <textarea id="rejection_reason" placeholder="${t("feedbackPlaceholder")}" style="min-height:80px;"></textarea>
    </div>

    ${call}
    <div class="modal-actions mt">
      <button class="btn secondary" onclick="closeModal()">${t("close")}</button>
      <button class="btn danger" id="btn_reject_work" onclick="toggleRejectionReason('${b.id}')">${t("rejectWork")}</button>
      <button class="btn" id="btn_approve_work" onclick="approveWork('${b.id}')">${t("approve")}</button>
    </div>`);
}

function toggleRejectionReason(id) {
  const wrap = document.getElementById("rejection_wrap");
  const btnReject = document.getElementById("btn_reject_work");
  const btnApprove = document.getElementById("btn_approve_work");
  if (wrap.style.display === "none") {
    wrap.style.display = "block";
    btnApprove.style.display = "none";
    btnReject.textContent = t("rejectWork") + " \u2713"; // Checkmark icon
  } else {
    const reason = val("rejection_reason");
    if (!reason || reason.trim() === "") {
      toast(t("rejectionReason") + " ?", "error");
      return;
    }
    doRejectWork(id, reason);
  }
}

async function doRejectWork(id, reason) {
  if (!confirm(t("rejectConfirm"))) return;
  try {
    await API.post(`/api/bookings/${id}/reject-work`, { reason });
    closeModal();
    toast(t("rejectSuccess"), "success");
    go("bookingHistory");
  } catch (e) {
    toast(e.message, "error");
  }
}


async function approveWork(id) {
  try {
    await API.post(`/api/bookings/${id}/approve`);
    closeModal();
    toast(t("updated"), "success");
    go("bookingHistory");
  } catch (e) { toast(e.message, "error"); }
}

async function cancelBooking(id) {
  if (!confirm(t("confirmDelete"))) return;
  try { await API.post(`/api/bookings/${id}/cancel`); toast(t("updated"), "success"); render(); }
  catch (e) { toast(e.message, "error"); }
}

function openPayModal(bk) {
  openModal(`
    <h2>${t("payFor")}</h2>
    <p><b>${esc(bk.name)}</b> — ${money(bk.amount)}</p>
    <div class="field"><label>${t("paymentMethod")}</label>
      <select id="pay_method">
        <option value="CASH">${t("cash")}</option>
        <option value="ONLINE">${t("online")}</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn" onclick="submitPay('${bk.id}')">${t("pay")}</button>
    </div>`);
}

async function submitPay(bookingId) {
  const method = val("pay_method");
  if (method === "ONLINE") return payWithRazorpay(bookingId);
  try {
    await API.post("/api/payments", { bookingId, method });
    closeModal();
    toast(t("updated"), "success");
    go("paymentHistory");
  } catch (e) { toast(e.message, "error"); }
}

// Online payment via Razorpay checkout:
// 1) backend creates an order, 2) Razorpay popup collects the payment,
// 3) backend verifies the signature and records the payment.
async function payWithRazorpay(bookingId) {
  try {
    const order = await API.post("/api/payments/razorpay/order", { bookingId });
    closeModal();

    const u = state.user || {};
    const rzp = new Razorpay({
      key: order.key,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.orderId,
      prefill: { name: u.name || "", email: u.email || "", contact: u.phone || "" },
      theme: { color: "#2e7d32" },
      handler: async (resp) => {
        try {
          await API.post("/api/payments/razorpay/verify", {
            bookingId,
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          });
          toast(t("paymentSuccess"), "success");
          go("paymentHistory");
        } catch (e) { toast(e.message, "error"); }
      },
      modal: {
        ondismiss: () => toast(t("paymentCancelled"), "error"),
      },
    });
    rzp.on("payment.failed", (resp) => {
      toast((resp.error && resp.error.description) || t("paymentFailed"), "error");
    });
    rzp.open();
  } catch (e) { toast(e.message, "error"); }
}

async function farmerPayments(v) {
  const payments = await API.get("/api/payments/farmer");
  v.innerHTML = `<h1 class="page-title">${t("paymentHistory")}</h1>` + paymentTable(payments, "farmer");
}

function paymentTable(payments, viewer) {
  if (!payments || !payments.length) return `<div class="empty">${t("noData")}</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("transaction")}</th><th>${viewer === "farmer" ? t("provider") : t("farmer")}</th>
      <th>${t("amount")}</th>${viewer === "provider" ? `<th>${t("commissionAmt")}</th><th>${t("yourEarning")}</th>` : ""}
      <th>${t("method")}</th><th>${t("status")}</th><th>${t("date")}</th><th>${t("action")}</th>
    </tr></thead><tbody>
    ${payments.map(p => {
      const ref = p.transactionRef || p.transactionId || p.id || "-";
      const name = viewer === "farmer" ? (p.providerName || p.resourceName || "-") : (p.farmerName || "-");
      const mth = p.method || p.paymentMethod || "ONLINE";
      const earning = p.providerEarning != null ? p.providerEarning : (p.netAmount != null ? p.netAmount : (p.amount - (p.commission || 0)));
      return `<tr>
        <td>${esc(ref)}</td>
        <td>${esc(name)}</td>
        <td>${money(p.amount)}</td>
        ${viewer === "provider" ? `<td>${money(p.commission || 0)}</td><td>${money(earning)}</td>` : ""}
        <td>${t(mth.toLowerCase()) || mth}</td>
        <td><span class="badge ${p.status || "COMPLETED"}">${p.status || "PAID"}</span></td>
        <td>${fmtDate(p.createdAt)}</td>
        <td><button class="btn secondary sm" onclick='viewPaymentModal(${JSON.stringify(p)})'>${t("view")}</button></td>
      </tr>`;
    }).join("")}
    </tbody></table></div>`;
}

// ---- helpers shared ----
function unitKey(u) { return u === "HOUR" ? "hour" : u === "VIGHA" ? "vigha" : "day"; }
function typeKey(tp) {
  return { ONE_DAY: "oneDay", MULTIPLE_DAYS: "multipleDays", MONTHLY: "monthly" }[tp] || tp;
}
function countByStatus(list) {
  const m = {};
  list.forEach(b => { m[b.status] = (m[b.status] || 0) + 1; });
  return m;
}
function stat(num, lbl) {
  return `<div class="stat"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`;
}

function openRateModal(b) {
  openModal(`
    <h2>${t("rate")}: ${esc(b.resourceName)}</h2>
    <p class="muted">${t("rateHint")}</p>
    <div class="field">
      <label>${t("ratingLabel")} (1-10)</label>
      <input type="number" id="rate_value" min="1" max="10" value="10" step="1" style="font-size: 1.25rem; text-align: center; font-weight: bold; width: 80px; margin: 0 auto; display: block;" />
    </div>
    <div class="field">
      <label>${t("review")}</label>
      <textarea id="rate_review" placeholder="${t("reviewPlaceholder")}"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn" onclick="submitRate('${b.id}')">${t("submit")}</button>
    </div>
  `);
}

async function submitRate(id) {
  const rating = parseInt(val("rate_value"));
  const review = val("rate_review");
  if (isNaN(rating) || rating < 1 || rating > 10) {
    toast(t("invalidRating"), "error");
    return;
  }
  try {
    await API.post(`/api/bookings/${id}/rate`, { rating, review });
    closeModal();
    toast(t("updated"), "success");
    render();
  } catch (e) {
    toast(e.message, "error");
  }
}
