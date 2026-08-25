// ================= FARMER PAGES =================
function catLabel(c) {
  if (currentLang === "gu" && c.nameGu) return c.nameGu;
  if (currentLang === "hi" && c.nameHi) return c.nameHi;
  return c.name;
}

async function farmerPage(page, v) {
  if (page === "dashboard") return farmerDashboard(v);
  if (page === "myFarms") return myFarmsPage(v);
  if (page === "bookLabour") return browseCatalog(v, "LABOUR");
  if (page === "bookEquipment") return browseCatalog(v, "EQUIPMENT");
  if (page === "bookingHistory") return farmerBookings(v);
  if (page === "paymentHistory") return farmerPayments(v);
  if (page === "profile") return profilePage(v);
}

async function farmerDashboard(v) {
  const bookings = await API.get("/api/bookings/farmer");
  const payments = await API.get("/api/payments/farmer");
  const spent = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const counts = countByStatus(bookings);
  v.innerHTML = `
    <h1 class="page-title">${t("welcome")}, ${esc(state.user.name)} <span style="font-size: 13px; font-weight: normal; color: var(--gray-500); margin-left: 8px;">(Farmer)</span></h1>
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

async function browseCatalog(v, type, village, category) {
  const q = village ? "?village=" + encodeURIComponent(village) : "";
  const items = type === "LABOUR"
    ? await API.get("/api/catalog/labour" + q)
    : await API.get("/api/catalog/equipment" + q);
  catalogCache = {};
  items.forEach(it => { catalogCache[it.id] = it; });

  let displayItems = items;
  if (category) {
    const target = category.toLowerCase().trim();
    if (type === "EQUIPMENT") {
      displayItems = items.filter(it => it.categoryName && it.categoryName.toLowerCase().trim() === target);
    } else if (type === "LABOUR") {
      displayItems = items.filter(it => it.skills && it.skills.some(s => s && s.toLowerCase().trim() === target));
    }
  }

  const title = type === "LABOUR" ? t("bookLabour") : t("bookEquipment");

  let catFilterHtml = "";
  if (type === "EQUIPMENT") {
    const cats = state.categories.EQUIPMENT || [];
    catFilterHtml = `
      <select id="cat_equip_category" onchange="filterEquipCatalog('${type}')" style="margin-right:8px; padding:6px; border-radius:4px; border:1px solid var(--gray-300); max-width:180px;">
        <option value="">-- All Categories --</option>
        ${cats.map(c => `<option value="${c.name}" ${category === c.name ? "selected" : ""}>${esc(catLabel(c))}</option>`).join("")}
      </select>
    `;
  } else if (type === "LABOUR") {
    const cats = state.categories.WORK || [];
    catFilterHtml = `
      <select id="cat_equip_category" onchange="filterEquipCatalog('${type}')" style="margin-right:8px; padding:6px; border-radius:4px; border:1px solid var(--gray-300); max-width:180px;">
        <option value="">-- All Skills --</option>
        ${cats.map(c => `<option value="${c.name}" ${category === c.name ? "selected" : ""}>${esc(catLabel(c))}</option>`).join("")}
      </select>
    `;
  }

  const searchBar = `
    <div class="row" style="max-width:640px;margin-bottom:14px;align-items:center;">
      <input id="cat_village" placeholder="${t("searchVillage")}" value="${esc(village || "")}"
        onkeydown="if(event.key==='Enter')searchCatalog('${type}')" style="margin-right:8px;" />
      ${catFilterHtml}
      <button class="btn sm" onclick="searchCatalog('${type}')">${t("search")}</button>
      ${(village || category) ? `<button class="btn secondary sm" onclick="searchCatalog('${type}', true)" style="margin-left:8px;">${t("clear")}</button>` : ""}
    </div>`;

  const list = !displayItems.length
    ? `<div class="empty">${t("noData")}</div>`
    : `<div class="grid">${displayItems.map(it => type === "LABOUR" ? labourCard(it) : equipCard(it)).join("")}</div>`;
  v.innerHTML = `<h1 class="page-title">${title}</h1>${searchBar}${list}`;
  if (typeof feather !== "undefined") feather.replace();
}

function searchCatalog(type, clear) {
  const v = document.getElementById("view");
  const village = clear ? "" : val("cat_village");
  const category = !clear ? val("cat_equip_category") : "";
  browseCatalog(v, type, village, category);
}

function filterEquipCatalog(type) {
  searchCatalog(type);
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

// Red alert box for booked resource with dates & times using Feather Icons
function busyLine(it) {
  const slots = it.bookedSlots || [];
  if (!slots.length && !it.busy) return "";

  let slotLines = "";
  if (slots.length > 0) {
    slotLines = slots.map(s => {
      const start = fmtDate(s.startDate);
      const end = (s.endDate && s.endDate !== s.startDate) ? ` ${t("to")} ${fmtDate(s.endDate)}` : "";
      const time = (s.startTime && s.endTime) ? ` <span style="display:inline-flex;align-items:center;gap:3px;margin-left:6px;"><i data-feather="clock" style="width:13px;height:13px;color:#dc2626;"></i> ${esc(s.startTime)} - ${esc(s.endTime)}</span>` : "";
      return `<div class="alert-item">
        <i data-feather="calendar" style="width:14px; height:14px; color:#dc2626; flex-shrink:0;"></i>
        <span>${esc(start)}${esc(end)}</span>${time}
      </div>`;
    }).join("");
  } else if (it.availableFrom) {
    slotLines = `<div class="alert-item">
      <i data-feather="calendar" style="width:14px; height:14px; color:#dc2626; flex-shrink:0;"></i>
      <span>${t("availableFromLbl")}: ${esc(fmtDate(it.availableFrom))}</span>
    </div>`;
  }

  const title = t("bookedSchedule");
  const warn = t("bookedDatesWarning");

  return `
    <div class="booked-alert-box">
      <div class="alert-title">
        <i data-feather="alert-circle" style="width: 16px; height: 16px; color: #dc2626; flex-shrink: 0;"></i>
        <span>${esc(title)}</span>
      </div>
      <div style="margin-left: 23px;">
        ${slotLines}
        <div class="alert-warn">
          <i data-feather="slash" style="width: 12px; height: 12px; flex-shrink: 0; color:#dc2626;"></i>
          <span>${esc(warn)}</span>
        </div>
      </div>
    </div>
  `;
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
    ${busyLine(l)}
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
    `<img src="${esc(p)}" style="max-width:240px; max-height:160px; object-fit:cover; border-radius:10px; margin:6px auto; display:block;" onerror="this.style.display='none'"/>`).join("");
  const ratingHtml = e.avgRating ? ` <span style="color:#fbc02d;font-weight:bold;font-size:1.1rem">Rating: ${e.avgRating}/10 (${e.ratingCount})</span>` : "";
  openModal(`
    <h2>${esc(e.name)}${ratingHtml}</h2>
    <div class="muted">${esc(e.categoryName || "")}</div>
    ${photos}
    <p>${esc(e.description || "")}</p>
    ${e.ownerPhone ? `<div class="muted">${t("phone")}: <a href="tel:${esc(e.ownerPhone)}">${esc(e.ownerPhone)}</a></div>` : ""}
    ${busyLine(e)}
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
    busy: it.busy, bookedSlots: it.bookedSlots, availableFrom: it.availableFrom
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

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let bookRes = null;   // resource being booked (with its 3 rates)

function checkSlotOverlap(slots, sStr, eStr, ignoreBookingId) {
  if (!slots || !slots.length || !sStr) return null;
  const endVal = eStr || sStr;
  for (const slot of slots) {
    if (ignoreBookingId && slot.id == ignoreBookingId) continue;
    const slotStart = slot.startDate;
    const slotEnd = slot.endDate || slot.startDate;
    if (sStr <= slotEnd && slotStart <= endVal) {
      return slot;
    }
  }
  return null;
}

function openBookModal(res, existingBooking) {
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
        ${farms.map(f => `<option value="${f.id}">${esc(f.name)} (${f.sizeVigha} vigha - ${esc(state.user.village || "")})</option>`).join("")}
      </select>
    </div>` : "";

  const titleText = existingBooking ? `${t("edit")}: ${esc(res.resourceName)}` : `${t("book")}: ${esc(res.resourceName)}`;
  const submitBtnText = existingBooking ? t("save") : t("book");

  const todayStr = getTodayStr();

  openModal(`
    <h2>${titleText}</h2>
    ${busyLine(res)}
    ${farmSelect}
    ${res.resourceType === "LABOUR" ? `
    <div class="field">
      <label>${t("selectSkills")}</label>
      <select id="bk_work_type">
        ${state.categories.WORK.map(c => 
          `<option value="${c.name}">${esc(catLabel(c))}</option>`
        ).join("")}
      </select>
    </div>` : ""}
    <div class="field"><label>${t("bookingType")}</label>
      <select id="bk_type" onchange="bookTypeChange()">
        <option value="ONE_DAY">${t("oneDay")}</option>
        <option value="MULTIPLE_DAYS">${t("multipleDays")}</option>
        <option value="MONTHLY">${t("monthly")}</option>
      </select>
    </div>
    <div class="row">
      <div class="field"><label>${t("startDate")}</label><input id="bk_start" type="date" min="${todayStr}" onchange="onBookingStartDateChange()" /></div>
      <div class="field" id="bk_end_wrap"><label>${t("endDate")}</label><input id="bk_end" type="date" min="${todayStr}" onchange="updateBookTotal()" /></div>
    </div>
    <div id="bk_date_warn" style="display:none; color:#c62828; background:#ffebee; border:1.5px solid #ef5350; border-left:5px solid #d32f2f; padding:8px 12px; border-radius:6px; font-weight:600; font-size:13px; margin:8px 0; line-height:1.4;"></div>
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
    <div class="price" id="bk_total"></div>
    <div class="modal-actions">
      <button class="btn secondary" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn" id="bk_submit_btn" onclick="submitBooking(bookRes, ${existingBooking ? JSON.stringify(existingBooking.id) : 'null'})">${submitBtnText}</button>
    </div>`);

  const startInput = document.getElementById("bk_start");
  const endInput = document.getElementById("bk_end");
  if (startInput) startInput.min = todayStr;
  if (endInput) endInput.min = todayStr;

  if (existingBooking) {
    if (document.getElementById("bk_farm_id")) document.getElementById("bk_farm_id").value = existingBooking.farmId || "";
    if (document.getElementById("bk_work_type")) document.getElementById("bk_work_type").value = existingBooking.workType || "";
    document.getElementById("bk_type").value = existingBooking.bookingType || "ONE_DAY";
    document.getElementById("bk_start").value = existingBooking.startDate || "";
    document.getElementById("bk_end").value = existingBooking.endDate || "";
    document.getElementById("bk_time").value = existingBooking.startTime || "08:00";
    document.getElementById("bk_unit").value = existingBooking.rateUnit || "DAY";
    document.getElementById("bk_qty").value = existingBooking.quantity || 1;
    document.getElementById("bk_notes").value = existingBooking.notes || "";
  }

  onBookingStartDateChange();
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
  const todayStr = getTodayStr();
  const endInput = document.getElementById("bk_end");
  if (endInput) {
    const minEnd = (startVal && startVal > todayStr) ? startVal : todayStr;
    endInput.min = minEnd;
    if (endInput.value && endInput.value < minEnd) {
      endInput.value = minEnd;
    }
  }
  if (type === "MONTHLY" && startVal) {
    const startDate = new Date(startVal);
    startDate.setDate(startDate.getDate() + 29);
    const yyyy = startDate.getFullYear();
    const mm = String(startDate.getMonth() + 1).padStart(2, '0');
    const dd = String(startDate.getDate()).padStart(2, '0');
    if (endInput) endInput.value = `${yyyy}-${mm}-${dd}`;
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

  // Live overlap check
  const warnEl = document.getElementById("bk_date_warn");
  const submitBtn = document.getElementById("bk_submit_btn");
  if (warnEl && bookRes && s) {
    const endVal = (type === "ONE_DAY") ? s : (e || s);
    const overlap = checkSlotOverlap(bookRes.bookedSlots, s, endVal);
    if (overlap) {
      const range = fmtDate(overlap.startDate) + (overlap.endDate && overlap.endDate !== overlap.startDate ? " " + t("to") + " " + fmtDate(overlap.endDate) : "");
      warnEl.style.display = "block";
      warnEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;font-weight:bold;color:#c62828;">
          <i data-feather="alert-triangle" style="width:16px;height:16px;flex-shrink:0;"></i>
          <span>${esc(t("alreadyBookedErr"))}</span>
        </div>
        <div style="margin-left:22px;font-weight:normal;font-size:12.5px;display:flex;align-items:center;gap:6px;margin-top:3px;">
          <i data-feather="calendar" style="width:13px;height:13px;color:#d32f2f;"></i>
          <span>${esc(range)}${overlap.startTime ? ' (' + esc(overlap.startTime) + ' - ' + esc(overlap.endTime) + ')' : ''}</span>
        </div>
      `;
      if (submitBtn) submitBtn.disabled = true;
      if (typeof feather !== "undefined") feather.replace();
    } else {
      warnEl.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;
    }
  }
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

async function submitBooking(res, existingBookingId) {
  const type = document.getElementById("bk_type").value;
  const farmId = val("bk_farm_id");
  let notes = val("bk_notes");
  if (farmId) {
    const f = (state.farms || []).find(x => x.id == farmId);
    if (f) {
      if (!notes.includes(`[Farm: ${f.name}`)) {
        notes = `[Farm: ${f.name} - ${f.village}, ${f.district}] ` + (notes || "");
      }
    }
  }

  const startDateVal = val("bk_start");
  if (!startDateVal) { toast(t("startDate") + " ?", "error"); return; }
  const todayStr = getTodayStr();
  if (startDateVal < todayStr) {
    toast(t("pastDateErr"), "error");
    return;
  }
  const endDateVal = (type === "ONE_DAY") ? startDateVal : (val("bk_end") || startDateVal);

  if (endDateVal < startDateVal) {
    toast("End date cannot be before start date", "error");
    return;
  }

  // --- Strict overlap validation on client side ---
  const overlap = checkSlotOverlap(res.bookedSlots, startDateVal, endDateVal, existingBookingId);
  if (overlap) {
    const range = fmtDate(overlap.startDate) + (overlap.endDate && overlap.endDate !== overlap.startDate ? " " + t("to") + " " + fmtDate(overlap.endDate) : "");
    const errMsg = `${t("alreadyBookedErr")} (${range})`;
    toast(errMsg, "error");
    return;
  }

  const unit = val("bk_unit");
  const s = startDateVal;
  const e = val("bk_end");
  const qtyEl = document.getElementById("bk_qty");
  
  let days = 1;
  if (type === "MONTHLY") {
    days = 30;
  } else if (type === "MULTIPLE_DAYS" && s && e) {
    days = Math.max(1, Math.round((new Date(e) - new Date(s)) / 86400000) + 1);
  }

  const rate = bookRateFor(res, unit);
  let qty = qtyEl ? parseFloat(qtyEl.value) : 1;
  if (isNaN(qty) || qty <= 0) qty = 1;

  let total = 0;
  if (unit === "DAY") {
    total = rate * days;
  } else if (unit === "HOUR") {
    total = rate * qty * days;
  } else if (unit === "VIGHA") {
    total = rate * qty;
  }

  const body = {
    resourceType: res.resourceType,
    resourceId: res.resourceId,
    resourceName: res.resourceName,
    bookingType: type,
    startDate: startDateVal,
    endDate: val("bk_end") || null,
    startTime: val("bk_time"),
    rateUnit: unit,
    quantity: qty,
    notes: notes,
    farmId: farmId,
    workType: val("bk_work_type"),
    amount: total
  };

  if (!body.startTime) { toast(t("arrivalTime") + " ?", "error"); return; }
  try {
    if (existingBookingId) {
      await API.put(`/api/bookings/${existingBookingId}`, body);
      toast(t("updated"), "success");
    } else {
      await API.post("/api/bookings", body);
      toast(t("updated"), "success");
    }
    closeModal();
    go("bookingHistory");
  } catch (e) { toast(e.message, "error"); }
}

async function farmerBookings(v) {
  const bookings = await API.get("/api/bookings/farmer");
  v.innerHTML = `<h1 class="page-title">${t("bookingHistory")}</h1>` + bookingTable(bookings, "farmer");
}

function bookingTable(bookings, viewer) {
  if (!bookings.length) return `<div class="empty">${t("noData")}</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("resource")}</th><th>${viewer === "farmer" ? t("provider") : t("farmer")}</th>
      <th>${t("bookingType")}</th><th>${t("date")}</th><th>${t("amount")}</th>
      <th>${t("status")}</th><th>${t("action")}</th>
    </tr></thead><tbody>
    ${bookings.map(b => `<tr>
      <td>${esc(b.resourceName)}</td>
      <td>${esc(viewer === "farmer" ? b.providerName : b.farmerName)}</td>
      <td>${t(typeKey(b.bookingType))}</td>
      <td>${fmtDate(b.startDate)}${b.endDate ? " → " + fmtDate(b.endDate) : ""}${b.startTime ? `<br><span class="muted">${b.startTime}${b.endTime ? "-" + b.endTime : ""}</span>` : ""}</td>
      <td>${money(b.amount)}</td>
      <td>
        <span class="badge ${b.status}">${t(b.status.toLowerCase())}</span>
        ${b.rejectionReason ? `<br><span class="badge REJECTED" style="margin-top:4px;display:inline-block;font-size:11px;">${t("changesRequested")}</span>` : ""}
      </td>
      <td><div class="actions-cell">
        <button class="btn secondary sm" onclick='viewBookingModal(${JSON.stringify(b)})'>${t("view")}</button>
        ${farmerBookingActions(b)}
      </div></td>
    </tr>`).join("")}
    </tbody></table></div>`;
}

function editBooking(b) {
  const res = {
    resourceType: b.resourceType,
    resourceId: b.resourceId,
    resourceName: b.resourceName,
    ratePerHour: b.ratePerHour || 0,
    ratePerDay: b.ratePerDay || 0,
    ratePerVigha: b.ratePerVigha || 0
  };
  const cached = catalogCache[b.resourceId];
  if (cached) {
    res.ratePerHour = cached.ratePerHour || res.ratePerHour;
    res.ratePerDay = cached.ratePerDay || res.ratePerDay;
    res.ratePerVigha = cached.ratePerVigha || res.ratePerVigha;
    res.busy = cached.busy;
    res.availableFrom = cached.availableFrom;
  }
  openBookModal(res, b);
}

function farmerBookingActions(b) {
  let btns = "";
  // let the farmer call the provider (useful if the farmer is not at the farm)
  if (b.providerPhone && b.status !== "REJECTED" && b.status !== "CANCELLED" && b.status !== "COMPLETED") {
    btns += `<a class="btn secondary sm" href="tel:${esc(b.providerPhone)}">${t("call")}</a> `;
  }
  if (b.status === "PENDING" || b.status === "ACCEPTED") {
    btns += `<button class="btn sm" onclick='editBooking(${JSON.stringify(b)})'>${t("edit")}</button> `;
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
      if (b.rating) {
        btns += `<span class="badge" style="background:#fbc02d;color:#fff;margin-left:4px">${t("ratingLabel") || "Rating"}: ${b.rating}/10</span>`;
      } else {
        btns += `<button class="btn sm" style="background:#fbc02d;color:#fff;margin-left:4px" onclick='openRateModal(${JSON.stringify(b)})'>${t("rate")}</button>`;
      }
    } else {
      btns += `<button class="btn sm" onclick='openPayModal(${JSON.stringify({ id: b.id, name: b.resourceName, amount: b.amount })})'>${t("pay")}</button> `;
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
  if (!payments.length) return `<div class="empty">${t("noData")}</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>${t("transaction")}</th><th>${viewer === "farmer" ? t("provider") : t("farmer")}</th>
      <th>${t("amount")}</th>${viewer === "provider" ? `<th>${t("commissionAmt")}</th><th>${t("yourEarning")}</th>` : ""}
      <th>${t("method")}</th><th>${t("status")}</th><th>${t("date")}</th><th>${t("action")}</th>
    </tr></thead><tbody>
    ${payments.map(p => `<tr>
      <td>${esc(p.transactionRef)}</td>
      <td>${viewer === "farmer" ? esc(p.providerName) : esc(p.farmerName || "-")}</td>
      <td>${money(p.amount)}</td>
      ${viewer === "provider" ? `<td>${money(p.commission)}</td><td>${money(p.providerEarning)}</td>` : ""}
      <td>${t(p.method.toLowerCase())}</td>
      <td><span class="badge ${p.status}">${p.status}</span></td>
      <td>${fmtDate(p.createdAt)}</td>
      <td><button class="btn secondary sm" onclick='viewPaymentModal(${JSON.stringify(p)})'>${t("view")}</button></td>
    </tr>`).join("")}
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

// ================= MY FARMS (Farmer tab) =================
let myFarms = [];

async function loadFarms() {
  try {
    myFarms = await API.get("/api/profile/farms");
  } catch (e) {
    myFarms = [];
  }
}

async function myFarmsPage(v) {
  await loadFarms();
  const farmList = myFarms.map(f => {
    return `
      <div class="card mt" style="margin-bottom:12px; border-left: 4px solid #2e7d32">
        <div class="flex-between">
          <h3 style="display: flex; align-items: center; gap: 6px;">
            <i data-feather="crop" style="width: 18px; height: 18px;"></i>
            <span>${esc(f.name)}</span>
          </h3>
          <div>
            <button class="btn sm secondary" onclick="openFarmModal(${f.id})" style="display: inline-flex; align-items: center; gap: 4px;">
              <i data-feather="edit-2" style="width: 12px; height: 12px;"></i>
              <span>${t("edit")}</span>
            </button>
            <button class="btn sm danger" onclick="deleteFarm(${f.id})" style="display: inline-flex; align-items: center; gap: 4px;">
              <i data-feather="trash-2" style="width: 12px; height: 12px;"></i>
              <span>${t("delete")}</span>
            </button>
          </div>
        </div>
        <div class="row mt" style="gap:16px">
          <div><b>${t("farmSize")}:</b> ${f.sizeVigha} vigha</div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <i data-feather="map-pin" style="width: 14px; height: 14px;"></i>
            <b>${t("village")}/${t("district")}:</b> ${esc(state.user.village || "")}, ${esc(state.user.district || "")}
          </div>
        </div>
      </div>`;
  }).join("");

  v.innerHTML = `
    <h1 class="page-title">${t("myFarms")}</h1>
    <div class="card" style="max-width:720px">
      <div class="flex-between">
        <h2 style="display: flex; align-items: center; gap: 8px;">
          <i data-feather="crop" style="width: 22px; height: 22px;"></i>
          <span>${t("myFarms")}</span>
        </h2>
        <button class="btn sm blue" onclick="openFarmModal()">${t("addFarm")}</button>
      </div>
      <p class="muted">${t("manageFarmsHint")}</p>
      <div id="farmsListContainer" class="mt">
        ${myFarms.length ? farmList : `<div class="empty">${t("noData")}</div>`}
      </div>
    </div>`;
  if (typeof feather !== "undefined") feather.replace();
}

let farmLoc = { lat: null, lng: null };

function grabFarmLocation() {
  captureLocation((lat, lng) => {
    farmLoc = { lat, lng };
    const b = document.getElementById("fm_locBtn");
    if (b) b.innerHTML = `<i data-feather="check" style="width: 14px; height: 14px;"></i> <span>${t("locationSaved")}</span>`;
    showFarmLocInfo(t("liveLocationUsed"));
  });
}

function pickFarmLocationOnMap() {
  openMapPicker((lat, lng) => {
    farmLoc = { lat, lng };
    const b = document.getElementById("fm_locBtn");
    if (b) b.innerHTML = `<i data-feather="map-pin" style="width: 14px; height: 14px;"></i> <span>${t("useLocation")}</span>`;
    showFarmLocInfo(`${t("farmLocationPicked")} (${lat}, ${lng})`);
  }, farmLoc.lat, farmLoc.lng, state.user && state.user.district ? state.user.district : "");
}

function showFarmLocInfo(msg) {
  const el = document.getElementById("fm_locInfo");
  if (el) el.textContent = msg;
}

function openFarmModal(farmId) {
  const f = farmId ? myFarms.find(x => x.id === farmId) : null;
  const title = f ? t("editFarm") : t("addFarm");

  farmLoc = { lat: f ? f.latitude : null, lng: f ? f.longitude : null };

  openModal(`
    <h2>${title}</h2>
    <div class="field"><label>${t("farmName")}</label><input id="fm_name" value="${esc(f ? f.name : "")}" placeholder="e.g. River farm / Main farm" /></div>
    <div class="field"><label>${t("farmSize")}</label><input id="fm_size" type="number" step="0.1" value="${f ? f.sizeVigha : ""}" /></div>
    <div class="field">
      <label>${t("location")}</label>
      <div class="row">
        <button type="button" class="btn secondary" style="flex:1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" id="fm_locBtn" onclick="grabFarmLocation()">
          <i data-feather="map-pin" style="width: 14px; height: 14px;"></i>
          <span>${t("useLocation")}</span>
        </button>
        <button type="button" class="btn blue" style="flex:1" onclick="pickFarmLocationOnMap()">${t("pickOnMap")}</button>
      </div>
      <div class="muted" id="fm_locInfo" style="margin-top:4px"></div>
    </div>
    <div class="modal-actions mt">
      <button class="btn secondary" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn" onclick="saveFarm(${f ? f.id : null})">${t("save")}</button>
    </div>`);

  if (f && f.latitude) {
    showFarmLocInfo(`${t("farmLocationPicked")} (${f.latitude}, ${f.longitude})`);
  }
}

async function saveFarm(farmId) {
  const name = val("fm_name");
  const sizeVigha = numVal("fm_size");

  if (!name) { toast(t("farmName") + " ?", "error"); return; }
  if (!sizeVigha || sizeVigha <= 0) { toast(t("farmSize") + " ?", "error"); return; }

  const body = { name, sizeVigha, latitude: farmLoc.lat, longitude: farmLoc.lng };
  try {
    if (farmId) {
      await API.put("/api/profile/farms/" + farmId, body);
    } else {
      await API.post("/api/profile/farms", body);
    }
    closeModal();
    toast(t("updated"), "success");
    const v = document.getElementById("view");
    myFarmsPage(v);
  } catch (e) {
    toast(e.message, "error");
  }
}

async function deleteFarm(farmId) {
  if (!confirm(t("confirmDelete"))) return;
  try {
    await API.del("/api/profile/farms/" + farmId);
    toast(t("updated"), "success");
    const v = document.getElementById("view");
    myFarmsPage(v);
  } catch (e) {
    toast(e.message, "error");
  }
}
