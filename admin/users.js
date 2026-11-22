// admin/users.js
"use strict";

const ROLE_STATUS = {
  admin:    { label: "Admin",    cls: "badge--gold"  },
  customer: { label: "Customer", cls: "badge--blue"  },
};

let allUsers = [];
let activeFilter = "";
let currentAdminId = null;

document.addEventListener("DOMContentLoaded", async () => {
  renderSidebar("users");

  // Get current admin's own ID so we can prevent self-demotion
  try {
    const me = JSON.parse(localStorage.getItem("apex_user"));
    if (me) currentAdminId = me.id;
  } catch {}

  await loadUsers();

  document.querySelectorAll(".admin-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderTable();
    });
  });

  document.getElementById("users-search").addEventListener("input", renderTable);
});

async function loadUsers() {
  try {
    const res  = await adminFetch("/admin/users");
    const data = await res.json();
    allUsers = data.users || [];
    renderTable();
  } catch { showToast("Failed to load users", "error"); }
}

function renderTable() {
  const search = document.getElementById("users-search").value.toLowerCase();
  const list = allUsers.filter(u => {
    const matchFilter = !activeFilter || u.role === activeFilter;
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search);
    return matchFilter && matchSearch;
  });

  document.getElementById("users-count").textContent = `${list.length} user${list.length !== 1 ? "s" : ""}`;
  const tbody = document.getElementById("users-tbody");

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No users found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => {
    const isSelf = u.id === currentAdminId;
    return `
    <tr>
      <td class="td-muted">#${u.id}</td>
      <td>
        <strong>${u.name}</strong>
        ${isSelf ? `<span style="font-size:0.55rem;color:var(--gold);margin-left:6px;letter-spacing:0.1em">(YOU)</span>` : ""}
      </td>
      <td class="td-muted">${u.email}</td>
      <td>${statusBadge(u.role, ROLE_STATUS)}</td>
      <td class="td-muted">${fmtDate(u.created_at)}</td>
      <td>
        ${isSelf
          ? `<span class="td-muted" style="font-size:0.65rem">Cannot edit self</span>`
          : `<div class="btn-group">
              ${u.role === "customer"
                ? `<button class="btn-admin btn-admin--gold btn-admin--sm" onclick="setRole(${u.id},'admin')">Make Admin</button>`
                : `<button class="btn-admin btn-admin--danger btn-admin--sm" onclick="setRole(${u.id},'customer')">Revoke Admin</button>`
              }
             </div>`
        }
      </td>
    </tr>`;
  }).join("");
}

async function setRole(id, role) {
  const user = allUsers.find(u => u.id === id);
  const verb = role === "admin" ? "promote" : "demote";
  const ok   = await adminConfirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${user?.name} to ${role}?`);
  if (!ok) return;

  try {
    const res  = await adminFetch(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || "Failed to update role", "error"); return; }

    const u = allUsers.find(x => x.id === id);
    if (u) u.role = role;
    showToast(`${user?.name} is now a ${role}`);
    renderTable();
  } catch { showToast("Network error", "error"); }
}
