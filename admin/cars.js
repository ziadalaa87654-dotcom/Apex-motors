// admin/cars.js — Inventory CRUD
"use strict";

const CAR_STATUS = {
  available: { label: "Available", cls: "badge--green" },
  reserved:  { label: "Reserved",  cls: "badge--blue"  },
  sold:      { label: "Sold",      cls: "badge--red"   },
  hidden:    { label: "Hidden",    cls: "badge--gray"  },
};

let allCars = [];
let activeFilter = "";
let editingId = null;

document.addEventListener("DOMContentLoaded", async () => {
  renderSidebar("cars");
  await loadCars();

  document.querySelectorAll(".admin-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderTable();
    });
  });

  document.getElementById("cars-search").addEventListener("input", renderTable);
  document.getElementById("add-car-btn").addEventListener("click", openAddModal);
  document.getElementById("car-modal-close").addEventListener("click", closeModal);
  document.getElementById("car-form-cancel").addEventListener("click", closeModal);
  document.getElementById("car-modal").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(); });
  document.getElementById("car-form").addEventListener("submit", handleSave);
});

async function loadCars() {
  try {
    const res  = await adminFetch("/admin/cars");
    const data = await res.json();
    allCars = data.cars || [];
    renderTable();
  } catch { showToast("Failed to load inventory", "error"); }
}

function renderTable() {
  const search = document.getElementById("cars-search").value.toLowerCase();
  const list = allCars.filter(c => {
    const matchFilter = !activeFilter || c.status === activeFilter;
    const matchSearch = !search || `${c.make} ${c.model} ${c.year}`.toLowerCase().includes(search);
    return matchFilter && matchSearch;
  });

  document.getElementById("cars-count").textContent = `${list.length} vehicle${list.length !== 1 ? "s" : ""}`;
  const tbody = document.getElementById("cars-tbody");

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No vehicles found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${c.img ? `<img src="${c.img}" class="car-thumb" alt="${c.make}"/>` : "<div class='car-thumb' style='display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.6rem'>No img</div>"}</td>
      <td>
        <strong>${c.make} ${c.model}</strong>
        <div class="td-muted">${c.hp || ""} ${c.engine ? "· " + c.engine : ""}</div>
      </td>
      <td class="td-muted">${c.year}</td>
      <td>$${Number(c.price).toLocaleString()}</td>
      <td>
        <span style="font-size:0.8rem;font-weight:600;color:${c.stock === 0 ? "var(--error)" : c.stock === 1 ? "var(--gold)" : "var(--success)"}">${c.stock}</span>
      </td>
      <td>${statusBadge(c.status, CAR_STATUS)}</td>
      <td>
        <div class="btn-group">
          <button class="btn-admin btn-admin--ghost btn-admin--sm" onclick="openEditModal(${c.id})">Edit</button>
          <button class="btn-admin btn-admin--danger btn-admin--sm" onclick="deleteCar(${c.id})">Del</button>
        </div>
      </td>
    </tr>`).join("");
}

function openAddModal() {
  editingId = null;
  document.getElementById("car-modal-title").textContent = "Add Vehicle";
  document.getElementById("car-form").reset();
  document.getElementById("cf-id").value = "";
  document.getElementById("cf-stock").value = "1";
  document.getElementById("cf-status").value = "available";
  document.getElementById("car-form-error").textContent = "";
  document.getElementById("car-modal").classList.add("open");
}

function openEditModal(id) {
  const c = allCars.find(x => x.id === id);
  if (!c) return;
  editingId = id;
  document.getElementById("car-modal-title").textContent = "Edit Vehicle";
  document.getElementById("cf-id").value      = c.id;
  document.getElementById("cf-year").value    = c.year;
  document.getElementById("cf-make").value    = c.make;
  document.getElementById("cf-model").value   = c.model;
  document.getElementById("cf-price").value   = c.price;
  document.getElementById("cf-mileage").value = c.mileage || 0;
  document.getElementById("cf-hp").value      = c.hp || "";
  document.getElementById("cf-engine").value  = c.engine || "";
  document.getElementById("cf-stock").value   = c.stock ?? 1;
  document.getElementById("cf-status").value  = c.status || "available";
  document.getElementById("cf-badge").value   = c.badge || "";
  document.getElementById("cf-category").value = (c.category || []).join(", ");
  document.getElementById("cf-img").value     = c.img || "";
  document.getElementById("cf-featured").checked = !!c.featured;
  document.getElementById("car-form-error").textContent = "";
  document.getElementById("car-modal").classList.add("open");
}

function closeModal() {
  document.getElementById("car-modal").classList.remove("open");
  editingId = null;
}

async function handleSave(e) {
  e.preventDefault();
  const errEl = document.getElementById("car-form-error");
  errEl.textContent = "";

  const catRaw = document.getElementById("cf-category").value;
  const payload = {
    year:     Number(document.getElementById("cf-year").value),
    make:     document.getElementById("cf-make").value.trim(),
    model:    document.getElementById("cf-model").value.trim(),
    price:    Number(document.getElementById("cf-price").value),
    mileage:  Number(document.getElementById("cf-mileage").value) || 0,
    hp:       document.getElementById("cf-hp").value.trim() || null,
    engine:   document.getElementById("cf-engine").value.trim() || null,
    stock:    Number(document.getElementById("cf-stock").value) || 0,
    status:   document.getElementById("cf-status").value,
    badge:    document.getElementById("cf-badge").value || null,
    category: catRaw ? catRaw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) : [],
    img:      document.getElementById("cf-img").value.trim() || null,
    featured: document.getElementById("cf-featured").checked,
  };

  if (!payload.year || !payload.make || !payload.model || !payload.price) {
    errEl.textContent = "Year, make, model, and price are required.";
    return;
  }

  const btn = document.getElementById("car-form-submit");
  btn.disabled = true; btn.textContent = "Saving…";

  try {
    const url    = editingId ? `/admin/cars/${editingId}` : "/admin/cars";
    const method = editingId ? "PATCH" : "POST";
    const res    = await adminFetch(url, { method, body: JSON.stringify(payload) });
    const data   = await res.json();

    if (!res.ok) { errEl.textContent = data.message || "Save failed."; return; }

    showToast(editingId ? "Vehicle updated" : "Vehicle added");
    closeModal();
    await loadCars();
  } catch { errEl.textContent = "Network error. Please try again."; }
  finally { btn.disabled = false; btn.textContent = "Save Vehicle"; }
}

async function deleteCar(id) {
  const car = allCars.find(c => c.id === id);
  const ok  = await adminConfirm(`Delete ${car?.make} ${car?.model}? This cannot be undone.`);
  if (!ok) return;
  try {
    await adminFetch(`/admin/cars/${id}`, { method: "DELETE" });
    allCars = allCars.filter(c => c.id !== id);
    showToast("Vehicle deleted");
    renderTable();
  } catch { showToast("Delete failed", "error"); }
}
