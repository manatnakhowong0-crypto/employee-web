const Auth = (() => {
  const KEY = CONFIG.SESSION_KEY;

  function _root() { return location.pathname.includes("/pages/") ? "../" : ""; }

  async function login(username, password) {
    try {
      const res = await fetch(CONFIG.API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "login", password })
      });
      let json = {}; try { json = await res.json(); } catch {}
      if (json && json.status === "ok") {
        localStorage.setItem(KEY, JSON.stringify({
          username: (username || "admin").trim(),
          name: json.name || "ผู้ดูแล",
          pw: password,
          ts: Date.now()
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("[Auth] login error:", e);
      return false;
    }
  }

  function mgrPassword() { const s = getSession(); return s && s.pw ? s.pw : ""; }

  function logout() {
    localStorage.removeItem(KEY);
    location.href = _root() + "index.html";
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  }

  function isLoggedIn() { return !!getSession(); }

  let _onSuccess = null;
  let _onCancel  = null;

  function _ensureModal() {
    if (document.getElementById("auth-modal-overlay")) return;
    const el = document.createElement("div");
    el.id = "auth-modal-overlay";
    el.className = "auth-modal-overlay";
    el.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div class="auth-modal-mark">${CONFIG.LOGO_TEXT}</div>
        <h2 id="auth-modal-title">เข้าสู่ระบบเพื่อจัดการ</h2>
        <p class="auth-modal-sub">ใส่รหัสเพื่อแก้ไขข้อมูล และเปิดหน้ารายงาน / จัดการ</p>

        <div class="auth-error" id="auth-error">⚠️ <span>ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง</span></div>

        <label for="auth-username">ชื่อผู้ใช้</label>
        <input type="text" id="auth-username" placeholder="ชื่อผู้ใช้" autocomplete="username">

        <label for="auth-password">รหัสผ่าน</label>
        <input type="password" id="auth-password" placeholder="••••••••" autocomplete="current-password">

        <div class="auth-actions">
          <button class="auth-btn-primary" id="auth-submit">เข้าสู่ระบบ</button>
          <button class="auth-btn-ghost"   id="auth-cancel">ยกเลิก</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.querySelector("#auth-submit").addEventListener("click", _trySubmit);
    el.querySelector("#auth-cancel").addEventListener("click", () => closeLogin(true));
    el.addEventListener("click", e => { if (e.target === el) closeLogin(true); });
    el.querySelector("#auth-password").addEventListener("keydown", e => { if (e.key === "Enter") _trySubmit(); });
    el.querySelector("#auth-username").addEventListener("keydown", e => { if (e.key === "Enter") _trySubmit(); });
  }

  async function _trySubmit() {
    const u = document.getElementById("auth-username").value;
    const p = document.getElementById("auth-password").value;
    const btn = document.getElementById("auth-submit");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ กำลังตรวจสอบ..."; }
    const ok = await login(u, p);
    if (btn) { btn.disabled = false; btn.textContent = "เข้าสู่ระบบ"; }
    if (ok) {
      const cb = _onSuccess; _onSuccess = null; _onCancel = null;
      _hide();
      if (typeof cb === "function") cb();
      else location.reload();
    } else {
      const err = document.getElementById("auth-error");
      if (err) err.classList.add("show");
      const pw = document.getElementById("auth-password");
      if (pw) { pw.value = ""; pw.focus(); }
    }
  }

  function _hide() {
    const el = document.getElementById("auth-modal-overlay");
    if (el) el.classList.remove("show");
  }

  function openLogin(onSuccess, onCancel) {
    _ensureModal();
    _onSuccess = onSuccess || null;
    _onCancel  = onCancel  || null;
    const el = document.getElementById("auth-modal-overlay");
    document.getElementById("auth-error")?.classList.remove("show");
    el.classList.add("show");
    setTimeout(() => document.getElementById("auth-username")?.focus(), 60);
  }

  function closeLogin(byUser) {
    _hide();
    const cb = _onCancel; _onSuccess = null; _onCancel = null;
    if (byUser && typeof cb === "function") cb();
  }

  function ensureLoggedIn(action) {
    if (isLoggedIn()) { action(); return; }
    openLogin(action);
  }

  function requirePage(onReady) {
    if (isLoggedIn()) { if (onReady) onReady(); return; }
    openLogin(
      () => { if (onReady) onReady(); },
      () => { location.href = _root() + "index.html"; }
    );
  }

  return { login, logout, getSession, isLoggedIn, mgrPassword, openLogin, closeLogin, ensureLoggedIn, requirePage, _root };
})();
