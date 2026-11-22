// account.js — APEX MOTORS Customer Portal
"use strict";

const API = "http://localhost:3000/api";

// ── Guard: must be logged in ──────────────────────────────────────────────────
(function () {
  if (!APEX_AUTH.isLoggedIn()) {
    sessionStorage.setItem("apex_return", window.location.href);
    window.location.replace("/login.html");
  }
})();

// ── Helpers ───────────────────────────────────────────────────────────────────
function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${APEX_AUTH.getToken()}` };
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-EG", { year: "numeric", month: "short", day: "numeric" });
}
function setLoading(btnId, loading, defaultText) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.textContent = loading ? "Saving…" : defaultText;
}

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll(".acct-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".acct-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".acct-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.panel).classList.add("active");
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadProfile(), loadStats(), loadInquiries()]);

  // Name form
  document.getElementById("name-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("pf-name").value.trim();
    const errEl = document.getElementById("name-error");
    errEl.className = "pf-error";
    errEl.textContent = "";
    if (!name || name.length < 2) { errEl.textContent = "Name must be at least 2 characters."; return; }

    setLoading("name-submit", true, "Save Name");
    try {
      const res = await fetch(`${API}/account/profile`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ name }) });
      const data = await res.json();
      if (!res.ok) { errEl.textContent = data.message || "Update failed."; return; }
      // Update stored user
      const user = APEX_AUTH.getUser();
      APEX_AUTH.saveSession(APEX_AUTH.getToken(), { ...user, name: data.user.name });
      document.getElementById("account-name").textContent = data.user.name;
      document.getElementById("account-avatar").textContent = data.user.name.charAt(0).toUpperCase();
      errEl.className = "pf-error pf-success";
      errEl.textContent = "✓ Name updated successfully";
    } catch { errEl.textContent = "Network error."; }
    finally { setLoading("name-submit", false, "Save Name"); }
  });

  // Password form
  document.getElementById("pwd-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById("pf-current").value;
    const newPassword = document.getElementById("pf-new").value;
    const confirm = document.getElementById("pf-confirm").value;
    const errEl = document.getElementById("pwd-error");
    errEl.className = "pf-error";
    errEl.textContent = "";

    if (newPassword !== confirm) { errEl.textContent = "Passwords do not match."; return; }
    if (newPassword.length < 8) { errEl.textContent = "New password must be at least 8 characters."; return; }

    setLoading("pwd-submit", true, "Update Password");
    try {
      const res = await fetch(`${API}/account/profile`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await res.json();
      if (!res.ok) { errEl.textContent = data.message || "Update failed."; return; }
      document.getElementById("pwd-form").reset();
      errEl.className = "pf-error pf-success";
      errEl.textContent = "✓ Password changed successfully";
    } catch { errEl.textContent = "Network error."; }
    finally { setLoading("pwd-submit", false, "Update Password"); }
  });

  // Sign out
  document.getElementById("signout-btn").addEventListener("click", () => {
    APEX_AUTH.clearSession();
    window.location.replace("/");
  });
});

// ── Load profile ──────────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await fetch(`${API}/account/profile`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) return;
    const u = data.user;
    document.getElementById("account-name").textContent = u.name;
    document.getElementById("account-email").textContent = u.email;
    document.getElementById("account-avatar").textContent = u.name.charAt(0).toUpperCase();
    document.getElementById("pf-name").value = u.name;
    document.title = `${u.name} — APEX MOTORS`;
  } catch { /* use cached user */
    const u = APEX_AUTH.getUser();
    if (u) {
      document.getElementById("account-name").textContent = u.name;
      document.getElementById("account-email").textContent = u.email;
      document.getElementById("account-avatar").textContent = u.name.charAt(0).toUpperCase();
      document.getElementById("pf-name").value = u.name;
    }
  }
}

// ── Load stats ────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/account/stats`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) return;
    const s = data.stats;
    document.getElementById("stat-total").textContent = s.total;
    document.getElementById("stat-pending").textContent = s.pending;
    document.getElementById("stat-contacted").textContent = s.contacted;
    document.getElementById("stat-closed").textContent = s.closed;
  } catch { }
}

// ── Load inquiries ────────────────────────────────────────────────────────────
async function loadInquiries() {
  const container = document.getElementById("inquiries-content");
  try {
    const res = await fetch(`${API}/account/inquiries`, { headers: authHeaders() });
    const data = await res.json();

    if (!data.success || !data.inquiries?.length) {
      container.innerHTML = `
        <div class="inq-empty">
          <div class="inq-empty-icon">🚗</div>
          <div class="inq-empty-title">No Inquiries Yet</div>
          <p class="inq-empty-sub">You haven't submitted any vehicle inquiries.<br/>Browse our collection and find your perfect vehicle.</p>
          <a href="/inventory.html" class="inq-empty-btn">Browse Inventory</a>
        </div>`;
      return;
    }

    const badgeMap = {
      new: { cls: "inq-badge--new", label: "Pending" },
      contacted: { cls: "inq-badge--contacted", label: "Contacted" },
      closed: { cls: "inq-badge--closed", label: "Closed" },
    };

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table class="inq-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Price</th>
              <th>Your Message</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.inquiries.map(i => {
      const badge = badgeMap[i.status] || badgeMap.new;
      const carAvail = i.car_status === "available" && i.stock > 0;
      return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:12px">
                    ${i.car_img
          ? `<img src="${i.car_img}" class="inq-car-thumb" alt="${i.vehicle_name}"/>`
          : `<div class="inq-car-thumb" style="display:flex;align-items:center;justify-content:center;font-size:0.55rem;color:var(--text-muted)">No img</div>`
        }
                    <div>
                      <div style="font-weight:600">${i.vehicle_name}</div>
                      ${carAvail
          ? `<a href="/inventory.html" style="font-size:0.6rem;color:var(--gold);text-decoration:none">Still available →</a>`
          : `<span style="font-size:0.6rem;color:var(--text-muted)">${i.car_status === "sold" ? "Now sold" : "—"}</span>`
        }
                    </div>
                  </div>
                </td>
                <td class="inq-td-muted">${i.vehicle_price ? "$" + Number(i.vehicle_price).toLocaleString() : "—"}</td>
                <td style="max-width:200px">
                  <div style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px" title="${i.message || ""}">
                    ${i.message || "—"}
                  </div>
                </td>
                <td class="inq-td-muted">${fmtDate(i.submitted_at)}</td>
                <td><span class="inq-badge ${badge.cls}">${badge.label}</span></td>
              </tr>`;
    }).join("")}
          </tbody>
        </table>
      </div>`;
  } catch {
    container.innerHTML = `<div class="inq-empty"><p style="color:var(--error)">Failed to load inquiries. Please refresh the page.</p></div>`;
  }
}
