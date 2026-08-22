(function () {
  const bellBtn = document.getElementById("notification-bell");
  if (!bellBtn) return; // page doesn't include the notification bell markup

  const badge = document.getElementById("notification-badge");
  const dropdown = document.getElementById("notification-dropdown");
  const list = document.getElementById("notification-list");
  const markAllBtn = document.getElementById("mark-all-read-btn");

  function timeAgo(dateStr) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function renderBadge(count) {
    if (count > 0) {
      badge.textContent = count > 9 ? "9+" : String(count);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  function renderList(notifications) {
    list.innerHTML = "";
    if (notifications.length === 0) {
      list.innerHTML = `<p class="notification-empty">No notifications yet.</p>`;
      return;
    }
    notifications.forEach((n) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `notification-item${n.isRead ? "" : " unread"}`;
      const messageEl = document.createElement("div");
      messageEl.className = "notification-message";
      messageEl.textContent = n.message;
      const timeEl = document.createElement("div");
      timeEl.className = "notification-time";
      timeEl.textContent = timeAgo(n.createdAt);
      item.appendChild(messageEl);
      item.appendChild(timeEl);

      item.addEventListener("click", async () => {
        dropdown.hidden = true;
        if (!n.isRead) {
          try {
            await apiFetch(`/notifications/${n.id}/read`, { method: "PATCH" });
          } catch (err) {
            // Non-critical — worst case it shows unread a bit longer.
          }
        }
        if (n.ticketDisplayId) window.location.href = `ticket-detail.html?id=${n.ticketDisplayId}`;
      });
      list.appendChild(item);
    });
  }

  async function loadNotifications() {
    try {
      const { notifications, unreadCount } = await apiFetch("/notifications");
      renderBadge(unreadCount);
      renderList(notifications);
    } catch (err) {
      // A failed background poll shouldn't interrupt the page.
    }
  }

  bellBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
  });

  document.addEventListener("click", (event) => {
    if (!dropdown.hidden && !dropdown.contains(event.target) && event.target !== bellBtn) {
      dropdown.hidden = true;
    }
  });

  markAllBtn.addEventListener("click", async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
      loadNotifications();
    } catch (err) {
      // Non-critical — user can retry.
    }
  });

  loadNotifications();
  setInterval(loadNotifications, 30000);
})();
