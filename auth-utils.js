// auth-utils.js — Shared auth utilities for all APEX MOTORS pages
// Include this script on every HTML page BEFORE page-specific scripts.

const APEX_AUTH = (() => {
  const TOKEN_KEY = "apex_token";
  const USER_KEY  = "apex_user";
  const API       = "http://localhost:3000/api/auth";

  function getToken()  { return localStorage.getItem(TOKEN_KEY); }
  function getUser()   { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
  function isLoggedIn(){ return !!getToken(); }
  function isAdmin()   { const u = getUser(); return u && u.role === "admin"; }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function authHeaders() {
    const t = getToken();
    return t ? { "Content-Type": "application/json", "Authorization": `Bearer ${t}` }
             : { "Content-Type": "application/json" };
  }

  // Renders the correct nav link (Login vs. user name + logout)
  function renderNavAuth() {
    const slot = document.getElementById("nav-auth-slot");
    if (!slot) return;

    const user = getUser();
    if (user) {
      slot.innerHTML = `
        <div class="nav-user-menu" id="nav-user-menu">
          <button class="nav-user-btn" id="nav-user-btn">
            <span class="nav-user-icon">&#9675;</span>
            <span>${user.name.split(" ")[0]}</span>
            <span style="font-size:0.5rem;opacity:0.6">&#9660;</span>
          </button>
          <div class="nav-user-dropdown" id="nav-user-dropdown">
            <div class="nav-user-info">
              <div class="nui-name">${user.name}</div>
              <div class="nui-email">${user.email}</div>
              <a href="/account.html" class="nui-link">My Account &amp; Inquiries</a>
              ${user.role === "admin" ? `<br/><a href="/admin/dashboard.html" class="nui-link" style="color:#e07070">Admin Panel</a>` : ""}
            </div>
            <button class="nav-logout-btn" id="nav-logout-btn">Sign Out</button>
          </div>
        </div>
      `;
      document.getElementById("nav-user-btn").addEventListener("click", () => {
        document.getElementById("nav-user-dropdown").classList.toggle("open");
      });
      document.getElementById("nav-logout-btn").addEventListener("click", () => {
        clearSession();
        window.location.href = "/";
      });
      // Close dropdown on outside click
      document.addEventListener("click", (e) => {
        const menu = document.getElementById("nav-user-menu");
        if (menu && !menu.contains(e.target)) {
          const dd = document.getElementById("nav-user-dropdown");
          if (dd) dd.classList.remove("open");
        }
      });
    } else {
      slot.innerHTML = `<a href="/login.html" class="nav-login-link">Login</a>`;
    }
  }

  // Pre-fill a form with logged-in user's details
  function prefillForm(nameId, emailId) {
    const user = getUser();
    if (!user) return;
    const nameEl  = document.getElementById(nameId);
    const emailEl = document.getElementById(emailId);
    if (nameEl  && !nameEl.value)  nameEl.value  = user.name;
    if (emailEl && !emailEl.value) emailEl.value = user.email;
  }

  // Verify token with server (returns user or null)
  async function verifyToken() {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { clearSession(); return null; }
      const data = await res.json();
      return data.user;
    } catch { return null; }
  }

  // Init: render nav on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", renderNavAuth);

  return { getToken, getUser, isLoggedIn, isAdmin, saveSession, clearSession, authHeaders, prefillForm, verifyToken, renderNavAuth };
})();
