// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_BASE = "/api";

// ─── EMAILJS CONFIG ───────────────────────────────────────────────────────────
const EMAILJS_CONFIG = {
  publicKey:        "YOUR_PUBLIC_KEY",
  serviceId:        "YOUR_SERVICE_ID",
  dealerTemplateId: "YOUR_DEALER_TEMPLATE_ID",
  clientTemplateId: "YOUR_CLIENT_TEMPLATE_ID",
};
(function initEmailJS() {
  if (typeof emailjs !== "undefined") {
    emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
  }
})();

// ─── FEATURED CARS DATA ───────────────────────────────────────────────────────
// These are the homepage spotlight cars.
// To change which cars appear, edit this array — or fetch from /api/cars?featured=true
const FEATURED_CARS = [
  {
    name:  "Ferrari Dodici Cilindri",
    year:  "2025",
    badge: "Sports",
    meta:  "2025 · 986 HP",
    price: "$735,000",
    specs: "986 HP · 6.5L V12",
    img:   "https://i.pinimg.com/1200x/77/09/ba/7709babdb0aa50d311b772f6a41293f8.jpg",
    delay: "",
  },
  {
    name:  "BMW M3 Competition",
    year:  "2024",
    badge: "Sports",
    meta:  "2024 · 468 HP",
    price: "$320,000",
    specs: "468 HP · 3.0L Inline-6 Twin-Turbo",
    img:   "https://i.pinimg.com/1200x/2e/4b/f9/2e4bf9f92ca2190bb132f99bd6f0cb22.jpg",
    delay: "reveal-delay-2",
  },
  {
    name:  "Porsche GT3 RS",
    year:  "2021",
    badge: "Sports",
    meta:  "2021 · 523 HP",
    price: "$440,000",
    specs: "523 HP · 4.0L Flat-6",
    img:   "https://i.pinimg.com/736x/10/36/43/1036438f26e29568030077e27e78f769.jpg",
    delay: "reveal-delay-1",
  },
  {
    name:  "Lamborghini Aventador",
    year:  "2017",
    badge: "Sports",
    meta:  "2017 · 610 HP",
    price: "$500,000",
    specs: "610 HP · 6.5L V12",
    img:   "https://i.pinimg.com/1200x/ab/03/cb/ab03cbe8d4e60cac9616bfeff83e3d6c.jpg",
    delay: "reveal-delay-2",
  },
  {
    name:  "Mercedes-AMG GT-63 S",
    year:  "2024",
    badge: "Sports",
    meta:  "2024 · 1,001 HP",
    price: "$220,000",
    specs: "1,001 HP · 4.0L V8 + Electric",
    img:   "https://i.pinimg.com/1200x/e5/44/16/e54416f9880fc69c8e090eaee01df606.jpg",
    delay: "reveal-delay-3",
  },
];

// ─── RENDER FEATURED GRID ─────────────────────────────────────────────────────
function buildCarCard(car) {
  const div = document.createElement("div");
  div.className = "car-card reveal" + (car.delay ? " " + car.delay : "");
  div.innerHTML =
    '<img class="car-img" src="' + car.img + '" alt="' + car.name + '" loading="lazy" />' +
    '<div class="car-overlay">' +
      '<span class="car-badge">' + car.badge + '</span>' +
      '<div class="car-name">' + car.name + '</div>' +
      '<div class="car-meta">' + car.meta + '</div>' +
      '<div class="car-price">' + car.price + '</div>' +
      '<button class="car-cta inquire-btn"' +
        ' data-name="'  + car.name  + '"' +
        ' data-year="'  + car.year  + '"' +
        ' data-price="' + car.price + '"' +
        ' data-specs="' + car.specs + '"' +
        ' data-img="'   + car.img   + '">' +
        'Inquire Now' +
      '</button>' +
    '</div>';
  return div;
}

async function loadFeaturedCars() {
  const grid = document.getElementById("featured-grid");
  if (!grid) return;

  let carsToShow = FEATURED_CARS; // default: local data

  // Optionally fetch from API (e.g. /api/cars?featured=true) and override
  try {
    const res = await fetch(API_BASE + "/cars?featured=true", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const apiCars = Array.isArray(data) ? data : data.cars || [];
      if (apiCars.length > 0) {
        // Map API shape to card shape
        carsToShow = apiCars.slice(0, 5).map(function(c, i) {
          var delays = ["", "reveal-delay-2", "reveal-delay-1", "reveal-delay-2", "reveal-delay-3"];
          return {
            name:  c.year + " " + c.make + " " + c.model,
            year:  String(c.year),
            badge: (c.category && c.category[0]) ? c.category[0].charAt(0).toUpperCase() + c.category[0].slice(1) : "Featured",
            meta:  c.year + " · " + c.hp,
            price: "$" + c.price.toLocaleString(),
            specs: c.hp + " · " + c.engine,
            img:   c.img,
            delay: delays[i] || "",
          };
        });
        console.log("[Apex] Featured cars loaded from API (" + carsToShow.length + ")");
      }
    }
  } catch (err) {
    console.warn("[Apex] Featured cars API unavailable, using local data:", err.message);
  }

  // Render
  grid.innerHTML = "";
  carsToShow.forEach(function(car) {
    grid.appendChild(buildCarCard(car));
  });

  // Re-run IntersectionObserver on newly created cards
  grid.querySelectorAll(".reveal").forEach(function(el) {
    io.observe(el);
  });
}

// ─── HERO STATS — live vehicle count ─────────────────────────────────────────
async function loadHeroStats() {
  try {
    const res = await fetch(API_BASE + "/cars/stats", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return;
    const stats = await res.json();
    // The hero shows "50+" — update with real count if available
    const statNums = document.querySelectorAll(".stat-num");
    if (statNums.length && stats.total) {
      statNums[0].textContent = stats.total + "+";
    }
  } catch (err) {
    // silently keep the hardcoded fallback value
  }
}

// ─── INTERSECTION OBSERVER (reveal animations) ────────────────────────────────
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
revealEls.forEach(function(el) { io.observe(el); });

// ─── NAV SCROLL ───────────────────────────────────────────────────────────────
window.addEventListener("scroll", function() {
  document.getElementById("nav").classList.toggle("scrolled", window.scrollY > 60);
});

// ─── FILTER TABS ─────────────────────────────────────────────────────────────
var filterTabs = document.querySelectorAll(".filter-tab");
if (filterTabs.length) {
  filterTabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
      filterTabs.forEach(function(t) { t.classList.remove("active"); });
      tab.classList.add("active");
    });
  });
}

// ─── INQUIRY MODAL ───────────────────────────────────────────────────────────
var currentCar = null;

function openInquiryModal(car) {
  currentCar = car;
  document.getElementById("modal-car-img").src = car.img;
  document.getElementById("modal-car-title").textContent = car.name;
  document.getElementById("modal-car-price").textContent = car.price;
  document.getElementById("modal-car-specs").textContent = car.specs;

  // Pre-fill form fields for logged-in users
  if (typeof APEX_AUTH !== "undefined" && APEX_AUTH.isLoggedIn()) {
    APEX_AUTH.prefillForm("inq-name", "inq-email");
  }

  document.getElementById("inquiry-modal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeInquiryModal() {
  document.getElementById("inquiry-modal").classList.remove("active");
  document.body.style.overflow = "";
  var form = document.getElementById("inquiry-form");
  if (form) form.reset();

  // Restore form if it was replaced by the success state
  var body = document.querySelector("#inquiry-modal .modal-body");
  if (!body.querySelector("#inquiry-form")) {
    body.innerHTML = getFormHTML();
    attachFormSubmit();
  }
  currentCar = null;
}

function getFormHTML() {
  return (
    '<div class="car-info">' +
      '<img id="modal-car-img" src="" alt="Car" />' +
      '<div class="car-details">' +
        '<h3 id="modal-car-title"></h3>' +
        '<p id="modal-car-price"></p>' +
        '<p id="modal-car-specs"></p>' +
      '</div>' +
    '</div>' +
    '<form id="inquiry-form">' +
      '<div class="form-group">' +
        '<label for="inq-name">Full Name *</label>' +
        '<input type="text" id="inq-name" name="name" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="inq-email">Email Address *</label>' +
        '<input type="email" id="inq-email" name="email" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="inq-phone">Phone Number *</label>' +
        '<input type="tel" id="inq-phone" name="phone" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="inq-message">Message</label>' +
        '<textarea id="inq-message" name="message" rows="4" placeholder="Tell us about your interest in this vehicle..."></textarea>' +
      '</div>' +
      '<div class="form-actions">' +
        '<button type="button" class="btn-secondary" id="cancel-btn">Cancel</button>' +
        '<button type="submit" class="btn-primary">Send Inquiry</button>' +
      '</div>' +
    '</form>'
  );
}

// Open/close delegation
document.addEventListener("click", function(e) {
  var btn = e.target.closest(".inquire-btn");
  if (btn) {
    // ── Require login before inquiry ─────────────────────
    if (typeof APEX_AUTH === "undefined" || !APEX_AUTH.isLoggedIn()) {
      sessionStorage.setItem("apex_return", window.location.href);
      window.location.href = "/login.html";
      return;
    }

    openInquiryModal({
      name:  btn.dataset.name,
      price: btn.dataset.price,
      specs: btn.dataset.specs,
      img:   btn.dataset.img,
      year:  btn.dataset.year,
    });
    return;
  }
  if (
    e.target.classList.contains("modal-overlay") ||
    e.target.classList.contains("modal-close") ||
    e.target.id === "cancel-btn"
  ) {
    closeInquiryModal();
  }
});

// ─── LOCAL STORAGE FALLBACK ───────────────────────────────────────────────────
var LS_KEY = "apex_inquiries";

function saveInquiryLocally(payload) {
  try {
    var existing = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    existing.push(Object.assign({ id: Date.now(), submittedAt: new Date().toISOString(), status: "new" }, payload));
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
    console.log("[Apex] Inquiry saved locally (" + existing.length + " total)");
  } catch (err) {
    console.error("[Apex] localStorage save failed:", err);
  }
}

async function syncLocalInquiries() {
  var pending;
  try { pending = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch(e) { return; }
  if (!pending.length) return;

  var synced = [];
  for (var i = 0; i < pending.length; i++) {
    try {
      var res = await fetch(API_BASE + "/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending[i]),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) synced.push(pending[i].id);
    } catch(e) { break; }
  }
  if (synced.length) {
    var remaining = pending.filter(function(m) { return synced.indexOf(m.id) === -1; });
    localStorage.setItem(LS_KEY, JSON.stringify(remaining));
    console.log("[Apex] Synced " + synced.length + " offline inquiry/inquiries to server");
  }
}

// ─── FORM SUBMISSION ──────────────────────────────────────────────────────────
function attachFormSubmit() {
  var form = document.getElementById("inquiry-form");
  if (!form) return;
  form.addEventListener("submit", handleInquirySubmit);
}

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

  var form      = e.target;
  var submitBtn = form.querySelector(".btn-primary");
  var fd        = new FormData(form);

  var data = {
    customer_name:    fd.get("name"),
    customer_email:   fd.get("email"),
    customer_phone:   fd.get("phone"),
    customer_message: fd.get("message") || "No message provided.",
    vehicle_year:     currentCar.year,
    vehicle_make:     currentCar.name,
    vehicle_model:    "",
    vehicle_price:    currentCar.price,
    vehicle_specs:    currentCar.specs,
    inquiry_date: new Date().toLocaleString("en-US", {
      weekday: "long", year: "numeric", month: "long",
      day: "numeric", hour: "2-digit", minute: "2-digit",
    }),
  };

  submitBtn.disabled  = true;
  submitBtn.innerHTML = '<span class="btn-spinner"></span> Sending\u2026';

  var savedToServer = false;

  // 1. Try the backend API
  try {
    var res = await fetch(API_BASE + "/inquiries", {
      method: "POST",
      headers: typeof APEX_AUTH !== "undefined" && APEX_AUTH.isLoggedIn()
        ? APEX_AUTH.authHeaders()
        : { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId:   null,
        vehicle: currentCar.year + " " + currentCar.name,
        price:   currentCar.price,
        name:    data.customer_name,
        email:   data.customer_email,
        phone:   data.customer_phone,
        message: data.customer_message,
        submittedAt: new Date().toISOString(),
        status: "new",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    savedToServer = true;
    console.log("[Apex] Inquiry saved to server");
  } catch (err) {
    console.warn("[Apex] Server unavailable, saving locally:", err.message);
    saveInquiryLocally({
      vehicle: currentCar.year + " " + currentCar.name,
      price:   currentCar.price,
      name:    data.customer_name,
      email:   data.customer_email,
      phone:   data.customer_phone,
      message: data.customer_message,
    });
  }

  // 2. EmailJS (optional)
  if (
    typeof emailjs !== "undefined" &&
    EMAILJS_CONFIG.publicKey &&
    EMAILJS_CONFIG.publicKey !== "YOUR_PUBLIC_KEY"
  ) {
    try {
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.dealerTemplateId, data);
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.clientTemplateId, data);
    } catch (emailErr) {
      console.warn("[Apex] EmailJS failed:", emailErr);
    }
  }

  // 3. Show success state
  document.querySelector("#inquiry-modal .modal-body").innerHTML =
    '<div class="inquiry-success">' +
      '<div class="success-icon">' +
        '<svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="26" cy="26" r="25" stroke="#c9a84c" stroke-width="1.5"/>' +
          '<path d="M14 26.5l8 8 16-17" stroke="#c9a84c" stroke-width="2"' +
               ' stroke-linecap="round" stroke-linejoin="round" class="check-path"/>' +
        '</svg>' +
      '</div>' +
      '<h3>Inquiry Sent</h3>' +
      '<p>Thank you, <strong>' + data.customer_name + '</strong>. Your interest in the ' +
         '<strong>' + data.vehicle_year + ' ' + data.vehicle_make + '</strong> has been received.</p>' +
      '<p class="success-sub">A confirmation has been sent to <strong>' + data.customer_email + '</strong>. ' +
         'One of our specialists will reach out within 24 hours.</p>' +
      '<button class="btn-primary" id="success-close-btn">Done</button>' +
    '</div>';
  document.getElementById("success-close-btn").addEventListener("click", closeInquiryModal);
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  attachFormSubmit();
  syncLocalInquiries().catch(function() {});
  loadFeaturedCars();
  loadHeroStats();
});
