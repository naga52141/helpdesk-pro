const API_BASE = `${HDPRO_BACKEND_URL}/api`;

async function apiFetch(path, options = {}) {
  const session = getSession();
  const isFormData = options.body instanceof FormData;
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (session && session.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers,
      ...options,
    });
  } catch (err) {
    throw new Error("Could not reach the HelpDesk Pro API. Is the backend server running on port 4000?");
  }

  if (res.status === 401 && session) {
    // Stored token is invalid or expired — the session is no longer usable.
    clearSession();
    window.location.href = "index.html";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// A plain <a href> can't carry an Authorization header, so downloads go through
// fetch() and get saved via a temporary blob URL instead.
async function downloadFile(path, fileName) {
  const session = getSession();
  const headers = {};
  if (session && session.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Download failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
