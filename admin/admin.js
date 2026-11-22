// admin/admin.js — Shared admin utilities for all admin pages
"use strict";

const ADMIN_API = "http://localhost:3000/api";

// ── Auth guard ────────────────────────────────────────────────────────────────
(function() {
  const token = localStorage.getItem("apex_token");
  const user  = (() => { try { return JSON.parse(localStorage.getItem("apex_user")); } catch { return null; } })();

  if (!token || !user) {
    // Not logged in at all → send to login, then come back
    sessionStorage.setItem("apex_return", window.location.href);
    window.location.replace("/login.html");
    return;
  }

  if (user.role !== "admin") {
    // Logged in but not an admin → forbidden
    window.location.replace("/unauthorized.html");
  }
})();

// ── API helper ────────────────────────────────────────────────────────────────
async function adminFetch(path, options = {}) {
  const token = localStorage.getItem("apex_token");
  const res = await fetch(`${ADMIN_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("apex_token");
    localStorage.removeItem("apex_user");
    window.location.replace("/login.html");
    return;
  }
  return res;
}

// ── Toast notifications ───────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `admin-toast admin-toast--${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-EG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtPrice(p) {
  if (!p && p !== 0) return "—";
  return "$" + Number(p).toLocaleString();
}

function statusBadge(status, map) {
  const cfg = map[status] || { label: status, cls: "badge--gray" };
  return `<span class="badge ${cfg.cls}">${cfg.label}</span>`;
}

// ── Render sidebar ────────────────────────────────────────────────────────────
function renderSidebar(active) {
  const user = (() => { try { return JSON.parse(localStorage.getItem("apex_user")); } catch { return {}; } })();
  const links = [
    { id: "dashboard",  href: "/admin/dashboard.html",  icon: "⬛", label: "Dashboard" },
    { id: "inquiries",  href: "/admin/inquiries.html",  icon: "📋", label: "Inquiries" },
    { id: "contacts",   href: "/admin/contacts.html",   icon: "✉️",  label: "Messages" },
    { id: "cars",       href: "/admin/cars.html",       icon: "🚗", label: "Inventory" },
    { id: "users",      href: "/admin/users.html",      icon: "👤", label: "Users" },
  ];
  const nav = links.map(l => `
    <a href="${l.href}" class="sidebar-link ${l.id === active ? "active" : ""}">
      <span class="sidebar-icon">${l.icon}</span>
      <span>${l.label}</span>
    </a>`).join("");

  const sidebar = document.getElementById("admin-sidebar");
  if (!sidebar) return;
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-logo">A</div>
      <div>
        <div class="sidebar-name">APEX MOTORS</div>
        <div class="sidebar-role">Admin Panel</div>
      </div>
    </div>
    <nav class="sidebar-nav">${nav}</nav>
    <div class="sidebar-user">
      <div class="sidebar-user-name">${user.name || "Admin"}</div>
      <div class="sidebar-user-email">${user.email || ""}</div>
      <button class="sidebar-logout" id="sidebar-logout-btn">Sign Out</button>
    </div>
  `;
  document.getElementById("sidebar-logout-btn").addEventListener("click", () => {
    localStorage.removeItem("apex_token");
    localStorage.removeItem("apex_user");
    window.location.replace("/");
  });
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function adminConfirm(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-box">
        <p>${msg}</p>
        <div class="confirm-actions">
          <button class="btn-admin btn-admin--danger" id="conf-yes">Confirm</button>
          <button class="btn-admin btn-admin--ghost" id="conf-no">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#conf-yes").addEventListener("click", () => { overlay.remove(); resolve(true); });
    overlay.querySelector("#conf-no").addEventListener("click",  () => { overlay.remove(); resolve(false); });
  });
}
