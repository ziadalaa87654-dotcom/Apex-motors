// ─── CONFIG ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:3000/api";

// ─── EMAILJS CONFIG ────────────────────────────────────────────────────────
// Sign up free at https://www.emailjs.com → get Service ID, Template IDs, Public Key
const EMAILJS_CONFIG = {
  publicKey: "",
  serviceId: "",
  dealerTemplateId: "",
  clientTemplateId: "",
};
(function initEmailJS() {
  if (typeof emailjs !== "undefined") {
    emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
  }
})();

// ─── HELPERS ───────────────────────────────────────────────────────────────
function formatPrice(n) {
  return "$" + n.toLocaleString("en-US");
}

function badgeHTML(badge) {
  if (!badge) return "";
  const labels = { new: "New Arrival", certified: "CPO", sale: "Price Drop" };
  return `<span class="car-badge ${badge}">${labels[badge] || badge}</span>`;
}

// ── Stock / availability helpers ────────────────────────────────────────────
function stockBadgeHTML(status, stock) {
  if (status === "sold")     return `<span class="stock-tag stock-tag--sold">Sold</span>`;
  if (status === "reserved") return `<span class="stock-tag stock-tag--reserved">Reserved</span>`;
  if (stock  === 0)          return `<span class="stock-tag stock-tag--out">Out of Stock</span>`;
  if (stock  === 1)          return `<span class="stock-tag stock-tag--last">Last Unit</span>`;
  return `<span class="stock-tag stock-tag--ok">${stock} Available</span>`;
}

function stockOverlayHTML(status, stock) {
  if (status === "sold")     return `<div class="stock-overlay stock-overlay--sold"><span>SOLD</span></div>`;
  if (status === "reserved") return `<div class="stock-overlay stock-overlay--reserved"><span>RESERVED</span></div>`;
  if (stock  === 0)          return `<div class="stock-overlay stock-overlay--out"><span>UNAVAILABLE</span></div>`;
  return "";
}

function mileageLabel(m) {
  if (m < 1000) return m + " mi";
  return (m / 1000).toFixed(1) + "k mi";
}

// ─── CARD BUILDER ──────────────────────────────────────────────────────────
function buildCard(car) {
  const stock       = (car.stock  != null) ? Number(car.stock)  : 1;
  const status      = car.status  || "available";
  const unavailable = status === "sold" || status === "reserved" || stock === 0;

  const div = document.createElement("div");
  div.className   = "car-card" + (unavailable ? " car-unavailable" : "");
  div.dataset.id      = car.id;
  div.dataset.cats    = (car.category || []).join(",");
  div.dataset.price   = car.price;
  div.dataset.year    = car.year;
  div.dataset.mileage = car.mileage;
  div.dataset.search  = (car.year + " " + car.make + " " + car.model).toLowerCase();
  div.dataset.stock   = stock;
  div.dataset.status  = status;

  const inquireBtn = unavailable
    ? `<button class="view-btn view-btn--unavailable" disabled>${
        status === "sold" ? "Sold" : status === "reserved" ? "Reserved" : "Unavailable"
      }</button>`
    : `<button class="view-btn">Inquire</button>`;

  div.innerHTML = `
    <div class="car-image-wrap">
      <img src="${car.img}" alt="${car.year} ${car.make} ${car.model}" loading="lazy">
      ${badgeHTML(car.badge)}
      <span class="car-mileage-overlay">${mileageLabel(car.mileage)}</span>
      ${stockOverlayHTML(status, stock)}
    </div>
    <div class="car-info">
      <div class="car-year-make">${car.year} ${car.make}</div>
      <div class="car-name">${car.model}</div>
      <div class="car-specs">
        <div class="spec"><span class="spec-val">${car.hp}</span><span class="spec-lbl">Power</span></div>
        <div class="spec"><span class="spec-val">${car.engine}</span><span class="spec-lbl">Engine</span></div>
        <div class="spec"><span class="spec-val">${mileageLabel(car.mileage)}</span><span class="spec-lbl">Odometer</span></div>
      </div>
      <div class="car-footer">
        <div class="car-price-wrap">
          <div class="car-price">$${car.price.toLocaleString()}</div>
          ${stockBadgeHTML(status, stock)}
        </div>
        ${inquireBtn}
      </div>
    </div>
  `;
  return div;
}

// ─── STATE ─────────────────────────────────────────────────────────────────
let allCars = [];
let currentFilter = "all";
let currentSearch = "";
let currentSort = "default";

// ─── RENDER ────────────────────────────────────────────────────────────────
function render() {
  const filtered = allCars.filter((c) => {
    const catOk = currentFilter === "all" || (c.category || []).includes(currentFilter);
    const searchOk =
      !currentSearch ||
      (c.year + " " + c.make + " " + c.model)
        .toLowerCase()
        .includes(currentSearch);
    return catOk && searchOk;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (currentSort === "price-asc") return a.price - b.price;
    if (currentSort === "price-desc") return b.price - a.price;
    if (currentSort === "year-desc") return b.year - a.year;
    if (currentSort === "year-asc") return a.year - b.year;
    if (currentSort === "mileage-asc") return a.mileage - b.mileage;
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  const grid = document.getElementById("inventory-grid");
  grid.innerHTML = "";
  sorted.forEach((car) => grid.appendChild(buildCard(car)));
  document.getElementById("visible-count").textContent = sorted.length;

  // Attach image error handlers to newly created cards
  grid.querySelectorAll(".car-image-wrap img").forEach((img) => {
    img.addEventListener("error", function () {
      if (this.dataset.errored) return;
      this.dataset.errored = "1";
      const fallback = document.createElement("div");
      fallback.className = "image-fallback";
      fallback.textContent = this.alt || "Car Image";
      this.parentNode.appendChild(fallback);
      this.style.display = "none";
    });
  });

  // Update hero stat
  if (document.getElementById("total-stat")) {
    document.getElementById("total-stat").textContent = allCars.length;
  }
}

// ─── LOAD CARS ─────────────────────────────────────────────────────────────
// Try fetching from the backend API; fall back to the locally-bundled `cars`
// array (defined in cars.js, loaded before this script in the HTML).
async function loadCars() {
  showGridSkeleton();

  try {
    const res = await fetch(`${API_BASE}/cars`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allCars = Array.isArray(data) ? data : data.cars || [];
    console.log(`[Apex] Loaded ${allCars.length} cars from API`);
  } catch (err) {
    console.warn("[Apex] API unavailable, using local cars data:", err.message);
    // `cars` is the global array from cars.js
    allCars = typeof cars !== "undefined" ? cars : [];
  }

  render();
}

function showGridSkeleton() {
  const grid = document.getElementById("inventory-grid");
  grid.innerHTML = Array.from({ length: 6 })
    .map(
      () => `
      <div class="car-card skeleton-card" aria-hidden="true">
        <div class="car-image-wrap skeleton-img"></div>
        <div class="car-info">
          <div class="skeleton-line" style="width:55%;height:14px;margin-bottom:8px"></div>
          <div class="skeleton-line" style="width:80%;height:20px;margin-bottom:16px"></div>
          <div class="skeleton-line" style="width:100%;height:12px;margin-bottom:6px"></div>
          <div class="skeleton-line" style="width:70%;height:12px"></div>
        </div>
      </div>`
    )
    .join("");
}

// ─── FILTERS & SORT ────────────────────────────────────────────────────────
document.getElementById("filter-group").addEventListener("click", (e) => {
  if (!e.target.classList.contains("filter-btn")) return;
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  e.target.classList.add("active");
  currentFilter = e.target.dataset.filter;
  render();
});

document.getElementById("search-input").addEventListener("input", (e) => {
  currentSearch = e.target.value.toLowerCase().trim();
  render();
});

document.getElementById("sort-select").addEventListener("change", (e) => {
  currentSort = e.target.value;
  render();
});

// ─── INQUIRY MODAL ─────────────────────────────────────────────────────────
let currentCar = null;

function openInquiryModal(car) {
  currentCar = car;
  // Always restore the form before opening — guards against a previous
  // submission having swapped the form for the success screen.
  restoreInquiryForm();
  document.getElementById("modal-car-img").src = car.img;
  document.getElementById("modal-car-title").textContent =
    `${car.year} ${car.make} ${car.model}`;
  document.getElementById("modal-car-price").textContent =
    `$${car.price.toLocaleString()}`;
  document.getElementById("modal-car-specs").textContent =
    `${car.hp} • ${car.engine} • ${mileageLabel(car.mileage)} miles`;

  // Pre-fill form fields for logged-in users
  if (typeof APEX_AUTH !== "undefined" && APEX_AUTH.isLoggedIn()) {
    APEX_AUTH.prefillForm("name", "email");
  }

  document.getElementById("inquiry-modal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeInquiryModal() {
  document.getElementById("inquiry-modal").classList.remove("active");
  document.body.style.overflow = "";
  // Restore the form FIRST (it may have been replaced by success HTML),
  // then reset it safely — reversing the original order that caused the crash.
  restoreInquiryForm();
  const form = document.getElementById("inquiry-form");
  if (form) form.reset();
  currentCar = null;
}

function restoreInquiryForm() {
  const body = document.querySelector(".modal-body");
  if (!body) return;
  if (!body.querySelector("#inquiry-form")) {
    // Form was replaced by the success screen — rebuild it from the snapshot.
    // NOTE: Do NOT add a submit listener here; the delegated document
    // listener on line ~479 already handles all #inquiry-form submits.
    body.innerHTML = originalFormHTML;
  }
}

// ─── MODAL CLICK DELEGATION ────────────────────────────────────────────────
document.addEventListener("click", (e) => {
  // Inquire button — skip if disabled (sold / reserved / out of stock)
  if (e.target.classList.contains("view-btn") && !e.target.disabled) {
    const carId = parseInt(e.target.closest(".car-card").dataset.id);
    const car   = allCars.find((c) => c.id === carId);
    if (!car) return;

    // ── Require login before inquiry ─────────────────────
    if (typeof APEX_AUTH === "undefined" || !APEX_AUTH.isLoggedIn()) {
      sessionStorage.setItem("apex_return", window.location.href);
      window.location.href = "/login.html";
      return;
    }

    openInquiryModal(car);
  }

  if (
    e.target.classList.contains("modal-overlay") ||
    e.target.classList.contains("modal-close") ||
    e.target.id === "cancel-btn"
  ) {
    closeInquiryModal();
  }
});

// ─── FORM SUBMISSION ───────────────────────────────────────────────────────
async function handleInquirySubmit(e) {
  e.preventDefault();
  if (!currentCar) return;

  // Guard: token may have expired while the modal was open
  if (typeof APEX_AUTH === "undefined" || !APEX_AUTH.isLoggedIn()) {
    closeInquiryModal();
    sessionStorage.setItem("apex_return", window.location.href);
    window.location.href = "/login.html";
    return;
  }

  const form = e.target;
  const submitBtn = form.querySelector("button[type='submit'], .btn-primary");
  const formData = new FormData(form);

  const inquiryData = {
    customer_name: formData.get("name"),
    customer_email: formData.get("email"),
    customer_phone: formData.get("phone"),
    customer_message: formData.get("message") || "No message provided.",
    vehicle_year: currentCar.year,
    vehicle_make: currentCar.make,
    vehicle_model: currentCar.model,
    vehicle_price: `$${currentCar.price.toLocaleString()}`,
    vehicle_specs: `${currentCar.hp} · ${currentCar.engine} · ${mileageLabel(currentCar.mileage)} miles`,
    vehicle_id: currentCar.id,
    inquiry_date: new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="btn-spinner"></span> Sending…`;

  let savedToServer = false;

  // 1. Try saving to the backend API
  try {
    const res = await fetch(`${API_BASE}/inquiries`, {
      method: "POST",
      headers: typeof APEX_AUTH !== "undefined" && APEX_AUTH.isLoggedIn()
        ? APEX_AUTH.authHeaders()
        : { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId: currentCar.id,
        vehicle: `${currentCar.year} ${currentCar.make} ${currentCar.model}`,
        price: currentCar.price,
        name: inquiryData.customer_name,
        email: inquiryData.customer_email,
        phone: inquiryData.customer_phone,
        message: inquiryData.customer_message,
        submittedAt: new Date().toISOString(),
        status: "new",
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      let errMsg = `Server error (${res.status})`;
      try { const d = await res.json(); errMsg = d.message || errMsg; } catch {}
      console.error("[Apex] Inquiry rejected:", errMsg);
      showInquiryError(submitBtn, errMsg);
      return;
    }
    savedToServer = true;
    console.log("[Apex] Inquiry saved to server");
  } catch (err) {
    console.warn("[Apex] Network error:", err.message);
    showInquiryError(submitBtn, err.message);
    return;
  }

  // 2. Send email via EmailJS if configured
  if (
    typeof emailjs !== "undefined" &&
    EMAILJS_CONFIG.publicKey &&
    EMAILJS_CONFIG.publicKey !== "YOUR_PUBLIC_KEY"
  ) {
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.dealerTemplateId,
        inquiryData
      );
    } catch (emailErr) {
      console.warn("[Apex] EmailJS failed:", emailErr);
    }
  }

  showInquirySuccess(inquiryData);
}

// ─── LOCAL STORAGE FALLBACK ────────────────────────────────────────────────
function saveInquiryLocally(inquiry) {
  try {
    const key = "apex_inquiries";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({ id: Date.now(), ...inquiry });
    localStorage.setItem(key, JSON.stringify(existing));
    console.log("[Apex] Inquiry saved to localStorage (", existing.length, "total)");
  } catch (err) {
    console.error("[Apex] localStorage save failed:", err);
  }
}

// Sync any locally-stored inquiries to the server once it's back online
async function syncLocalInquiries() {
  const key = "apex_inquiries";
  let pending;
  try {
    pending = JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return;
  }
  if (!pending.length) return;

  const synced = [];
  for (const inquiry of pending) {
    try {
      const res = await fetch(`${API_BASE}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inquiry),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) synced.push(inquiry.id);
    } catch {
      break; // Server still down — stop trying
    }
  }

  if (synced.length) {
    const remaining = pending.filter((i) => !synced.includes(i.id));
    localStorage.setItem(key, JSON.stringify(remaining));
    console.log(`[Apex] Synced ${synced.length} offline inquiry/inquiries to server`);
  }
}

// ─── SUCCESS / ERROR STATES ────────────────────────────────────────────────
// Capture original form HTML once DOM is ready so we can restore it on close
let originalFormHTML = "";
document.addEventListener("DOMContentLoaded", () => {
  const body = document.querySelector(".modal-body");
  if (body) originalFormHTML = body.innerHTML;
});

function showInquirySuccess(data) {
  const body = document.querySelector(".modal-body");
  body.innerHTML = `
    <div class="inquiry-success">
      <div class="success-icon">
        <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="26" cy="26" r="25" stroke="var(--gold)" stroke-width="1.5"/>
          <path d="M14 26.5l8 8 16-17" stroke="var(--gold)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"
                class="check-path"/>
        </svg>
      </div>
      <h3>Inquiry Sent</h3>
      <p>Thank you, <strong>${data.customer_name}</strong>. Your interest in the
         <strong>${data.vehicle_year} ${data.vehicle_make} ${data.vehicle_model}</strong>
         has been received.</p>
      <p class="success-sub">A confirmation has been sent to <strong>${data.customer_email}</strong>.
         One of our specialists will reach out within 24 hours.</p>
      <button class="btn-primary" id="success-close-btn">Done</button>
    </div>
  `;
  document
    .getElementById("success-close-btn")
    .addEventListener("click", closeInquiryModal);
}

function showInquiryError(submitBtn, message) {
  let errEl = document.getElementById("form-error-msg");
  if (!errEl) {
    errEl = document.createElement("p");
    errEl.id = "form-error-msg";
    errEl.className = "form-error-msg";
    submitBtn.parentNode.appendChild(errEl);
  }
  errEl.textContent = `Something went wrong — please try again or call us directly. (${message})`;
  submitBtn.disabled = false;
  submitBtn.innerHTML = "Send Inquiry";
}

// ─── WIRE UP FORM (delegated, survives modal re-use) ──────────────────────
document.addEventListener("submit", (e) => {
  if (e.target.id === "inquiry-form") handleInquirySubmit(e);
});

// ─── IMAGE VIEWER ──────────────────────────────────────────────────────────
let currentImageIndex = 0;
let visibleCars = [];

function openImageViewer(carId) {
  const filtered = allCars.filter((c) => {
    const catOk = currentFilter === "all" || (c.category || []).includes(currentFilter);
    const searchOk =
      !currentSearch ||
      (c.year + " " + c.make + " " + c.model)
        .toLowerCase()
        .includes(currentSearch);
    return catOk && searchOk;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (currentSort === "price-asc") return a.price - b.price;
    if (currentSort === "price-desc") return b.price - a.price;
    if (currentSort === "year-desc") return b.year - a.year;
    if (currentSort === "year-asc") return a.year - b.year;
    if (currentSort === "mileage-asc") return a.mileage - b.mileage;
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  visibleCars = sorted;
  currentImageIndex = visibleCars.findIndex((c) => c.id === carId);

  const modal = document.getElementById("image-viewer-modal");
  modal.classList.add("active");
  updateImageViewer();
  document.body.style.overflow = "hidden";
}

function closeImageViewer() {
  document.getElementById("image-viewer-modal").classList.remove("active");
  document.body.style.overflow = "";
}

function updateImageViewer() {
  const car = visibleCars[currentImageIndex];
  document.getElementById("modal-full-image").src = car.img;
  document.getElementById("image-modal-title").textContent =
    `${car.year} ${car.make} ${car.model}`;
  document.getElementById("image-modal-counter").textContent =
    `${currentImageIndex + 1} of ${visibleCars.length}`;
  document.querySelector(".image-modal-prev").disabled = currentImageIndex === 0;
  document.querySelector(".image-modal-next").disabled =
    currentImageIndex === visibleCars.length - 1;
}

function nextImage() {
  if (currentImageIndex < visibleCars.length - 1) {
    currentImageIndex++;
    updateImageViewer();
  }
}

function prevImage() {
  if (currentImageIndex > 0) {
    currentImageIndex--;
    updateImageViewer();
  }
}

document.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("car-image-wrap") ||
    e.target.parentElement?.classList.contains("car-image-wrap")
  ) {
    const img = e.target.tagName === "IMG" ? e.target : e.target.querySelector("img");
    if (img) {
      const card = img.closest(".car-card");
      if (card) openImageViewer(parseInt(card.dataset.id));
    }
  }

  if (
    e.target.classList.contains("image-modal-overlay") ||
    e.target.classList.contains("image-modal-close")
  ) {
    closeImageViewer();
  }

  if (e.target.classList.contains("image-modal-next")) nextImage();
  if (e.target.classList.contains("image-modal-prev")) prevImage();
});

document.addEventListener("keydown", (e) => {
  const modal = document.getElementById("image-viewer-modal");
  if (!modal.classList.contains("active")) return;
  if (e.key === "ArrowRight") nextImage();
  if (e.key === "ArrowLeft") prevImage();
  if (e.key === "Escape") closeImageViewer();
});

// ─── SKELETON STYLES ───────────────────────────────────────────────────────
(function injectSkeletonStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .skeleton-card { pointer-events: none; }
    .skeleton-img {
      width: 100%;
      height: 220px;
      background: linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .skeleton-line {
      border-radius: 4px;
      background: linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
})();

// ─── BOOT ──────────────────────────────────────────────────────────────────
// Attempt to sync any offline inquiries, then load the car inventory
syncLocalInquiries().catch(() => {});
loadCars();
