// admin/inquiries.js
"use strict";

const INQ_STATUS = {
  new:       { label: "New",       cls: "badge--green" },
  contacted: { label: "Contacted", cls: "badge--gold"  },
  closed:    { label: "Closed",    cls: "badge--gray"  },
};

let allInquiries = [];
let activeFilter = "";

document.addEventListener("DOMContentLoaded", async () => {
  renderSidebar("inquiries");
  await loadInquiries();

  // Filter buttons
  document.querySelectorAll(".admin-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderTable();
    });
  });

  // Search
  document.getElementById("inq-search").addEventListener("input", renderTable);

  // Modal close
  document.getElementById("inq-modal-close").addEventListener("click", closeModal);
  document.getElementById("inq-modal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
});

async function loadInquiries() {
  try {
    const res  = await adminFetch("/admin/inquiries?limit=200&offset=0");
    const data = await res.json();
    allInquiries = data.inquiries || [];
    renderTable();
  } catch { showToast("Failed to load inquiries", "error"); }
}

function renderTable() {
  const search = document.getElementById("inq-search").value.toLowerCase();
  const list = allInquiries.filter(i => {
    const matchFilter = !activeFilter || i.status === activeFilter;
    const matchSearch = !search ||
      i.customer_name?.toLowerCase().includes(search) ||
      i.vehicle_name?.toLowerCase().includes(search) ||
      i.email?.toLowerCase().includes(search);
    return matchFilter && matchSearch;
  });

  document.getElementById("inq-count").textContent = `${list.length} record${list.length !== 1 ? "s" : ""}`;
  const tbody = document.getElementById("inq-tbody");

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No inquiries found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(i => `
    <tr>
      <td class="td-muted">#${i.id}</td>
      <td>
        <strong>${i.customer_name}</strong>
        <div class="td-muted">${i.email}</div>
      </td>
      <td>${i.vehicle_name}</td>
      <td class="td-muted">${i.vehicle_price ? "$" + Number(i.vehicle_price).toLocaleString() : "—"}</td>
      <td class="td-muted">${i.phone || "—"}</td>
      <td class="td-muted">${fmtDate(i.submitted_at)}</td>
      <td>${statusBadge(i.status, INQ_STATUS)}</td>
      <td>
        <div class="btn-group">
          <button class="btn-admin btn-admin--ghost btn-admin--sm" onclick="openDetail(${i.id})">View</button>
          <button class="btn-admin btn-admin--danger btn-admin--sm" onclick="deleteInquiry(${i.id})">Del</button>
        </div>
      </td>
    </tr>`).join("");
}

function openDetail(id) {
  const i = allInquiries.find(x => x.id === id);
  if (!i) return;
  document.getElementById("inq-modal-body").innerHTML = `
    <div style="display:grid;gap:12px">
      <div class="af-row">
        <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">CUSTOMER</div><strong>${i.customer_name}</strong></div>
        <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">EMAIL</div>${i.email}</div>
      </div>
      <div class="af-row">
        <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">PHONE</div>${i.phone || "—"}</div>
        <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">DATE</div>${fmtDate(i.submitted_at)}</div>
      </div>
      <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">VEHICLE</div>${i.vehicle_name} ${i.vehicle_price ? "— $" + Number(i.vehicle_price).toLocaleString() : ""}</div>
      <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">MESSAGE</div><div style="line-height:1.6;color:var(--text)">${i.message || "No message"}</div></div>
      <div>
        <div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:8px">UPDATE STATUS</div>
        <div class="btn-group">
          ${["new","contacted","closed"].map(s =>
            `<button class="btn-admin ${i.status === s ? "btn-admin--gold" : "btn-admin--ghost"} btn-admin--sm"
              onclick="updateStatus(${i.id},'${s}')">${INQ_STATUS[s].label}</button>`
          ).join("")}
        </div>
      </div>
    </div>`;
  document.getElementById("inq-modal").classList.add("open");
}

function closeModal() {
  document.getElementById("inq-modal").classList.remove("open");
}

async function updateStatus(id, status) {
  try {
    const res = await adminFetch(`/admin/inquiries/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const inq = allInquiries.find(x => x.id === id);
      if (inq) inq.status = status;
      showToast("Status updated");
      closeModal();
      renderTable();
    }
  } catch { showToast("Update failed", "error"); }
}

async function deleteInquiry(id) {
  const ok = await adminConfirm("Delete this inquiry? This cannot be undone.");
  if (!ok) return;
  try {
    await adminFetch(`/admin/inquiries/${id}`, { method: "DELETE" });
    allInquiries = allInquiries.filter(x => x.id !== id);
    showToast("Inquiry deleted");
    renderTable();
  } catch { showToast("Delete failed", "error"); }
}
