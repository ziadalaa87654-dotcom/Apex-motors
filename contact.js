// contact.js — APEX MOTORS frontend form handler

// ── Config ────────────────────────────────────────────────
const API_URL = "http://localhost:3000/api/contact";

// ── Nav scroll state ──────────────────────────────────────
const nav = document.getElementById("nav");

window.addEventListener("scroll", () => {
  if (nav) nav.classList.toggle("scrolled", window.scrollY > 50);
});

// ── Active nav link ───────────────────────────────────────
document.querySelectorAll(".nav-links a").forEach((link) => {
  if (link.getAttribute("href") === "contact.html") {
    link.style.color = "var(--gold)";
  }
});

// ── Select focus effects ──────────────────────────────────
const select = document.querySelector("select");

if (select) {
  select.addEventListener("focus", function () {
    this.style.borderColor = "var(--gold)";
    this.style.background = "rgba(201, 168, 76, 0.08)";
  });
  select.addEventListener("blur", function () {
    this.style.borderColor = "var(--border)";
    this.style.background = "rgba(201, 168, 76, 0.03)";
  });
}

// ── Local storage fallback ────────────────────────────────
const LS_KEY = "apex_contact_messages";

function saveMessageLocally(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    existing.push({ id: Date.now(), submittedAt: new Date().toISOString(), status: "pending", ...payload });
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
    console.log("[Apex] Contact message saved locally (", existing.length, "pending)");
  } catch (err) {
    console.error("[Apex] localStorage save failed:", err);
  }
}

async function syncLocalMessages() {
  let pending;
  try {
    pending = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch { return; }
  if (!pending.length) return;

  const synced = [];
  for (const msg of pending) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) synced.push(msg.id);
    } catch {
      break;
    }
  }

  if (synced.length) {
    const remaining = pending.filter((m) => !synced.includes(m.id));
    localStorage.setItem(LS_KEY, JSON.stringify(remaining));
    console.log("[Apex] Synced " + synced.length + " offline contact message(s) to server");
  }
}

syncLocalMessages().catch(() => {});

// ── Form submission ───────────────────────────────────────
const form = document.querySelector(".contact-form");

if (form) {
  const submitBtn = form.querySelector(".form-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors();

    const payload = {
      firstName: form.firstName.value.trim(),
      lastName:  form.lastName.value.trim(),
      email:     form.email.value.trim(),
      phone:     form.phone.value.trim(),
      subject:   form.subject.value,
      message:   form.message.value.trim(),
    };

    const clientError = validateLocally(payload);
    if (clientError) {
      showFieldError(clientError.field, clientError.message);
      showToast("Please correct the highlighted fields.", "error");
      return;
    }

    setLoading(true);

    let savedToServer = false;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        savedToServer = true;
        showToast("Message saved! We'll deliver it once the connection is restored.", "success");
        form.reset();
      } else if (res.status === 422 && data.errors) {
        data.errors.forEach(({ field, message }) => showFieldError(field, message));
        showToast("Please correct the highlighted fields.", "error");
      } else {
        throw new Error(data.message || "Server error");
      }
    } catch (err) {
      if (!savedToServer) {
        saveMessageLocally(payload);
        console.warn("[Apex] Server unreachable, message saved locally:", err.message);
        showToast(
          "Message saved! We'll deliver it once the connection is restored.",
          "offline"
        );
        form.reset();
      }
    } finally {
      setLoading(false);
    }
  });

  function validateLocally(p) {
    if (!p.firstName || p.firstName.length < 2)
      return { field: "firstName", message: "First name is required (min 2 chars)." };
    if (!p.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
      return { field: "email", message: "A valid email address is required." };
    if (!p.message || p.message.length < 10)
      return { field: "message", message: "Message is required (min 10 chars)." };
    return null;
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? "Sending..." : "Send Message";
    submitBtn.style.opacity = loading ? "0.7" : "1";
  }

  function showFieldError(fieldName, message) {
    const input = form.querySelector('[name="' + fieldName + '"]');
    if (!input) return;
    input.style.borderColor = "#e05c5c";

    const errEl = document.createElement("span");
    errEl.className = "field-error";
    errEl.textContent = message;
    errEl.style.cssText = "display:block;color:#e05c5c;font-size:12px;margin-top:4px;";
    input.parentElement.appendChild(errEl);

    input.addEventListener("input", () => {
      input.style.borderColor = "";
      errEl.remove();
    }, { once: true });
  }

  function clearFieldErrors() {
    form.querySelectorAll(".field-error").forEach((el) => el.remove());
    form.querySelectorAll("input, select, textarea").forEach((el) => {
      el.style.borderColor = "";
    });
  }

  function showToast(message, type) {
    type = type || "success";
    document.querySelector(".apex-toast") && document.querySelector(".apex-toast").remove();

    var colors = {
      success: { bg: "#1a2a1a", text: "#7ec87e", border: "#4a8a4a" },
      error:   { bg: "#2a1a1a", text: "#e07070", border: "#8a4a4a" },
      offline: { bg: "#1a1e2a", text: "#c9a84c", border: "#c9a84c" },
    };
    var c = colors[type] || colors.success;

    var toast = document.createElement("div");
    toast.className = "apex-toast";
    toast.textContent = message;
    toast.style.cssText = [
      "position:fixed", "bottom:32px", "left:50%",
      "transform:translateX(-50%) translateY(20px)",
      "background:" + c.bg, "color:" + c.text, "border:1px solid " + c.border,
      "padding:14px 28px", "border-radius:4px",
      "font-family:'Barlow Condensed',sans-serif",
      "font-size:14px", "letter-spacing:1px", "z-index:9999",
      "box-shadow:0 8px 32px rgba(0,0,0,0.4)", "opacity:0",
      "transition:opacity 0.3s ease,transform 0.3s ease",
      "max-width:460px", "text-align:center",
    ].join(";");
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });

    var duration = type === "error" ? 4000 : 5000;
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(20px)";
      setTimeout(function () { toast.remove(); }, 300);
    }, duration);
  }
}
