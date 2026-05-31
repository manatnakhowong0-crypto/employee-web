// ============================================================
// auth.js — ระบบ Login / Logout / Session
// ============================================================

const Auth = (() => {

  function login(username, password) {
    const user = CONFIG.LOGIN_USERS.find(
      u => u.username === username && u.password === password
    );
    if (!user) return false;
    const session = { username: user.username, name: user.name, role: user.role, ts: Date.now() };
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
    return true;
  }

  function logout() {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
    window.location.href = "../index.html";
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY));
    } catch { return null; }
  }

  function isLoggedIn() {
    return !!getSession();
  }

  // เรียกที่ต้น pages/ ทุกหน้า เพื่อ redirect ถ้ายังไม่ล็อกอิน
  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = "../index.html";
    }
  }

  return { login, logout, getSession, isLoggedIn, requireAuth };
})();
