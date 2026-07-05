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

const LeavePage = (() => {

  async function submitLeave(e) {
    e.preventDefault();
    const name  = document.getElementById("leave-name").value;
    const type  = document.getElementById("leave-type").value;
    const start = document.getElementById("leave-start").value;
    const endRaw= document.getElementById("leave-end").value;

    const endDate = new Date(endRaw);
    endDate.setDate(endDate.getDate() + 1);
    const end = endDate.toISOString().split("T")[0];

    const password = await (typeof PasswordModal !== "undefined"
      ? PasswordModal.ask({ title: "ยืนยันการส่งใบลา", hint: "กรอกรหัสผ่านพนักงานเพื่อส่งใบลา" })
      : Promise.resolve(prompt("กรอกรหัสผ่านพนักงาน:")));
    if (!password) return;

    const btn = document.getElementById("leave-submit-btn");
    btn.disabled = true;
    btn.textContent = "⏳ กำลังส่ง...";

    try {
      const res = await API.submitLeave({ name, type, startDate: start, endDate: end, endDateDisplay: endRaw, password });
      let json = {}; try { json = await res.json(); } catch {}

      if (json?.code === "bad_password") {
        if (typeof PasswordModal !== "undefined") PasswordModal.wrongToast("รหัสผ่านพนักงานไม่ถูกต้อง");
        else alert("รหัสผ่านไม่ถูกต้อง");
      } else {
        alert("🎉 บันทึกวันลาสำเร็จ!");
        document.getElementById("leaveForm").reset();
        API.invalidate();
        if (typeof CalendarPage !== "undefined") {
          const fresh = await API.fetchAll(true);
          CalendarPage.init(fresh.leave, fresh.holiday);
        }
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

const CalendarPage = (() => {
  let _cal = null;
  let _leave = [];
  let _holiday = [];
  let _empFilter = "";   // กรองตามชื่อพนักงาน (ว่าง = ทุกคน)

  const COLOR_MAP = {
    "ลาป่วย":    "#E74C3C",
    "ลากิจ":     "#D4AF37",
    "ลาพักร้อน": "#0A2540"
  };
  const HOLIDAY_COLOR = "#16a34a";   // วันหยุดจัดสรร = เขียว

  function _plusDay(ds) {
    if (!ds) return ds;
    const d = new Date(String(ds) + "T00:00:00");
    if (isNaN(d)) return ds;
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  function _buildEvents() {
    const ev = [];
    (_leave || []).forEach(row => {
      const nm = row["ชื่อพนักงาน"] || "";
      if (_empFilter && nm !== _empFilter) return;
      ev.push({
        title: `🔴 ${nm} (${row["ประเภทการลา"]})`,
        start: row["วันที่เริ่มลา"],
        end:   _plusDay(row["ถึงวันที่"]),
        color: COLOR_MAP[row["ประเภทการลา"]] || "#9e9e9e",
        extendedProps: { kind: "leave" }
      });
    });
    (_holiday || []).forEach(row => {
      const nm = row["ชื่อ-นามสกุล"] || row["ชื่อพนักงาน"] || "";
      if (_empFilter && nm !== _empFilter) return;
      const d = _hdate(row["วันที่หยุด"]);
      if (!d) return;
      ev.push({
        title: `🟢 ${nm} หยุด${row["ประเภทวันหยุด"] ? " (" + row["ประเภทวันหยุด"] + ")" : ""}`,
        start: d,
        allDay: true,
        color: HOLIDAY_COLOR,
        extendedProps: { kind: "holiday", name: nm, oldDate: d, note: row["หมายเหตุ"] || "" }
      });
    });
    return ev;
  }

  function _hdate(ds) {
    if (!ds) return null;
    ds = String(ds).trim().split(" ")[0];
    let p;
    if (ds.indexOf("-") >= 0) p = ds.split("-").map(Number);
    else if (ds.indexOf("/") >= 0) p = ds.split("/").map(Number);
    else return null;
    if (p.length < 3 || p.some(isNaN)) return null;
    let y, m, d;
    if (p[0] > 1000) { y = p[0]; m = p[1]; d = p[2]; } else { d = p[0]; m = p[1]; y = p[2]; }
    if (y > 2400) y -= 543;
    return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  function init(leaveData, holidayData) {
    _leave   = leaveData   || _leave;
    _holiday = holidayData || _holiday;
    const el = document.getElementById("calendar-container");
    if (!el || typeof FullCalendar === "undefined") return;

    _buildEmpDropdown();

    if (_cal) _cal.destroy();
    _cal = new FullCalendar.Calendar(el, {
      initialView: "dayGridMonth",
      locale: "th",
      events: _buildEvents(),
      headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth" },
      eventClick: _onEventClick
    });
    _cal.render();
  }

  function _buildEmpDropdown() {
    const sel = document.getElementById("cal-emp");
    if (!sel) return;
    const names = new Set();
    (_holiday || []).forEach(r => { const n = r["ชื่อ-นามสกุล"] || r["ชื่อพนักงาน"]; if (n) names.add(n.trim()); });
    (_leave || []).forEach(r => { const n = r["ชื่อพนักงาน"]; if (n) names.add(n.trim()); });
    const cur = sel.value;
    sel.innerHTML = `<option value="">— ทุกคน —</option>` + [...names].sort().map(n => `<option>${n}</option>`).join("");
    sel.value = cur || "";
    if (!sel._wired) {
      sel._wired = true;
      sel.addEventListener("change", () => { _empFilter = sel.value; if (_cal) { _cal.removeAllEvents(); _cal.addEventSource(_buildEvents()); } });
    }
  }

  async function _onEventClick(info) {
    const ep = info.event.extendedProps || {};
    if (ep.kind !== "holiday") return;
    const newDate = prompt(`สลับวันหยุดของ ${ep.name}\nจากวันที่ ${ep.oldDate}\n\nพิมพ์วันที่ใหม่ (รูปแบบ YYYY-MM-DD):`, ep.oldDate);
    if (!newDate || newDate === ep.oldDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) { alert("รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)"); return; }

    const password = await (typeof PasswordModal !== "undefined"
      ? PasswordModal.ask({ title: "ยืนยันการสลับวันหยุด", hint: `${ep.name}: ${ep.oldDate} → ${newDate}` })
      : Promise.resolve(prompt("กรอกรหัสผ่านพนักงาน:")));
    if (!password) return;

    try {
      const res = await API.swapHoliday({ name: ep.name, oldDate: ep.oldDate, newDate, note: ep.note, password });
      let json = {}; try { json = await res.json(); } catch {}
      if (json?.code === "bad_password") {
        if (typeof PasswordModal !== "undefined") PasswordModal.wrongToast("รหัสผ่านพนักงานไม่ถูกต้อง"); else alert("รหัสผ่านไม่ถูกต้อง");
        return;
      }
      if (json?.status === "ok" || res.ok) {
        alert(`✅ สลับวันหยุดเป็น ${newDate} แล้ว`);
        API.invalidate();
        const fresh = await API.fetchAll(true);
        init(fresh.leave, fresh.holiday);
      } else {
        alert("❌ " + (json?.message || "สลับวันหยุดไม่สำเร็จ"));
      }
    } catch (err) { console.error(err); alert("เชื่อมต่อ Server ไม่ได้"); }
  }

  function rerender() { if (_cal) setTimeout(() => _cal.render(), 100); }

  return { init, rerender };
})();

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
