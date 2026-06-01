// ============================================================
// advance.js — ระบบเบิกเงินล่วงหน้า (Salary Advance)
// ============================================================

const AdvancePage = (() => {

  // ── State ─────────────────────────────────────────────────
  let _employees = [];      // รายชื่อพนักงานจาก attendance data
  let _history   = [];      // ประวัติคำขอในเซสชันนี้ (เก็บใน memory)

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    _loadHistory();
    _renderHistory();
    _setupForm();
    _setDefaultDate();

    // ดึงรายชื่อพนักงานจาก API เพื่อใส่ใน datalist
    try {
      const data = await API.fetchAll();
      const nameSet = new Set();
      (data.attendance || []).forEach(row => {
        const n = (row["เจ้าของ"] || "").trim();
        if (n) nameSet.add(n);
      });
      _employees = [...nameSet].sort();
      _populateDatalist(_employees);
    } catch (err) {
      console.warn("[Advance] ไม่สามารถดึงรายชื่อพนักงาน:", err);
    }
  }

  // ── Form setup ────────────────────────────────────────────
  function _setupForm() {
    const btn = document.getElementById("advance-submit-btn");
    if (btn) btn.addEventListener("click", _handleSubmit);
  }

  function _setDefaultDate() {
    const inp = document.getElementById("adv-date");
    if (inp) inp.value = new Date().toISOString().slice(0, 10);
  }

  function _populateDatalist(names) {
    const dl = document.getElementById("emp-datalist");
    if (!dl) return;
    dl.innerHTML = names.map(n => `<option value="${n}">`).join("");
  }

  // ── Submit handler ────────────────────────────────────────
  async function _handleSubmit() {
    const name        = document.getElementById("adv-name")?.value.trim();
    const amountRaw   = document.getElementById("adv-amount")?.value.trim();
    const reason      = document.getElementById("adv-reason")?.value.trim();
    const requestDate = document.getElementById("adv-date")?.value;

    // Validate
    if (!name)   { _showAlert("กรุณากรอกชื่อพนักงาน", "error");  return; }
    if (!amountRaw || isNaN(+amountRaw) || +amountRaw <= 0) {
      _showAlert("กรุณากรอกจำนวนเงินที่ถูกต้อง", "error"); return;
    }
    if (!reason) { _showAlert("กรุณากรอกเหตุผลการเบิก", "error"); return; }
    if (!requestDate) { _showAlert("กรุณาเลือกวันที่", "error"); return; }

    const amount = +amountRaw;
    const btn    = document.getElementById("advance-submit-btn");

    // Loading state
    if (btn) { btn.disabled = true; btn.textContent = "⏳ กำลังส่ง..."; }
    _showAlert("", "");

    try {
      const res = await API.submitAdvance({ name, amount, reason, requestDate });

      let ok = false;
      try {
        const json = await res.json();
        ok = json?.status === "ok" || json?.result === "success" || res.ok;
      } catch { ok = res.ok; }

      if (ok) {
        _addHistoryEntry({ name, amount, reason, requestDate, status: "ส่งแล้ว" });
        _clearForm();
        _showAlert(`✅ ส่งคำขอเบิกเงินของ ${name} จำนวน ${_fmt(amount)} บาท เรียบร้อยแล้ว`, "success");
      } else {
        _showAlert("❌ เกิดข้อผิดพลาด กรุณาลองอีกครั้ง", "error");
      }
    } catch (err) {
      console.error("[Advance] submitAdvance error:", err);
      _showAlert("❌ ไม่สามารถเชื่อมต่อ Server กรุณาลองใหม่", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "📤 ส่งคำขอเบิก"; }
    }
  }

  // ── History (sessionStorage) ──────────────────────────────
  const HIST_KEY = "advance_history";

  function _loadHistory() {
    try { _history = JSON.parse(sessionStorage.getItem(HIST_KEY)) || []; }
    catch { _history = []; }
  }

  function _addHistoryEntry(entry) {
    entry.id = Date.now();
    _history.unshift(entry);
    if (_history.length > 50) _history.pop(); // เก็บสูงสุด 50 รายการ
    try { sessionStorage.setItem(HIST_KEY, JSON.stringify(_history)); } catch {}
    _renderHistory();
  }

  function _renderHistory() {
    const tbody = document.getElementById("adv-history-body");
    const wrap  = document.getElementById("adv-history-wrap");
    if (!tbody) return;

    if (_history.length === 0) {
      if (wrap) wrap.style.display = "none";
      return;
    }
    if (wrap) wrap.style.display = "";

    tbody.innerHTML = _history.map(h => `
      <tr>
        <td>${_fmtDate(h.requestDate)}</td>
        <td>${_esc(h.name)}</td>
        <td style="text-align:right;font-weight:700;color:#1e3a5f">${_fmt(h.amount)}</td>
        <td>${_esc(h.reason)}</td>
        <td><span class="adv-badge ${h.status === 'ส่งแล้ว' ? 'sent' : 'pending'}">${_esc(h.status)}</span></td>
      </tr>`).join("");
  }

  // ── Helpers ───────────────────────────────────────────────
  function _clearForm() {
    ["adv-name","adv-amount","adv-reason"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    _setDefaultDate();
  }

  function _showAlert(msg, type) {
    const el = document.getElementById("adv-alert");
    if (!el) return;
    el.textContent = msg;
    el.className   = `adv-alert ${type}`;
    el.style.display = msg ? "block" : "none";
  }

  function _fmt(n) {
    return Number(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _fmtDate(d) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                    "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    return `${+day} ${MONTHS[+m-1]} ${+y+543}`;
  }

  function _esc(s) {
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  return { init };
})();
