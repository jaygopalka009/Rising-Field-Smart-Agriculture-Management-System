// Thin fetch wrapper that attaches the JWT and parses JSON/errors.
// MODIFIED FOR PRODUCTION DYNAMIC MODE: Communicates directly with Spring Boot backend endpoints.

const API = {
  token: () => sessionStorage.getItem("token"),
  setAuth(token, user) {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
  },
  clearAuth() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
  },
  user() {
    try {
      const u = sessionStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  },

  async req(method, path, body) {
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
        API.clearAuth();
        if (typeof showAuth === "function") showAuth();
      }
      let errMsg = "Request failed";
      try {
        const errJson = await res.json();
        errMsg = errJson.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
  },

  get(p) { return API.req("GET", p); },
  post(p, b) { return API.req("POST", p, b); },
  put(p, b) { return API.req("PUT", p, b); },
  patch(p, b) { return API.req("PATCH", p, b); },
  del(p) { return API.req("DELETE", p); },
};

// ---- UI helpers ----
function toast(msg, type = "") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = "toast show " + type;
  setTimeout(() => { el.className = "toast " + type; }, 2800);
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
  return String(d).substring(0, 10);
}

function money(n) {
  if (n == null) return "₹0";
  return "₹" + Number(n).toLocaleString("en-IN");
}
