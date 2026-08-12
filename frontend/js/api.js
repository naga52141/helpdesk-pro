const API_BASE = "http://localhost:4000/api";

async function apiFetch(path, options = {}) {
  const session = getSession();
  const headers = { "Content-Type": "application/json" };
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
