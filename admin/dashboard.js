// admin/dashboard.js
"use strict";

const INQ_STATUS = {
  new:       { label: "New",       cls: "badge--green" },
  contacted: { label: "Contacted", cls: "badge--gold"  },
  closed:    { label: "Closed",    cls: "badge--gray"  },
};
const MSG_STATUS = {
  new:      { label: "New",      cls: "badge--green" },
  read:     { label: "Read",     cls: "badge--gold"  },
  resolved: { label: "Resolved", cls: "badge--gray"  },
};

document.addEventListener("DOMContentLoaded", async () => {
  renderSidebar("dashboard");

  // Clock
  const tick = () => {
    document.getElementById("topbar-time").textContent =
      new Date().toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
  };
  tick(); setInterval(tick, 60000);

  // Load stats
  try {
    const res  = await adminFetch("/admin/stats");
    const data = await res.json();
    if (data.success) {
      const s = data.stats;
      document.getElementById("s-cars").textContent  = s.total_cars;
      document.getElementById("s-stock").textContent = s.out_of_stock;
      document.getElementById("s-inq").textContent   = s.new_inquiries;
      document.getElementById("s-today").textContent = s.inquiries_today;
      document.getElementById("s-msg").textContent   = s.unread_contacts;
      document.getElementById("s-users").textContent = s.total_users;
    }
  } catch { showToast("Could not load stats", "error"); }

  // Load recent inquiries (limit 5)
  try {
    const res  = await adminFetch("/admin/inquiries?limit=5&offset=0");
    const data = await res.json();
    const tbody = document.getElementById("recent-inquiries");
    if (!data.inquiries?.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No inquiries yet</td></tr>`;
    } else {
      tbody.innerHTML = data.inquiries.map(i => `
        <tr>
          <td><strong>${i.customer_name}</strong><br><span class="td-muted">${i.email}</span></td>
          <td>${i.vehicle_name}</td>
          <td class="td-muted">${fmtDate(i.submitted_at)}</td>
          <td>${statusBadge(i.status, INQ_STATUS)}</td>
        </tr>`).join("");
    }
  } catch { }

  // Load recent contacts (limit 5)
  try {
    const res  = await adminFetch("/admin/contacts?limit=5&offset=0");
    const data = await res.json();
    const tbody = document.getElementById("recent-contacts");
    if (!data.contacts?.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No messages yet</td></tr>`;
    } else {
      tbody.innerHTML = data.contacts.map(c => `
        <tr>
          <td>${c.name}</td>
          <td class="td-muted">${c.email}</td>
          <td>${c.subject || "—"}</td>
          <td class="td-muted">${fmtDate(c.submitted_at)}</td>
          <td>${statusBadge(c.status, MSG_STATUS)}</td>
        </tr>`).join("");
    }
  } catch { }
});
