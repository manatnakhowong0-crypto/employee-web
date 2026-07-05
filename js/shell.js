const Shell = (() => {

  const NAV = [
    { key:"home",       icon:"🏠", label:"หน้าแรก",           section:"หน้าหลัก", protected:false, file:"__home__" },
    { key:"attendance", icon:"📊", label:"สรุปตารางมาทำงาน", section:"หน้าหลัก", protected:false, file:"__root__" },
    { key:"today",      icon:"👥", label:"คนมาวันนี้",        section:"หน้าหลัก", protected:false, file:"dashboard" },
    { key:"search",     icon:"🔍", label:"ค้นหาตามวันที่",     section:"รายงาน",  protected:true,  file:"search" },
    { key:"employee",   icon:"📋", label:"ประวัติทั้งหมด",     section:"รายงาน",  protected:true,  file:"employee" },
    { key:"leave",      icon:"🏖️", label:"แจ้งลา & ปฏิทิน",   section:"จัดการ",  protected:false, file:"leave" },
    { key:"advance",    icon:"💵", label:"เบิกเงินล่วงหน้า",   section:"จัดการ",  protected:false, file:"advance" },
    { key:"payroll",    icon:"🧾", label:"ออกสลิปเงินเดือน",   section:"จัดการ",  protected:true,  file:"payroll" },
    { key:"finance",    icon:"🏦", label:"ฝ่ายโอนเงิน",        section:"จัดการ",  protected:false, file:"finance" },
  ];

  const COLLAPSE_KEY = "emp_sidebar_collapsed";

  function _root() { return location.pathname.includes("/pages/") ? "../" : ""; }

  function _href(item) {
    if (item.file === "__home__") return _root() + "index.html";
    if (item.file === "__root__") return _root() + "attendance.html";
    const inPages = location.pathname.includes("/pages/");
    return (inPages ? "" : "pages/") + item.file + ".html";
  }

  function _navClick(e, item) {
    if (!item.protected || Auth.isLoggedIn()) return; // ปล่อยให้ลิงก์ทำงานปกติ
    e.preventDefault();
    const url = _href(item);
    Auth.openLogin(() => { location.href = url; });
  }

  function mount(opts) {
    opts = opts || {};
    const active   = opts.active || "";
    const loggedIn = Auth.isLoggedIn();
    const session  = Auth.getSession();

    let navHTML = "";
    let lastSection = "";
    NAV.forEach(item => {
      if (item.section !== lastSection) {
        navHTML += `<div class="nav-section-label">${item.section}</div>`;
        lastSection = item.section;
      }
      const lock = (item.protected && !loggedIn)
        ? `<span class="nav-lock" title="ต้องเข้าสู่ระบบ">🔒</span>` : "";
      navHTML += `
        <a href="${_href(item)}" class="nav-item ${item.key === active ? "active" : ""}" data-key="${item.key}">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-text">${item.label}</span>${lock}
        </a>`;
    });

    const footerHTML = loggedIn ? `
        <div class="sidebar-user">
          <div class="avatar">${(session?.name || "S").charAt(0)}</div>
          <div class="uinfo">
            <div class="uname">${session?.name || "ผู้ดูแล"}</div>
            <div class="urole">เข้าสู่ระบบแล้ว</div>
          </div>
        </div>
        <button class="logout-btn" id="shell-logout" title="ออกจากระบบ"><span class="btn-ico">🚪</span><span class="btn-label">ออกจากระบบ</span></button>`
      : `
        <div class="sidebar-guest">👀 กำลังดูแบบผู้เยี่ยมชม<br><span>เข้าสู่ระบบเพื่อแก้ไข/ดูรายงาน</span></div>
        <button class="login-cta" id="shell-login" title="เข้าสู่ระบบ"><span class="btn-ico">🔐</span><span class="btn-label">เข้าสู่ระบบ</span></button>`;

    const mountEl = document.getElementById("sidebar-mount");
    if (mountEl) {
      mountEl.outerHTML = `
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-logo">
            <div class="sidebar-logo-mark">${CONFIG.LOGO_TEXT}</div>
            <div class="sidebar-logo-text">
              <div class="title">${CONFIG.APP_NAME}</div>
              <div class="sub">Management System</div>
            </div>
          </div>
          <nav class="sidebar-nav">${navHTML}</nav>
          <div class="sidebar-footer">${footerHTML}</div>
        </aside>`;
    }

    if (!document.getElementById("mobile-menu-btn")) {
      const btn = document.createElement("button");
      btn.id = "mobile-menu-btn";
      btn.className = "mobile-menu-btn";
      btn.setAttribute("aria-label", "เปิดเมนู");
      btn.innerHTML = "☰";
      document.body.appendChild(btn);

      const backdrop = document.createElement("div");
      backdrop.id = "sidebar-backdrop";
      backdrop.className = "sidebar-backdrop";
      document.body.appendChild(backdrop);

      btn.addEventListener("click", toggleSidebar);
      backdrop.addEventListener("click", closeSidebar);
    }

    if (!document.getElementById("sidebar-collapse-btn")) {
      const cbtn = document.createElement("button");
      cbtn.id = "sidebar-collapse-btn";
      cbtn.className = "sidebar-collapse-btn";
      cbtn.setAttribute("aria-label", "พับ/กางเมนู");
      cbtn.addEventListener("click", toggleCollapse);
      document.body.appendChild(cbtn);
    }
    _applyCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");

    document.getElementById("shell-logout")?.addEventListener("click", () => Auth.logout());
    document.getElementById("shell-login")?.addEventListener("click", () => Auth.openLogin());
    _renderTopbarAuth();
  }

  function _renderTopbarAuth() {
    const el = document.getElementById("topbar-auth");
    if (!el) return;
    if (Auth.isLoggedIn()) {
      const s = Auth.getSession();
      el.innerHTML = `<span class="chip-user">👤 ${s?.name || "ผู้ดูแล"}</span>
        <button id="topbar-logout">ออกจากระบบ</button>`;
      el.querySelector("#topbar-logout")?.addEventListener("click", () => Auth.logout());
    } else {
      el.innerHTML = `<button id="topbar-login">🔐 เข้าสู่ระบบ</button>`;
      el.querySelector("#topbar-login")?.addEventListener("click", () => Auth.openLogin());
    }
  }

  function toggleSidebar() {
    document.getElementById("sidebar")?.classList.toggle("open");
    document.getElementById("sidebar-backdrop")?.classList.toggle("show");
  }
  function closeSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebar-backdrop")?.classList.remove("show");
  }

  function _applyCollapsed(on) {
    document.body.classList.toggle("sidebar-collapsed", !!on);
    const cbtn = document.getElementById("sidebar-collapse-btn");
    if (cbtn) {
      cbtn.innerHTML = on ? "›" : "‹";
      cbtn.title = on ? "กางเมนู" : "พับเมนู";
    }
  }
  function toggleCollapse() {
    const on = !document.body.classList.contains("sidebar-collapsed");
    _applyCollapsed(on);
    try { localStorage.setItem(COLLAPSE_KEY, on ? "1" : "0"); } catch (e) {}
  }

  return { mount, toggleSidebar, closeSidebar, toggleCollapse };
})();
