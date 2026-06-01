// ============================================================
// layout.js — Sidebar + Topbar injection (shared by all pages)
// ============================================================

const Layout = (() => {

  const NAV_ITEMS = [
    { href: "dashboard.html",  icon: "🏠", label: "แดชบอร์ด",           section: "หลัก" },
    { href: "attendance.html", icon: "📊", label: "สรุปตารางมาทำงาน",   section: "รายงาน" },
    { href: "search.html",     icon: "🔍", label: "ค้นหาตามวันที่",      section: "รายงาน" },
    { href: "employee.html",   icon: "📋", label: "ประวัติทั้งหมด",      section: "รายงาน" },
    { href: "leave.html",      icon: "🏖️", label: "แจ้งลา & ปฏิทิน",    section: "จัดการ" },
  ];

  function init(activeHref, title) {
    Auth.requireAuth();
    const session = Auth.getSession();

    // Build sidebar
    let sectionsHTML = "";
    let lastSection = "";
    NAV_ITEMS.forEach(item => {
      if (item.section !== lastSection) {
        sectionsHTML += `<div class="nav-section-label">${item.section}</div>`;
        lastSection = item.section;
      }
      const isActive = location.pathname.endsWith(item.href);
      sectionsHTML += `
        <a href="${item.href}" class="nav-item ${isActive ? "active" : ""}">
          <span class="nav-icon">${item.icon}</span>
          ${item.label}
        </a>`;
    });

    const avatar = session.name.charAt(0).toUpperCase();

    document.body.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-logo">
            <div class="sidebar-logo-mark">EMS</div>
            <div class="sidebar-logo-text">
              <div class="title">ระบบพนักงาน</div>
              <div class="sub">Management System</div>
            </div>
          </div>
          <nav class="sidebar-nav">${sectionsHTML}</nav>
          <div class="sidebar-footer">
            <div class="sidebar-user">
              <div class="avatar">${avatar}</div>
              <div class="uinfo">
                <div class="uname">${session.name}</div>
                <div class="urole">${session.role}</div>
              </div>
            </div>
            <button class="logout-btn" onclick="Auth.logout()">🚪 ออกจากระบบ</button>
          </div>
        </aside>

        <div class="main-content">
          <header class="topbar">
            <div class="topbar-title">${title}</div>
            <div class="topbar-right">
              <span class="topbar-date" id="topbar-date"></span>
              <button class="refresh-btn" id="refresh-btn" onclick="loadData(true)">
                🔄 อัปเดต
              </button>
            </div>
          </header>
          <main class="page-content" id="page-root"></main>
        </div>
      </div>` + document.body.innerHTML;

    // Clock
    function updateDate() {
      const now = new Date();
      document.getElementById("topbar-date").textContent =
        now.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
    updateDate(); setInterval(updateDate, 60_000);
  }

  return { init };
})();
