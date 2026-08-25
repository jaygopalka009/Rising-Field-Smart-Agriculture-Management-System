// ================= LOCALIZED CATALOGS + SHARED HELPERS =================

// Labour work skills shown as check-boxes (localized like crops).
const SKILLS = [
  { key: "ploughing",  en: "Ploughing",   gu: "ખેડ",        hi: "जुताई" },
  { key: "sowing",     en: "Sowing",      gu: "વાવણી",      hi: "बुवाई" },
  { key: "harvesting", en: "Harvesting",  gu: "લણણી",       hi: "कटाई" },
  { key: "weeding",    en: "Weeding",     gu: "નિંદામણ",    hi: "નિરાઈ" },
  { key: "irrigation", en: "Irrigation",  gu: "સિંચાઈ",     hi: "સિંચાઈ" },
  { key: "spraying",   en: "Spraying",    gu: "છંટકાવ",     hi: "છિડકાવ" },
  { key: "threshing",  en: "Threshing",   gu: "કાપણી-ઝૂડ",  hi: "ગહાઈ" },
  { key: "planting",   en: "Planting",    gu: "રોપણી",      hi: "રોપાઈ" },
  { key: "loading",    en: "Loading",     gu: "ભરાઈ",       hi: "લદાન" },
  { key: "pruning",    en: "Pruning",     gu: "છટણી",       hi: "છંટાઈ" },
];

function skillName(key) {
  if (typeof state !== "undefined" && state.categories && state.categories.WORK) {
    const c = state.categories.WORK.find(x => x.name === key);
    if (c) return catLabel(c);
  }
  const s = SKILLS.find(x => x.key === key);
  return s ? (s[currentLang] || s.en) : key;
}

// Render a check-box grid for a catalog. `selected` = array of stored keys.
function checkGrid(catalog, selected, labelFn) {
  const set = new Set(selected || []);
  const arr = catalog || [];
  return `<div class="check-grid">
    ${arr.map(item => {
      const k = item.name || item.key;
      return `<label class="check-item ${set.has(k) ? "on" : ""}">
        <input type="checkbox" value="${k}" ${set.has(k) ? "checked" : ""}
          onchange="this.parentElement.classList.toggle('on', this.checked)" />
        <span>${labelFn(item)}</span>
      </label>`;
    }).join("")}
  </div>`;
}
// Collect checked keys from a container element id.
function checkedKeys(containerId) {
  const box = document.getElementById(containerId);
  if (!box) return [];
  return [...box.querySelectorAll("input[type=checkbox]:checked")].map(c => c.value);
}

// ---- Image capture: read a File, downscale + compress to a small base64 JPEG ----
// Keeps equipment/work photos well under ~1MB so they fit in a Mongo document.
function readImageCompressed(file, maxSize, cb) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      cb(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ---- Geolocation: get the device's current lat/lng ----
function captureLocation(onOk, onFail) {
  if (!navigator.geolocation) {
    toast(t("locationUnsupported"), "error");
    if (onFail) onFail();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => onOk(pos.coords.latitude, pos.coords.longitude),
    () => { toast(t("locationDenied"), "error"); if (onFail) onFail(); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Google Maps link for a lat/lng (or null if not set).
function mapsLink(lat, lng) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// Localized label for an admin category (falls back to English name).
function catLabel(c) {
  if (!c) return "";
  if (currentLang === "gu" && c.nameGu) return c.nameGu;
  if (currentLang === "hi" && c.nameHi) return c.nameHi;
  return c.name || "";
}

// ---- Password field with a show/hide (eye) toggle ----
function pwField(id, labelKey) {
  return `<div class="field"><label>${t(labelKey)}</label>
    <div class="pw-wrap">
      <input id="${id}" type="password" />
      <button type="button" class="pw-eye" onclick="pwToggle('${id}', this)" title="${t("showPassword")}">👁</button>
    </div></div>`;
}
function pwToggle(id, btn) {
  const i = document.getElementById(id);
  if (!i) return;
  i.type = i.type === "password" ? "text" : "password";
  if (btn) btn.classList.toggle("on", i.type === "text");
}

// ---- Booking-only farm map picker (Leaflet, free, no Google API key) ----
// The default layer is satellite imagery with road labels, so farm/green land is
// easier to identify. A Road map layer is available from the layer control.
let _mapPicker = { map: null, marker: null, cb: null };

function openMapPicker(onPick, startLat, startLng, initialPlace = "") {
  _mapPicker.cb = onPick;
  // Selected booking point first; otherwise Gujarat. The district search moves it
  // to the farmer's own district (e.g. Junagadh / Surendranagar).
  const lat = startLat ?? 22.3;
  const lng = startLng ?? 71.7;
  const zoom = startLat != null ? 15 : 7;

  // own overlay on top of everything (booking modal stays open behind it)
  let back = document.getElementById("mapPickBack");
  if (!back) {
    back = document.createElement("div");
    back.id = "mapPickBack";
    back.className = "modal-back open";
    back.style.zIndex = "300";
    document.body.appendChild(back);
  }
  back.className = "modal-back open";
  back.innerHTML = `<div class="modal">
    <h2>🗺️ ${t("pickOnMap")}</h2>
    <p class="muted">${t("mapHint")}</p>
    <div class="row" style="margin-bottom:8px">
      <input id="mapPlaceSearch" style="flex:1" value="${esc(initialPlace)}"
        placeholder="${t("searchFarmPlace")}" onkeydown="if(event.key==='Enter')searchFarmPlace()" />
      <button type="button" class="btn blue sm" onclick="searchFarmPlace()">🔍 ${t("search")}</button>
    </div>
    <p class="muted" id="mapSearchInfo" style="margin-top:0"></p>
    <div id="pickMap" style="height:320px;border-radius:10px"></div>
    <div class="modal-actions">
      <button class="btn secondary" onclick="closeMapPicker()">${t("cancel")}</button>
      <button class="btn" onclick="confirmMapPick()">${t("useThisLocation")}</button>
    </div></div>`;

  // overlay DOM render thay pachi j Leaflet init thay
  setTimeout(() => {
    _mapPicker.map = L.map("pickMap").setView([lat, lng], zoom);
    const roadMap = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
    });
    const farmSatellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Tiles &copy; Esri" }
    );
    const roadLabels = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Labels &copy; Esri" }
    );
    const greenFarmMap = L.layerGroup([farmSatellite, roadLabels]).addTo(_mapPicker.map);
    L.control.layers({
      [t("greenFarmMap")]: greenFarmMap,
      [t("roadMap")]: roadMap,
    }, null, { collapsed: false }).addTo(_mapPicker.map);
    _mapPicker.marker = L.marker([lat, lng], { draggable: true }).addTo(_mapPicker.map);
    // map par click karo etle marker tya jay
    _mapPicker.map.on("click", (e) => _mapPicker.marker.setLatLng(e.latlng));
    if (initialPlace && startLat == null) searchFarmPlace();
  }, 60);
}

// Search once on button/Enter (not on every keystroke). Gujarat is appended so
// "Junagadh" or "Surendranagar" opens the Gujarat location instead of another state.
async function searchFarmPlace() {
  const input = document.getElementById("mapPlaceSearch");
  const info = document.getElementById("mapSearchInfo");
  const place = input ? input.value.trim() : "";
  if (!place) { if (info) info.textContent = t("searchFarmPlace"); return; }
  if (info) info.textContent = t("searchingLocation");
  try {
    const q = /gujarat/i.test(place) ? place : `${place}, Gujarat, India`;
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=" + encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const list = await res.json();
    if (!list.length || !_mapPicker.map || !_mapPicker.marker) {
      if (info) info.textContent = t("locationNotFound");
      return;
    }
    const lat = Number(list[0].lat), lng = Number(list[0].lon);
    _mapPicker.map.setView([lat, lng], 14);
    _mapPicker.marker.setLatLng([lat, lng]);
    if (info) info.innerHTML = `<i data-feather="map-pin" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i><span style="vertical-align: middle;">${esc(list[0].display_name)}</span>`;
  } catch {
    if (info) info.textContent = t("locationNotFound");
  }
}

function confirmMapPick() {
  const p = _mapPicker.marker ? _mapPicker.marker.getLatLng() : null;
  const cb = _mapPicker.cb;
  closeMapPicker();
  if (p && cb) cb(+p.lat.toFixed(6), +p.lng.toFixed(6));
}

function closeMapPicker() {
  if (_mapPicker.map) { _mapPicker.map.remove(); _mapPicker.map = null; }
  _mapPicker.marker = null;
  _mapPicker.cb = null;
  const back = document.getElementById("mapPickBack");
  if (back) back.remove();
}
