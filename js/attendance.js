// ============================================================
// attendance.js — Attendance Summary + Edit/Add/Delete
// ============================================================

const AttendancePage = (() => {

  let _data          = [];
  let _selectedYear  = new Date().getFullYear();
  let _selectedMonth = new Date().getMonth() + 1;
  let _selectedEmp   = "all";

  // _overrides[name][year][month][day] = { timeStr, minuteOfDay } | null
  let _overrides = {};

  const MONTHS_TH  = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
                      "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const MONTHS_SEL = MONTHS_TH.map((n,i) =>
    `${n} (${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]})`);
  const DOW_LABELS = ["อา","จ","อ","พ","พฤ","ศ","ส"];
  const DOW_TH     = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];

  // ── Parse row ────────────────────────────────────────────────
  function _parseRow(row) {
    const name = (row["เจ้าของ"] || "").trim();
    if (!name || !row["เวลาเริ่มต้น"]) return null;
    const parts = row["เวลาเริ่มต้น"].split(",");
    if (parts.length < 2) return null;
    const [d, m, y] = parts[0].trim().split("/").map(Number);
    const timePart  = parts[1].trim();
    const [hh, mm]  = timePart.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm)) return null;
    return { name, year: y, month: m, day: d, minuteOfDay: hh*60+mm, timeStr: timePart };
  }

  // ── Build base matrix ─────────────────────────────────────────
  function _buildFull(rows, year) {
    const byName = {};
    rows.forEach(raw => {
      const r = _parseRow(raw);
      if (!r || r.year !== year) return;
      if (!byName[r.name])          byName[r.name] = {};
      if (!byName[r.name][r.month]) byName[r.name][r.month] = {};
      const cur = byName[r.name][r.month][r.day];
      if (!cur || r.minuteOfDay < cur.minuteOfDay)
        byName[r.name][r.month][r.day] = r;
    });
    return byName;
  }

  // ── Apply overrides ───────────────────────────────────────────
  function _applyOverrides(byName, year) {
    Object.keys(_overrides).forEach(name => {
      const yData = _overrides[name]?.[year];
      if (!yData) return;
      Object.keys(yData).forEach(mStr => {
        const m = +mStr;
        Object.keys(yData[m]).forEach(dStr => {
          const d  = +dStr;
          const ov = yData[m][d];
          if (!byName[name])    byName[name] = {};
          if (!byName[name][m]) byName[name][m] = {};
          if (ov === null) delete byName[name][m][d];
          else             byName[name][m][d] = ov;
        });
      });
    });
    return byName;
  }

  // ── Status ────────────────────────────────────────────────────
  function _status(min) {
    if (min <= CONFIG.TIME_ON_TIME) return "ontime";
    if (min <= CONFIG.TIME_LATE)    return "late";
    return "half";
  }

  // ── Count month ───────────────────────────────────────────────
  function _countMonth(empMonthDays, year, month) {
    const dim = new Date(year, month, 0).getDate();
    let ontime=0, late=0, half=0, absent=0;
    for (let d = 1; d <= dim; d++) {
      const rec = empMonthDays?.[d];
      if (!rec) { absent++; continue; }
      const s = _status(rec.minuteOfDay);
      if (s==="ontime") ontime++;
      else if (s==="late") late++;
      else half++;
    }
    return { ontime, late, half, absent };
  }

  // ── Selectors ─────────────────────────────────────────────────
  function _renderSelectors(employees) {
    const empSel   = document.getElementById("att-emp-sel");
    const yearSel  = document.getElementById("att-year-sel");
    const monthSel = document.getElementById("att-month-sel");

    if (empSel) {
      const cur = empSel.value;
      empSel.innerHTML = `<option value="all">ทุกคน (All)</option>` +
        employees.map(e => `<option value="${e}">${e}</option>`).join("");
      empSel.value = (employees.includes(cur) || cur==="all") ? cur : "all";
      empSel.onchange = () => { _selectedEmp = empSel.value; render(); };
    }
    if (yearSel) {
      const ty = new Date().getFullYear();
      yearSel.innerHTML = [ty-1,ty,ty+1]
        .map(y=>`<option value="${y}" ${y===_selectedYear?"selected":""}>${y}</option>`).join("");
      yearSel.onchange = () => { _selectedYear = +yearSel.value; render(); };
    }
    if (monthSel) {
      const hide = _selectedEmp !== "all";
      const wrap = document.getElementById("month-sel-wrap") || monthSel.closest?.(".sel-wrap");
      if (wrap) wrap.style.display = hide ? "none" : "";
      else monthSel.style.display  = hide ? "none" : "";
      monthSel.innerHTML = MONTHS_SEL.map((n,i)=>
        `<option value="${i+1}" ${i+1===_selectedMonth?"selected":""}>${n}</option>`).join("");
      monthSel.onchange = () => { _selectedMonth = +monthSel.value; render(); };
    }

    // hint bar
    const hint = document.getElementById("edit-hint");
    if (hint) hint.style.display = _selectedEmp !== "all" ? "flex" : "none";
  }

  // ── Injected styles (once) ────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById("att-injected-style")) return;
    const s = document.createElement("style");
    s.id = "att-injected-style";
    s.textContent = `
      .att-cell.ontime { background:#16a34a!important; color:#fff!important; font-weight:700; }
      .att-cell.late   { background:#ca8a04!important; color:#fff!important; font-weight:700; }
      .att-cell.half   { background:#ea580c!important; color:#fff!important; font-weight:700; }
      .att-cell.absent { background:#dc2626!important; color:#fff!important; font-weight:700; }
      .att-stat.ontime { color:#16a34a!important; font-weight:800; }
      .att-stat.late   { color:#ca8a04!important; font-weight:800; }
      .att-stat.half   { color:#ea580c!important; font-weight:800; }
      .att-stat.absent { color:#dc2626!important; font-weight:800; }
      .att-th-day.weekend { color:#94a3b8!important; }

      /* clickable cell */
      td.att-cell {
        position: relative; cursor: pointer;
        transition: filter .15s;
      }
      td.att-cell:hover { filter: brightness(1.15); }
      td.att-cell:hover::after {
        content: "✏️";
        position: absolute; top: 0; right: 1px;
        font-size: 8px; line-height: 1;
        pointer-events: none;
      }
      .override-dot {
        display: inline-block; width: 5px; height: 5px;
        background: #fbbf24; border-radius: 50%;
        vertical-align: super; margin-left: 1px;
      }

      /* month block (mode B) */
      .month-section  { margin-bottom: 28px; }
      .month-label    { font-size:14px; font-weight:700; color:#1e3a5f;
                        padding:8px 4px 4px; border-bottom:2px solid #1e3a5f; margin-bottom:6px; }
      .year-summary   { display:flex; gap:16px; padding:10px 4px;
                        font-size:13px; font-weight:700; flex-wrap:wrap; }
      .ys-chip        { padding:4px 12px; border-radius:8px; font-size:13px; }
      .ys-ontime { background:#dcfce7; color:#16a34a; }
      .ys-late   { background:#fef9c3; color:#ca8a04; }
      .ys-half   { background:#ffedd5; color:#ea580c; }
      .ys-absent { background:#fee2e2; color:#dc2626; }

      /* modal */
      .att-modal-overlay {
        position:fixed; inset:0; background:rgba(0,0,0,.5);
        display:flex; align-items:center; justify-content:center; z-index:9999;
      }
      .att-modal {
        background:#fff; border-radius:16px; padding:28px 32px;
        width:380px; max-width:95vw;
        box-shadow:0 24px 64px rgba(0,0,0,.25); font-family:inherit;
        animation: modalIn .18s ease;
      }
      @keyframes modalIn { from{transform:scale(.93);opacity:0} to{transform:scale(1);opacity:1} }
      .att-modal h3    { margin:0 0 4px; font-size:17px; color:#1e3a5f; }
      .att-modal .msub { font-size:12px; color:#64748b; margin-bottom:20px; line-height:1.6; }
      .att-modal label { display:block; font-size:12px; font-weight:700;
                         color:#374151; margin-bottom:5px; }
      .att-modal input[type=time] {
        width:100%; padding:10px 14px; border:1.5px solid #d1d5db;
        border-radius:9px; font-size:16px; font-family:inherit;
        box-sizing:border-box; margin-bottom:18px;
      }
      .att-modal input[type=time]:focus { outline:none; border-color:#1e3a5f; }
      .modal-actions { display:flex; gap:8px; }
      .mbtn {
        flex:1; padding:11px 8px; border-radius:9px; border:none;
        font-size:13px; font-weight:700; cursor:pointer;
        font-family:inherit; transition:opacity .15s;
      }
      .mbtn:hover  { opacity:.82; }
      .mbtn.save   { background:#1e3a5f; color:#fff; }
      .mbtn.del    { background:#fee2e2; color:#dc2626; }
      .mbtn.cancel { background:#f1f5f9; color:#374151; }

      .clear-overrides-btn {
        padding:5px 14px; border-radius:7px; border:1px solid #fca5a5;
        background:#fee2e2; color:#dc2626; font-size:12px; font-weight:700;
        cursor:pointer; font-family:inherit; white-space:nowrap;
      }
      .clear-overrides-btn:hover { opacity:.8; }
    `;
    document.head.appendChild(s);
  }

  // ── Build cell HTML ───────────────────────────────────────────
  function _cell(rec, name, year, month, day) {
    const isOv  = !!_overrides?.[name]?.[year]?.[month]?.[day];
    const dot   = isOv ? `<span class="override-dot" title="แก้ไขแล้ว"></span>` : "";
    const args  = `'${name.replace(/'/g,"\\'")}',${year},${month},${day}`;
    const click = `onclick="AttendancePage.openModal(${args},'${rec ? rec.timeStr : "null"}')"`;

    if (!rec) return `<td class="att-cell absent" ${click}>✕${dot}</td>`;
    const st = _status(rec.minuteOfDay);
    return `<td class="att-cell ${st}" title="${rec.timeStr}" ${click}>✓${dot}</td>`;
  }

  // ── RENDER ────────────────────────────────────────────────────
  function render() {
    const grid = document.getElementById("att-grid");
    if (!grid) return;
    _injectStyles();

    const byNameBase   = _buildFull(_data, _selectedYear);
    const byName       = _applyOverrides(byNameBase, _selectedYear);

    // รวมชื่อจาก data + overrides กรองชื่อว่างออก
    const nameSet = new Set([
      ...Object.keys(byName),
      ...Object.keys(_overrides).filter(n => n && _overrides[n]?.[_selectedYear])
    ]);
    nameSet.delete(""); nameSet.delete("ไม่พบชื่อ");
    const allEmployees = [...nameSet].sort();

    _renderSelectors(allEmployees);

    // ══ MODE A : ทุกคน → เดือนเดียว ════════════════════════════
    if (_selectedEmp === "all") {
      const dim = new Date(_selectedYear, _selectedMonth, 0).getDate();
      const allDays = [];
      for (let d = 1; d <= dim; d++)
        allDays.push({ day:d, dow: new Date(_selectedYear, _selectedMonth-1, d).getDay() });

      let hdr = `<th class="att-th-name">รายชื่อพนักงาน</th>`;
      allDays.forEach(({ day, dow }) => {
        const we = dow===0||dow===6;
        hdr += `<th class="att-th-day${we?" weekend":""}">${day}<br><span class="dow">${DOW_LABELS[dow]}</span></th>`;
      });
      hdr += `<th class="att-th-stat">✅</th><th class="att-th-stat">⏰</th><th class="att-th-stat">🟠</th><th class="att-th-stat">❌</th>`;

      let tot = {ontime:0,late:0,half:0,absent:0};
      let bodyRows = "";
      allEmployees.forEach(name => {
        const days = byName[name]?.[_selectedMonth] || {};
        const s = _countMonth(days, _selectedYear, _selectedMonth);
        tot.ontime+=s.ontime; tot.late+=s.late; tot.half+=s.half; tot.absent+=s.absent;

        let cells = `<td class="att-name">${name}</td>`;
        allDays.forEach(({ day:d }) => cells += _cell(days[d], name, _selectedYear, _selectedMonth, d));
        cells += `<td class="att-stat ontime">${s.ontime}</td><td class="att-stat late">${s.late}</td><td class="att-stat half">${s.half}</td><td class="att-stat absent">${s.absent}</td>`;
        bodyRows += `<tr>${cells}</tr>`;
      });

      _setCard("card-ontime", tot.ontime);
      _setCard("card-late",   tot.late);
      _setCard("card-half",   tot.half);
      _setCard("card-absent", tot.absent);

      grid.innerHTML = `<table class="att-table"><thead><tr>${hdr}</tr></thead><tbody>${bodyRows}</tbody></table>`;
      return;
    }

    // ══ MODE B : พนักงานคนเดียว → 12 เดือน ═════════════════════
    const name    = _selectedEmp;
    const empData = byName[name] || {};
    let tot = {ontime:0,late:0,half:0,absent:0};
    let html = "";

    html += `<div style="display:flex;align-items:center;gap:10px;padding:0 4px 14px;flex-wrap:wrap">
      <span style="font-size:12px;color:#64748b">
        ✏️ คลิกเซลล์เพื่อเพิ่ม / แก้ไข / ลบข้อมูลการมา
      </span>
      <button class="clear-overrides-btn"
        onclick="AttendancePage.clearAllOverrides('${name.replace(/'/g,"\\'")}')">
        🗑 ล้างการแก้ไขทั้งหมด
      </button>
    </div>`;

    for (let m = 1; m <= 12; m++) {
      const dim = new Date(_selectedYear, m, 0).getDate();
      const allDays = [];
      for (let d = 1; d <= dim; d++)
        allDays.push({ day:d, dow: new Date(_selectedYear, m-1, d).getDay() });

      let hdr = "";
      allDays.forEach(({ day, dow }) => {
        const we = dow===0||dow===6;
        hdr += `<th class="att-th-day${we?" weekend":""}">${day}<br><span class="dow">${DOW_LABELS[dow]}</span></th>`;
      });
      hdr += `<th class="att-th-stat">✅</th><th class="att-th-stat">⏰</th><th class="att-th-stat">🟠</th><th class="att-th-stat">❌</th>`;

      const days = empData[m] || {};
      const s = _countMonth(days, _selectedYear, m);
      tot.ontime+=s.ontime; tot.late+=s.late; tot.half+=s.half; tot.absent+=s.absent;

      let cells = "";
      allDays.forEach(({ day:d }) => cells += _cell(days[d], name, _selectedYear, m, d));
      cells += `<td class="att-stat ontime">${s.ontime}</td><td class="att-stat late">${s.late}</td><td class="att-stat half">${s.half}</td><td class="att-stat absent">${s.absent}</td>`;

      html += `<div class="month-section">
        <div class="month-label">📅 ${MONTHS_TH[m-1]} ${_selectedYear}</div>
        <div style="overflow-x:auto">
          <table class="att-table">
            <thead><tr>${hdr}</tr></thead>
            <tbody><tr>${cells}</tr></tbody>
          </table>
        </div>
      </div>`;
    }

    html += `<div class="year-summary">
      <span style="align-self:center">สรุปทั้งปี ${_selectedYear} — <strong>${name}</strong></span>
      <span class="ys-chip ys-ontime">✅ ปกติ ${tot.ontime} วัน</span>
      <span class="ys-chip ys-late">⏰ สาย ${tot.late} วัน</span>
      <span class="ys-chip ys-half">🟠 ครึ่งวัน ${tot.half} วัน</span>
      <span class="ys-chip ys-absent">❌ ขาด ${tot.absent} วัน</span>
    </div>`;

    _setCard("card-ontime", tot.ontime);
    _setCard("card-late",   tot.late);
    _setCard("card-half",   tot.half);
    _setCard("card-absent", tot.absent);

    grid.innerHTML = html;
  }

  // ── MODAL ─────────────────────────────────────────────────────
  function openModal(name, year, month, day, currentTimeRaw) {
    _removeModal();
    const currentTime = (currentTimeRaw === "null" || currentTimeRaw === null) ? null : currentTimeRaw;
    const isNew  = currentTime === null;
    const defVal = isNew ? "09:00" : currentTime.substring(0,5);
    const dowLbl = DOW_TH[new Date(year, month-1, day).getDay()];

    const el = document.createElement("div");
    el.className = "att-modal-overlay";
    el.id        = "att-modal-overlay";
    el.innerHTML = `
      <div class="att-modal">
        <h3>${isNew ? "➕ เพิ่มการมาทำงาน" : "✏️ แก้ไขการมาทำงาน"}</h3>
        <div class="msub">
          👤 <strong>${name}</strong><br>
          📅 วัน${dowLbl}ที่ ${day} ${MONTHS_TH[month-1]} ${year}
          ${isNew ? "" : `&nbsp;·&nbsp; ⏰ เดิม: <strong>${currentTime}</strong>`}
        </div>
        <label>เวลาเข้างาน</label>
        <input type="time" id="modal-time-input" value="${defVal}" step="60">
        <div class="modal-actions">
          <button class="mbtn save"
            onclick="AttendancePage.saveOverride('${name.replace(/'/g,"\\'")}',${year},${month},${day})">
            💾 บันทึก
          </button>
          ${!isNew ? `<button class="mbtn del"
            onclick="AttendancePage.deleteOverride('${name.replace(/'/g,"\\'")}',${year},${month},${day})">
            🗑 ลบวันนี้
          </button>` : ""}
          <button class="mbtn cancel" onclick="AttendancePage._removeModal()">ยกเลิก</button>
        </div>
      </div>`;
    el.addEventListener("click", e => { if (e.target===el) _removeModal(); });
    document.body.appendChild(el);
    setTimeout(() => document.getElementById("modal-time-input")?.focus(), 50);
  }

  function _removeModal() { document.getElementById("att-modal-overlay")?.remove(); }

  function saveOverride(name, year, month, day) {
    const inp = document.getElementById("modal-time-input");
    if (!inp?.value) return;
    const [hh, mm] = inp.value.split(":").map(Number);
    const timeStr  = `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00`;
    _overrides[name]                   ??= {};
    _overrides[name][year]             ??= {};
    _overrides[name][year][month]      ??= {};
    _overrides[name][year][month][day]   = { timeStr, minuteOfDay: hh*60+mm };
    _removeModal();
    render();
  }

  function deleteOverride(name, year, month, day) {
    _overrides[name]                   ??= {};
    _overrides[name][year]             ??= {};
    _overrides[name][year][month]      ??= {};
    _overrides[name][year][month][day]   = null;
    _removeModal();
    render();
  }

  function clearAllOverrides(name) {
    if (!confirm(`ล้างการแก้ไขทั้งหมดของ "${name}" ใช่หรือไม่?`)) return;
    delete _overrides[name];
    render();
  }

  // ── helpers ───────────────────────────────────────────────────
  function _setCard(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  async function init(attendanceData) {
    _data          = attendanceData;
    _selectedYear  = new Date().getFullYear();
    _selectedMonth = new Date().getMonth() + 1;
    render();
  }

  return { init, render, openModal, saveOverride, deleteOverride, clearAllOverrides, _removeModal };
})();