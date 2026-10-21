// Thin fetch wrapper that attaches the JWT and parses JSON/errors.
// MODIFIED FOR PRODUCTION DYNAMIC MODE: Communicates directly with Spring Boot backend endpoints.

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes (180,000 ms)

const API = {
  token: () => sessionStorage.getItem("token"),
  setAuth(token, user) {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("rf_last_activity", Date.now().toString());
  },
  clearAuth() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("rf_last_activity");
  },
  user() {
    try {
      const u = sessionStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  },
  touch() {
    if (sessionStorage.getItem("token")) {
      sessionStorage.setItem("rf_last_activity", Date.now().toString());
    }
  },
  isExpired() {
    if (!sessionStorage.getItem("token")) return false;
    const last = Number(sessionStorage.getItem("rf_last_activity") || 0);
    if (!last) return false;
    return (Date.now() - last) >= INACTIVITY_TIMEOUT_MS;
  },
  handleExpire() {
    if (!sessionStorage.getItem("token")) return;
    API.clearAuth();
    if (typeof state !== "undefined") {
      state.user = null;
      state.page = null;
    }
    const msg = (typeof t === "function") 
      ? t("sessionExpired") 
      : "Your session has expired due to 3 minutes of inactivity. Please login again.";
    if (typeof toast === "function") toast(msg, "error");
    
    if (typeof showAuth === "function") {
      showAuth();
    } else if (typeof handleLogout === "function") {
      handleLogout();
    } else if (typeof goHash === "function") {
      goHash("#/login");
    } else {
      location.reload();
    }
  },

  async req(method, path, body) {
    if (API.isExpired()) {
      API.handleExpire();
      throw new Error("Session expired due to 3 minutes of inactivity");
    }

    const headers = { "Content-Type": "application/json" };
    const tk = API.token();
    if (tk) headers["Authorization"] = "Bearer " + tk;

    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) {
      if (res.status === 401) {
        API.handleExpire();
      }
      let errMsg = "Request failed";
      try {
        const errJson = await res.json();
        errMsg = errJson.error || errJson.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    API.touch();
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  },

  get(p) { return API.req("GET", p); },
  post(p, b) { return API.req("POST", p, b); },
  put(p, b) { return API.req("PUT", p, b); },
  patch(p, b) { return API.req("PATCH", p, b); },
  del(p) { return API.req("DELETE", p); },
};

// ---- User activity listener for 3-minute auto-logout ----
(function initInactivityTracker() {
  let throttle = null;
  const recordActivity = () => {
    if (!sessionStorage.getItem("token")) return;
    if (throttle) return;
    throttle = setTimeout(() => {
      throttle = null;
      API.touch();
    }, 1500);
  };

  const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
  activityEvents.forEach(evt => window.addEventListener(evt, recordActivity, { passive: true }));

  // Check on tab visibility or device wake up (focus/resume)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (API.isExpired()) API.handleExpire();
    }
  });

  window.addEventListener("focus", () => {
    if (API.isExpired()) API.handleExpire();
  });

  // Background heartbeat check every 5 seconds
  setInterval(() => {
    if (API.isExpired()) API.handleExpire();
  }, 5000);
})();

// ---- UI helpers ----
function toast(msg, type = "") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  let iconName = "";
  if (type === "error") iconName = "alert-circle";
  else if (type === "success") iconName = "check-circle";
  else if (type === "info") iconName = "info";

  const iconTag = iconName ? `<i data-feather="${iconName}" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;display:inline-block;"></i>` : "";
  el.innerHTML = `${iconTag}<span>${esc(msg)}</span>`;
  el.className = "toast show " + type;
  if (typeof feather !== "undefined") feather.replace();
  setTimeout(() => { el.className = "toast " + type; }, 3200);
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// rate unit translation mapper
function typeKey(tp) {
  return { ONE_DAY: "oneDay", MULTIPLE_DAYS: "multipleDays", MONTHLY: "monthly" }[tp] || tp;
}

function fmtDate(d) {
  if (!d) return "-";
  const s = String(d).substring(0, 10);
  const parts = s.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return s;
}

function money(n) {
  if (n == null) return "₹0";
  return "₹" + Number(n).toLocaleString("en-IN");
}

// RisingField - Smart Agriculture Management System
