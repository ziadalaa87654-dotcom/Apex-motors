// login.js — APEX MOTORS Login / Register page logic
"use strict";

const API = "http://localhost:3000/api/auth";

// ── Redirect if already logged in ────────────────────────────────────────────
if (APEX_AUTH.isLoggedIn()) {
  window.location.replace(document.referrer || "/inventory.html");
}

// ── Tab switching ─────────────────────────────────────────────────────────────
const tabLogin    = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const panelLogin  = document.getElementById("panel-login");
const panelReg    = document.getElementById("panel-register");

function showTab(tab) {
  const isLogin = tab === "login";
  tabLogin   .classList.toggle("active",  isLogin);
  tabRegister.classList.toggle("active", !isLogin);
  panelLogin .classList.toggle("active",  isLogin);
  panelReg   .classList.toggle("active", !isLogin);
  clearErrors();
}

tabLogin   .addEventListener("click", () => showTab("login"));
tabRegister.addEventListener("click", () => showTab("register"));
document.getElementById("go-register").addEventListener("click", () => showTab("register"));
document.getElementById("go-login")   .addEventListener("click", () => showTab("login"));

// ── Password visibility toggle ────────────────────────────────────────────────
function toggleEye(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  btn.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.innerHTML  = show ? "&#128064;" : "&#128065;";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
}
toggleEye("login-password", "login-eye");
toggleEye("reg-password",   "reg-eye");

// ── Helpers ───────────────────────────────────────────────────────────────────
function setLoading(formId, loading) {
  const btn    = document.getElementById(formId === "login-form" ? "login-submit" : "register-submit");
  const text   = btn.querySelector(".lf-submit-text");
  const spin   = btn.querySelector(".lf-spinner");
  btn.disabled = loading;
  text.hidden  = loading;
  spin.hidden  = !loading;
}

function showError(panelId, msg) {
  const el = document.getElementById(panelId === "panel-login" ? "login-error" : "register-error");
  el.textContent = msg;
}

function clearErrors() {
  document.getElementById("login-error")   .textContent = "";
  document.getElementById("register-error").textContent = "";
}

function onAuthSuccess(data) {
  APEX_AUTH.saveSession(data.token, data.user);
  // Go back to where the user came from, or inventory
  const returnTo = sessionStorage.getItem("apex_return") || "/inventory.html";
  sessionStorage.removeItem("apex_return");
  window.location.replace(returnTo);
}

// ── Login ─────────────────────────────────────────────────────────────────────
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    return showError("panel-login", "Please enter your email and password.");
  }

  setLoading("login-form", true);
  try {
    const res  = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      return showError("panel-login", data.message || "Login failed. Please try again.");
    }
    onAuthSuccess(data);
  } catch {
    showError("panel-login", "Network error. Please check your connection.");
  } finally {
    setLoading("login-form", false);
  }
});

// ── Register ──────────────────────────────────────────────────────────────────
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const name     = document.getElementById("reg-name").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirm  = document.getElementById("reg-confirm").value;

  if (!name || !email || !password || !confirm) {
    return showError("panel-register", "Please fill in all fields.");
  }
  if (password !== confirm) {
    return showError("panel-register", "Passwords do not match.");
  }
  if (password.length < 8) {
    return showError("panel-register", "Password must be at least 8 characters.");
  }

  setLoading("register-form", true);
  try {
    const res  = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      const msg = data.errors ? data.errors.join(" ") : (data.message || "Registration failed.");
      return showError("panel-register", msg);
    }
    onAuthSuccess(data);
  } catch {
    showError("panel-register", "Network error. Please check your connection.");
  } finally {
    setLoading("register-form", false);
  }
});
