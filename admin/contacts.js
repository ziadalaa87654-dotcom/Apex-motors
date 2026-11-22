// admin/contacts.js
"use strict";

const MSG_STATUS = {
  new:      { label: "New",      cls: "badge--green" },
  read:     { label: "Read",     cls: "badge--gold"  },
  resolved: { label: "Resolved", cls: "badge--gray"  },
};

let allContacts = [];
let activeFilter = "";

document.addEventListener("DOMContentLoaded", async () => {
  renderSidebar("contacts");
  await loadContacts();

  document.querySelectorAll(".admin-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderTable();
    });
  });

  document.getElementById("msg-search").addEventListener("input", renderTable);
  document.getElementById("msg-modal-close").addEventListener("click", closeModal);
  document.getElementById("msg-modal").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(); });
});

async function loadContacts() {
  try {
    const res  = await adminFetch("/admin/contacts?limit=200&offset=0");
    const data = await res.json();
    allContacts = data.contacts || [];
    renderTable();
  } catch { showToast("Failed to load messages", "error"); }
}

function renderTable() {
  const search = document.getElementById("msg-search").value.toLowerCase();
  const list = allContacts.filter(c => {
    const matchFilter = !activeFilter || c.status === activeFilter;
    const matchSearch = !search || c.name?.toLowerCase().includes(search) || c.email?.toLowerCase().includes(search);
    return matchFilter && matchSearch;
  });

  document.getElementById("msg-count").textContent = `${list.length} message${list.length !== 1 ? "s" : ""}`;
  const tbody = document.getElementById("msg-tbody");

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No messages found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td class="td-muted">#${c.id}</td>
      <td><strong>${c.name}</strong></td>
      <td class="td-muted">${c.email}</td>
      <td>${c.subject || "—"}</td>
      <td class="td-muted">${fmtDate(c.submitted_at)}</td>
      <td>${statusBadge(c.status, MSG_STATUS)}</td>
      <td>
        <div class="btn-group">
          <button class="btn-admin btn-admin--ghost btn-admin--sm" onclick="openDetail(${c.id})">View</button>
          <button class="btn-admin btn-admin--danger btn-admin--sm" onclick="deleteContact(${c.id})">Del</button>
        </div>
      </td>
    </tr>`).join("");
}

function openDetail(id) {
  const c = allContacts.find(x => x.id === id);
  if (!c) return;
  // Auto-mark as read
  if (c.status === "new") updateStatus(id, "read", false);

  document.getElementById("msg-modal-body").innerHTML = `
    <div style="display:grid;gap:14px">
      <div class="af-row">
        <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">FROM</div><strong>${c.name}</strong></div>
        <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">EMAIL</div>${c.email}</div>
      </div>
      <div class="af-row">
        <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">PHONE</div>${c.phone || "—"}</div>
        <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">DATE</div>${fmtDate(c.submitted_at)}</div>
      </div>
      ${c.subject ? `<div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">SUBJECT</div>${c.subject}</div>` : ""}
      <div><div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:4px">MESSAGE</div>
        <div style="line-height:1.7;color:var(--text);background:var(--dark-3);padding:12px;border-radius:4px">${c.message || "—"}</div>
      </div>
      <div>
        <div style="font-size:0.58rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:8px">UPDATE STATUS</div>
        <div class="btn-group">
          ${["new","read","resolved"].map(s =>
            `<button class="btn-admin ${c.status === s ? "btn-admin--gold" : "btn-admin--ghost"} btn-admin--sm"
              onclick="updateStatus(${c.id},'${s}',true)">${MSG_STATUS[s].label}</button>`
          ).join("")}
        </div>
      </div>
    </div>`;
  document.getElementById("msg-modal").classList.add("open");
}

function closeModal() { document.getElementById("msg-modal").classList.remove("open"); }

async function updateStatus(id, status, closeAfter = true) {
  try {
    const res = await adminFetch(`/admin/contacts/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    if (res?.ok) {
      const c = allContacts.find(x => x.id === id);
      if (c) c.status = status;
      if (closeAfter) { showToast("Status updated"); closeModal(); }
      renderTable();
    }
  } catch { if (closeAfter) showToast("Update failed", "error"); }
}

async function deleteContact(id) {
  const ok = await adminConfirm("Delete this message? This cannot be undone.");
  if (!ok) return;
  try {
    await adminFetch(`/admin/contacts/${id}`, { method: "DELETE" });
    allContacts = allContacts.filter(x => x.id !== id);
    showToast("Message deleted");
    renderTable();
  } catch { showToast("Delete failed", "error"); }
}
