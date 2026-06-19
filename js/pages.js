// ============================================================
// search.js — ค้นหาตามวันที่
// ============================================================

const SearchPage = (() => {
  let _data = [];

  function _parseDate(str) {
    if (!str) return null;
    const [datePart] = str.split(",");
    const [d, m, y] = datePart.trim().split("/").map(Number);
    return { d, m, y };
  }

  function filterByDate(dateVal) {
    if (!dateVal) return;
    const sel  = new Date(dateVal);
    const sDay = sel.getDate(), sMon = sel.getMonth() + 1, sYr = sel.getFullYear();

    const seen = new Set();
    const rows = [];
    _data.forEach(row => {
      if (!row["เจ้าของ"]) return;
      const pd = _parseDate(row["เวลาเริ่มต้น"]);
      if (!pd || pd.d !== sDay || pd.m !== sMon || pd.y !== sYr) return;
      if (seen.has(row["เจ้าของ"])) return;
      seen.add(row["เจ้าของ"]);
      const timePart = row["เวลาเริ่มต้น"].split(",")[1]?.trim() || row["เวลาเริ่มต้น"];
      rows.push({ name: row["เจ้าของ"], time: timePart });
    });

    document.getElementById("search-count").textContent = rows.length;
    const tbody = document.getElementById("table-search");
    tbody.innerHTML = rows.length === 0
      ? `<tr><td colspan="3" class="empty-row">ไม่มีประวัติการเข้างานในวันที่นี้</td></tr>`
      : rows.map((r, i) => `<tr><td class="center">${i + 1}</td><td>${r.name}</td><td>${r.time}</td></tr>`).join("");
  }

  function init(data) {
    _data = data;
    const input = document.getElementById("search-date-input");
    if (input) {
      const today = new Date().toISOString().split("T")[0];
      input.value = today;
      input.addEventListener("change", () => filterByDate(input.value));
      filterByDate(today);
    }
  }

  return { init, filterByDate };
})();


// ============================================================
// leave.js — ฟอร์มแจ้งลา
// ============================================================

const LeavePage = (() => {

  async function submitLeave(e) {
    e.preventDefault();
    const name  = document.getElementById("leave-name").value;
    const type  = document.getElementById("leave-type").value;
    const start = document.getElementById("leave-start").value;
    const endRaw= document.getElementById("leave-end").value;

    // เพิ่ม 1 วันสำหรับ FullCalendar (exclusive end)
    const endDate = new Date(endRaw);
    endDate.setDate(endDate.getDate() + 1);
    const end = endDate.toISOString().split("T")[0];

    const btn = document.getElementById("leave-submit-btn");
    btn.disabled = true;
    btn.textContent = "⏳ กำลังส่ง...";

    try {
      await API.submitLeave({ name, type, startDate: start, endDate: end });
      alert("🎉 บันทึกวันลาสำเร็จ!");
      document.getElementById("leaveForm").reset();
      API.invalidate();
      // re-render calendar
      if (typeof CalendarPage !== "undefined") {
        const fresh = await API.fetchAll(true);
        CalendarPage.init(fresh.leave);
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      btn.disabled = false;
      btn.textContent = "ส่งใบลา 📤";
    }
  }

  function init() {
    const form = document.getElementById("leaveForm");
    if (form) form.addEventListener("submit", submitLeave);
  }

  return { init };
})();


// ============================================================
// calendar.js — FullCalendar วันลา
// ============================================================

const CalendarPage = (() => {
  let _cal = null;

  const COLOR_MAP = {
    "ลาป่วย":    "#E74C3C",
    "ลากิจ":     "#D4AF37",
    "ลาพักร้อน": "#0A2540"
  };

  function init(leaveData) {
    const el = document.getElementById("calendar-container");
    if (!el || typeof FullCalendar === "undefined") return;

    const events = (leaveData || []).map(row => ({
      title: `${row["ชื่อพนักงาน"]} (${row["ประเภทการลา"]})`,
      start: row["วันที่เริ่มลา"],
      end:   row["ถึงวันที่"],
      color: COLOR_MAP[row["ประเภทการลา"]] || "#9e9e9e"
    }));

    if (_cal) _cal.destroy();

    _cal = new FullCalendar.Calendar(el, {
      initialView: "dayGridMonth",
      locale: "th",
      events,
      headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth" }
    });
    _cal.render();
  }

  function rerender() { if (_cal) setTimeout(() => _cal.render(), 100); }

  return { init, rerender };
})();


// ============================================================
// employee.js — ประวัติทั้งหมด (all records table)
// ============================================================

const EmployeePage = (() => {

  function renderAll(data) {
    const tbody = document.getElementById("table-all");
    if (!tbody) return;

    const rows = data.filter(r => r["เจ้าของ"]);
    tbody.innerHTML = rows.length === 0
      ? `<tr><td colspan="4" class="empty-row">ไม่พบข้อมูล</td></tr>`
      : rows.map(row => `
          <tr>
            <td>${row["เจ้าของ"]}</td>
            <td><span class="badge-type">${row["ประเภทกิจกรรม"] || "—"}</span></td>
            <td>${row["เวลาเริ่มต้น"] || "—"}</td>
            <td>
              ${row["สถานที่"]
                ? `<a href="${row["สถานที่"]}" target="_blank" class="map-link">📍 ดูแผนที่</a>`
                : "—"}
            </td>
          </tr>`).join("");
  }

  return { renderAll };
})();
