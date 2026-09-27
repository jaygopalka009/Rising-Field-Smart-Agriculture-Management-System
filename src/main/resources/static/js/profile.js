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

  let extra = (role === "ADMIN") ? "" : locBlock;
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

  let sidePanel = "";
  if (role === "LABOUR" || role === "EQUIPMENT_OWNER") {
    const pw = await API.get("/api/payments/provider/wallet").catch(() => null);
    if (pw) {
      sidePanel = `
        <div style="flex: 0 0 340px; min-width: 300px;">
          <div style="font-size: 16px; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <i data-feather="star" style="width: 18px; height: 18px; color: #f57f17; fill: #fbc02d;"></i>
            <span>${t("ratingsSummary")}</span>
          </div>
          ${typeof renderProviderRatingCard === "function" ? renderProviderRatingCard(pw) : ""}
        </div>
      `;
    }
  }

  v.innerHTML = `
    <h1 class="page-title">${t("profile")}</h1>
    <div style="display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start;">
      <!-- Profile Form -->
      <div class="card" style="flex: 1 1 450px; max-width: 640px;">
        <div class="field"><label>${t("name")}</label><input id="pf_name" value="${esc(u.name || "")}" /></div>
        <div class="row">
          <div class="field"><label>${t("email")}</label><input value="${esc(u.email)}" disabled /></div>
          <div class="field"><label>${t("phone")}</label><input id="pf_phone" type="tel" maxlength="10" placeholder="10 digits" value="${esc(u.phone || "")}" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,10)" /></div>
        </div>
        <div class="field"><label>${t("language")}</label>
          <select id="pf_lang">
            <option value="en">English</option><option value="gu">ગુજરાતી</option><option value="hi">हिंदी</option>
          </select>
        </div>
        ${extra}
        <button class="btn mt" onclick="saveProfile('${role}')">${t("saveProfile")}</button>
      </div>

      <!-- Side panel (Admin Wallet / Ratings) -->
      ${sidePanel}
    </div>

    ${role !== "ADMIN" ? `
    <div class="card mt" style="max-width:640px;border-color:#e57373">
      <h2 style="color:#c62828">${t("deleteAccount")}</h2>
      <p class="muted">${t("deleteAccountWarn")}</p>
      <button class="btn danger" onclick="deleteAccount()">${t("deleteAccount")}</button>
    </div>` : ""}`;

  document.getElementById("pf_lang").value = u.preferredLanguage || currentLang;
  if (typeof feather !== "undefined") feather.replace();
}

async function saveProfile(role) {
  const phone = val("pf_phone");
  if (phone && !/^\d{10}$/.test(phone)) {
    toast(t("phoneRequired"), "error");
    return;
  }
  const body = {
    name: val("pf_name"),
    phone: phone,
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

// ================= FULLSCREEN IMAGE VIEWER WITH ZOOM (LIGHTBOX) =================
let lbState = {
  photos: [],
  index: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  startX: 0,
  startY: 0
};

function ensureLightboxElement() {
  if (document.getElementById("imageLightbox")) return;
  const div = document.createElement("div");
  div.id = "imageLightbox";
  div.className = "image-lightbox";
  div.style.display = "none";
  div.innerHTML = `
    <div class="lightbox-toolbar">
      <div class="lightbox-title" id="lightboxTitle">Photo 1 of 1</div>
      <div class="lightbox-actions">
        <button type="button" class="lb-btn" onclick="zoomImage(-0.25)" title="Zoom Out"><i data-feather="zoom-out"></i></button>
        <button type="button" class="lb-btn" onclick="resetImageZoom()" title="Reset Zoom"><span id="zoomPercent">100%</span></button>
        <button type="button" class="lb-btn" onclick="zoomImage(0.25)" title="Zoom In"><i data-feather="zoom-in"></i></button>
        <button type="button" class="lb-btn" onclick="toggleLightboxFullscreen()" title="Fullscreen"><i data-feather="maximize"></i></button>
        <button type="button" class="lb-btn close" onclick="closeImageViewer()" title="Close (Esc)"><i data-feather="x"></i></button>
      </div>
    </div>
    <div class="lightbox-viewport" id="lightboxViewport">
      <button type="button" class="lb-nav prev" id="lbPrevBtn" onclick="navLightbox(-1)" title="Previous"><i data-feather="chevron-left"></i></button>
      <div class="lightbox-img-wrap" id="lightboxImgWrap">
        <img id="lightboxImg" src="" alt="Proof Preview" draggable="false" />
      </div>
      <button type="button" class="lb-nav next" id="lbNextBtn" onclick="navLightbox(1)" title="Next"><i data-feather="chevron-right"></i></button>
    </div>
    <div class="lightbox-thumbs" id="lightboxThumbs"></div>
  `;
  document.body.appendChild(div);

  const vp = document.getElementById("lightboxViewport");

  // Mouse wheel zoom
  vp.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomImage(0.2);
    else zoomImage(-0.2);
  }, { passive: false });

  // Double click to toggle 1x / 2.2x zoom
  vp.addEventListener("dblclick", (e) => {
    if (e.target.closest(".lb-nav") || e.target.closest(".lb-btn")) return;
    if (lbState.zoom > 1.05) resetImageZoom();
    else zoomImage(1.2);
  });

  // Pan / drag
  vp.addEventListener("mousedown", (e) => {
    if (e.target.closest(".lb-nav") || e.target.closest(".lb-btn")) return;
    lbState.isDragging = true;
    lbState.startX = e.clientX - lbState.panX;
    lbState.startY = e.clientY - lbState.panY;
    vp.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!lbState.isDragging) return;
    lbState.panX = e.clientX - lbState.startX;
    lbState.panY = e.clientY - lbState.startY;
    applyImageTransform();
  });

  window.addEventListener("mouseup", () => {
    if (lbState.isDragging) {
      lbState.isDragging = false;
      const v = document.getElementById("lightboxViewport");
      if (v) v.style.cursor = lbState.zoom > 1 ? "grab" : "default";
    }
  });

  // Keyboard navigation & zoom shortcuts
  window.addEventListener("keydown", (e) => {
    const lb = document.getElementById("imageLightbox");
    if (!lb || lb.style.display === "none") return;
    if (e.key === "Escape") closeImageViewer();
    if (e.key === "ArrowLeft") navLightbox(-1);
    if (e.key === "ArrowRight") navLightbox(1);
    if (e.key === "+" || e.key === "=") zoomImage(0.25);
    if (e.key === "-") zoomImage(-0.25);
    if (e.key === "0") resetImageZoom();
  });
}

function openImageViewer(photos, startIndex = 0) {
  if (!photos) return;
  if (typeof photos === "string") photos = [photos];
  if (!Array.isArray(photos) || !photos.length) return;

  ensureLightboxElement();
  lbState.photos = photos;
  lbState.index = Math.max(0, Math.min(startIndex, photos.length - 1));
  lbState.zoom = 1;
  lbState.panX = 0;
  lbState.panY = 0;

  const lb = document.getElementById("imageLightbox");
  lb.style.display = "flex";
  document.body.style.overflow = "hidden"; // lock page scroll

  renderLightboxImage();
  if (typeof feather !== "undefined") feather.replace();
}

function renderLightboxImage() {
  const img = document.getElementById("lightboxImg");
  const title = document.getElementById("lightboxTitle");
  const prevBtn = document.getElementById("lbPrevBtn");
  const nextBtn = document.getElementById("lbNextBtn");
  const thumbsBox = document.getElementById("lightboxThumbs");

  const total = lbState.photos.length;
  const current = lbState.index + 1;
  if (title) title.textContent = total > 1 ? `Photo ${current} of ${total}` : `Photo 1 of 1`;

  if (img) {
    img.src = lbState.photos[lbState.index];
  }

  if (prevBtn) prevBtn.style.display = total > 1 ? "flex" : "none";
  if (nextBtn) nextBtn.style.display = total > 1 ? "flex" : "none";

  // render thumbnails if multiple photos
  if (thumbsBox) {
    if (total > 1) {
      thumbsBox.innerHTML = lbState.photos.map((p, i) => `
        <div class="lb-thumb ${i === lbState.index ? 'active' : ''}" onclick="selectLightboxIndex(${i})">
          <img src="${p}" alt="thumb ${i + 1}" />
        </div>
      `).join("");
      thumbsBox.style.display = "flex";
    } else {
      thumbsBox.style.display = "none";
    }
  }

  resetImageZoom();
}

function selectLightboxIndex(idx) {
  if (idx < 0 || idx >= lbState.photos.length) return;
  lbState.index = idx;
  renderLightboxImage();
}

function navLightbox(delta) {
  const total = lbState.photos.length;
  if (total <= 1) return;
  lbState.index = (lbState.index + delta + total) % total;
  renderLightboxImage();
}

function zoomImage(delta) {
  lbState.zoom = Math.max(0.5, Math.min(4.0, lbState.zoom + delta));
  applyImageTransform();
}

function resetImageZoom() {
  lbState.zoom = 1;
  lbState.panX = 0;
  lbState.panY = 0;
  applyImageTransform();
}

function applyImageTransform() {
  const img = document.getElementById("lightboxImg");
  const zp = document.getElementById("zoomPercent");
  const vp = document.getElementById("lightboxViewport");
  if (img) {
    img.style.transform = `translate(${lbState.panX}px, ${lbState.panY}px) scale(${lbState.zoom})`;
  }
  if (zp) {
    zp.textContent = `${Math.round(lbState.zoom * 100)}%`;
  }
  if (vp) {
    vp.style.cursor = lbState.zoom > 1 ? "grab" : "default";
  }
}

function toggleLightboxFullscreen() {
  const lb = document.getElementById("imageLightbox");
  if (!document.fullscreenElement) {
    if (lb.requestFullscreen) lb.requestFullscreen();
    else if (lb.webkitRequestFullscreen) lb.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function closeImageViewer() {
  const lb = document.getElementById("imageLightbox");
  if (lb) lb.style.display = "none";
  document.body.style.overflow = "";
  if (document.fullscreenElement) {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }
}

// poll notifications every 30s
setInterval(() => { if (state.user) refreshNotifBadge(); }, 30000);

// RisingField - Smart Agriculture Management System
