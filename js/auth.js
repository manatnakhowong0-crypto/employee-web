// ============================================================
// auth.js — ล็อกอินรหัสเดียว + กล่องล็อกอิน (Login Modal) ที่ใช้ร่วมกันทุกหน้า
// หมายเหตุ: เป็นการตรวจฝั่งหน้าเว็บเพื่อกันการแก้ไขเบื้องต้นเท่านั้น
//          (ความปลอดภัยจริงควรตรวจที่ฝั่งเซิร์ฟเวอร์)
// ============================================================

const Auth = (() => {
  const KEY = CONFIG.SESSION_KEY;

  // root path: ถ้าอยู่ในโฟลเดอร์ /pages/ ต้องถอยกลับ 1 ชั้น
  function _root() { return location.pathname.includes("/pages/") ? "../" : ""; }

  // ── core ────────────────────────────────────────────────────
  function login(username, password) {
    const u = CONFIG.LOGIN_USER;
    if ((username || "").trim() === u.username && password === u.password) {
      localStorage.setItem(KEY, JSON.stringify({ username: u.username, name: u.name, ts: Date.now() }));
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(KEY);
    location.href = _root() + "index.html";
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  }

  function isLoggedIn() { return !!getSession(); }

  // ── Login modal ─────────────────────────────────────────────
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

  function _trySubmit() {
    const u = document.getElementById("auth-username").value;
    const p = document.getElementById("auth-password").value;
    if (login(u, p)) {
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

  // เปิดกล่องล็อกอิน — onSuccess เรียกเมื่อล็อกอินสำเร็จ
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

  // ทำ action เฉพาะเมื่อล็อกอินแล้ว — ถ้ายังไม่ล็อกอินจะเปิดกล่องล็อกอินให้
  function ensureLoggedIn(action) {
    if (isLoggedIn()) { action(); return; }
    openLogin(action);
  }

  // ใช้ที่ต้นหน้า "รายงาน/จัดการ" — ถ้ายังไม่ล็อกอินจะเปิดกล่อง
  // ยกเลิก = กลับหน้าหลัก
  function requirePage(onReady) {
    if (isLoggedIn()) { if (onReady) onReady(); return; }
    openLogin(
      () => { if (onReady) onReady(); },
      () => { location.href = _root() + "index.html"; }
    );
  }

  return { login, logout, getSession, isLoggedIn, openLogin, closeLogin, ensureLoggedIn, requirePage, _root };
})();
