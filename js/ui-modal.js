const PasswordModal = (() => {
  let _injected = false;

  function _inject() {
    if (_injected) return;
    _injected = true;
    const css = `
      .pm-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(2px);
        display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;transition:opacity .15s}
      .pm-overlay.show{opacity:1}
      .pm-box{background:#fff;border-radius:16px;width:90%;max-width:380px;padding:26px 24px;
        box-shadow:0 20px 60px rgba(0,0,0,.3);transform:translateY(10px);transition:transform .15s;font-family:'Sarabun',sans-serif}
      .pm-overlay.show .pm-box{transform:translateY(0)}
      .pm-icon{font-size:34px;text-align:center;margin-bottom:6px}
      .pm-title{font-size:18px;font-weight:800;color:#1e3a5f;text-align:center;margin:0 0 4px}
      .pm-hint{font-size:13px;color:#64748b;text-align:center;margin:0 0 16px}
      .pm-input{width:100%;box-sizing:border-box;padding:12px 14px;font-size:16px;border:2px solid #d7e0ea;
        border-radius:10px;font-family:'Sarabun',sans-serif;text-align:center;letter-spacing:2px}
      .pm-input:focus{outline:none;border-color:#1e3a5f}
      .pm-err{color:#dc2626;font-size:13px;text-align:center;margin:8px 0 0;min-height:18px;font-weight:600}
      .pm-actions{display:flex;gap:10px;margin-top:16px}
      .pm-btn{flex:1;padding:11px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;
        font-family:'Sarabun',sans-serif;border:none;transition:.15s}
      .pm-ok{background:#1e3a5f;color:#fff}.pm-ok:hover{background:#16304f}.pm-ok:disabled{opacity:.6;cursor:default}
      .pm-cancel{background:#f1f5f9;color:#475569}.pm-cancel:hover{background:#e2e8f0}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ask(opts = {}) {
    _inject();
    const { title = "ยืนยันตัวตน", hint = "กรุณากรอกรหัสผ่านพนักงาน", admin = false } = opts;
    return new Promise(resolve => {
      const ov = document.createElement("div");
      ov.className = "pm-overlay";
      ov.innerHTML = `
        <div class="pm-box" role="dialog" aria-modal="true">
          <div class="pm-icon">${admin ? "🔐" : "🔑"}</div>
          <h3 class="pm-title">${title}</h3>
          <p class="pm-hint">${hint}</p>
          <input class="pm-input" type="password" inputmode="numeric" autocomplete="off" placeholder="••••••" />
          <div class="pm-err"></div>
          <div class="pm-actions">
            <button class="pm-btn pm-cancel">ยกเลิก</button>
            <button class="pm-btn pm-ok">ยืนยัน</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add("show"));

      const input = ov.querySelector(".pm-input");
      const err   = ov.querySelector(".pm-err");
      const btnOk = ov.querySelector(".pm-ok");
      const btnNo = ov.querySelector(".pm-cancel");
      setTimeout(() => input.focus(), 80);

      function close(val) {
        ov.classList.remove("show");
        setTimeout(() => { try { document.body.removeChild(ov); } catch (e) {} }, 160);
        resolve(val);
      }
      function submit() {
        const v = input.value.trim();
        if (!v) { err.textContent = "กรุณากรอกรหัสผ่าน"; input.focus(); return; }
        close(v);
      }
      btnOk.addEventListener("click", submit);
      btnNo.addEventListener("click", () => close(null));
      ov.addEventListener("click", e => { if (e.target === ov) close(null); });
      input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); if (e.key === "Escape") close(null); });
    });
  }

  function wrongToast(msg) {
    const t = document.createElement("div");
    t.textContent = msg || "รหัสผ่านไม่ถูกต้อง";
    t.style.cssText = "position:fixed;left:50%;top:24px;transform:translateX(-50%);background:#dc2626;color:#fff;" +
      "padding:11px 20px;border-radius:10px;font-family:'Sarabun',sans-serif;font-weight:700;z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,.25)";
    document.body.appendChild(t);
    setTimeout(() => { try { document.body.removeChild(t); } catch (e) {} }, 2600);
  }

  return { ask, wrongToast };
})();
