(function () {
  const session = getSession();
  if (!session) return;
  if (typeof io === "undefined") return; // socket.io client script failed to load — page still works, just without live push

  const socket = io(HDPRO_BACKEND_URL, { auth: { token: session.token } });
  window.hdproSocket = socket;

  socket.on("notification:new", () => {
    if (window.refreshNotifications) window.refreshNotifications();
  });
})();
