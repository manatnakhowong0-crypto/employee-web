const AdvancePage = (() => {

  let _employees = [];   // รายชื่อพนักงานจาก attendance
  let _advances  = [];   // รายการเบิกทั้งหมด (จากชีต)

  async function init() {
    _setupForm();
    _setDefaultDate();
    await _refresh();
  }

  async function _refresh(force = false) {
    try {
      const data = await API.fetchAll(force);

      const nameSet = new Set();
      (data.attendance || []).forEach(row => {
        const n = (row["เจ้าของ"] || "").trim();
        if (n) nameSet.add(n);
      });
      _employees = [...nameSet].sort();
      _populateDatalist(_employees);

      _advances = (data.advance || []).map((r, idx) => ({
        idx,
        name:         (r["ชื่อพนักงาน"] || "").trim(),
        amount:       Number(r["จำนวนเงิน (บาท)"] || r["จำนวนเงิน"] || 0) || 0,
        reason:       r["เหตุผล"] || "",
        requestDate:  r["วันที่ขอเบิก"] || "",
        recordedDate: (r["วันที่บันทึก"] || "").trim(),
        status:       (r["สถานะ"] || "รอดำเนินการ").trim(),
      }));
      _renderHistory();
    } catch (err) {
      console.warn("[Advance] โหลดข้อมูลไม่สำเร็จ:", err);
      _renderHistory();
    }
  }

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
    dl.innerHTML = names.map(n => `<option value="${_esc(n)}">`).join("");
  }

  async function _handleSubmit() {
    const name        = document.getElementById("adv-name")?.value.trim();
    const amountRaw   = document.getElementById("adv-amount")?.value.trim();
    const reason      = document.getElementById("adv-reason")?.value.trim();
    const requestDate = document.getElementById("adv-date")?.value;

    if (!name)   { _showAlert("กรุณากรอกชื่อพนักงาน", "error");  return; }
    if (!amountRaw || isNaN(+amountRaw) || +amountRaw <= 0) {
      _showAlert("กรุณากรอกจำนวนเงินที่ถูกต้อง", "error"); return;
    }
    if (!reason) { _showAlert("กรุณากรอกเหตุผลการเบิก", "error"); return; }
    if (!requestDate) { _showAlert("กรุณาเลือกวันที่", "error"); return; }

    const amount = +amountRaw;
    const btn    = document.getElementById("advance-submit-btn");

    const password = await PasswordModal.ask({
      title: "ยืนยันการเบิกเงิน",
      hint: "กรอกรหัสผ่านพนักงานเพื่อส่งคำขอ"
    });
    if (!password) return;   // กดยกเลิก

    if (btn) { btn.disabled = true; btn.textContent = "⏳ กำลังส่ง..."; }
    _showAlert("", "");

    try {
      const res = await API.submitAdvance({ name, amount, reason, requestDate, password });
      let json = {}; try { json = await res.json(); } catch {}
      const ok = json?.status === "ok" || json?.result === "success";

      if (json?.code === "bad_password") {
        PasswordModal.wrongToast("รหัสผ่านพนักงานไม่ถูกต้อง");
        _showAlert("❌ รหัสผ่านไม่ถูกต้อง — ยังไม่ได้บันทึก", "error");
      } else if (ok || res.ok) {
        _clearForm();
        _showAlert(`✅ ส่งคำขอเบิกเงินของ ${name} จำนวน ${_fmt(amount)} บาท เรียบร้อยแล้ว`, "success");
        API.invalidate();
        await _refresh(true);
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

  async function _markTransferred(recordedDate, name, btnEl) {
    if (typeof Auth !== "undefined" && !Auth.isLoggedIn()) {
      Auth.openLogin(() => _markTransferred(recordedDate, name, btnEl));
      return;
    }
    const item = _advances.find(a => a.recordedDate === recordedDate && a.name === name);
    if (!item) return;
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = "⏳..."; }
    try {
      const res = await API.updateAdvance({ name, recordedDate, status: "โอนแล้ว" });
      let ok = false;
      try { const json = await res.json(); ok = json?.status === "ok" || res.ok; }
      catch { ok = res.ok; }   // อ่าน response ไม่ได้ก็ถือว่าน่าจะสำเร็จ (เขียนไปแล้ว)

      if (ok) {
        item.status = "โอนแล้ว";
        API.invalidate();
        _renderHistory();
        _showAlert(`✅ บันทึกว่าโอนให้ ${name} แล้ว`, "success");
      } else {
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = "💸 โอนแล้ว"; }
        _showAlert("❌ อัปเดตสถานะไม่สำเร็จ ลองใหม่อีกครั้ง", "error");
      }
    } catch (err) {
      console.error("[Advance] updateAdvance error:", err);
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = "💸 โอนแล้ว"; }
      _showAlert("❌ เชื่อมต่อ Server ไม่ได้ ลองใหม่อีกครั้ง", "error");
    }
  }

  function _isPaid(status) { return /โอน/.test(status); }

  function _renderHistory() {
    const tbody = document.getElementById("adv-history-body");
    const wrap  = document.getElementById("adv-history-wrap");
    if (!tbody) return;

    if (_advances.length === 0) {
      if (wrap) wrap.style.display = "none";
      return;
    }
    if (wrap) wrap.style.display = "";

    const list = [..._advances].reverse();

    tbody.innerHTML = list.map(h => {
      const paid = _isPaid(h.status);
      const badge = paid
        ? `<span class="adv-badge paid">✅ โอนแล้ว</span>`
        : `<span class="adv-badge pending">⏳ ${_esc(h.status || "รอดำเนินการ")}</span>`;
      const transferBtn = paid
        ? `<span class="adv-paid-note">—</span>`
        : `<button class="adv-transfer-btn" data-rec="${_esc(h.recordedDate)}" data-name="${_esc(h.name)}">💸 โอนแล้ว</button>`;
      const delBtn = `<button class="adv-del-btn" data-rec="${_esc(h.recordedDate)}" data-name="${_esc(h.name)}" data-amt="${h.amount}" title="ลบรายการนี้">🗑 ลบ</button>`;
      return `
        <tr>
          <td>${_fmtDate(h.requestDate)}</td>
          <td>${_esc(h.name)}</td>
          <td style="text-align:right;font-weight:700;color:#1e3a5f">${_fmt(h.amount)}</td>
          <td>${_esc(h.reason)}</td>
          <td>${badge}</td>
          <td style="text-align:center">${transferBtn}</td>
          <td style="text-align:center">${delBtn}</td>
        </tr>`;
    }).join("");

    tbody.querySelectorAll(".adv-transfer-btn").forEach(b => {
      b.addEventListener("click", () => _markTransferred(b.dataset.rec, b.dataset.name, b));
    });
    tbody.querySelectorAll(".adv-del-btn").forEach(b => {
      b.addEventListener("click", () => _deleteAdvance(b.dataset.rec, b.dataset.name, b.dataset.amt, b));
    });
  }

  async function _deleteAdvance(recordedDate, name, amount, btnEl) {
    if (typeof Auth !== "undefined" && !Auth.isLoggedIn()) {
      Auth.openLogin(() => _deleteAdvance(recordedDate, name, amount, btnEl));
      return;
    }
    if (!confirm(`ลบรายการเบิกของ "${name}" จำนวน ${_fmt(amount)} บาท?\n(ลบออกจาก Google Sheet ถาวร)`)) return;
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = "⏳..."; }
    try {
      const res = await API.deleteAdvance({ name, recordedDate });
      let ok = false;
      try { const json = await res.json(); ok = json?.status === "ok" || res.ok; }
      catch { ok = res.ok; }

      if (ok) {
        _advances = _advances.filter(a => !(a.recordedDate === recordedDate && a.name === name));
        API.invalidate();
        _renderHistory();
        _showAlert(`🗑 ลบรายการเบิกของ ${name} แล้ว`, "success");
      } else {
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = "🗑 ลบ"; }
        _showAlert("❌ ลบไม่สำเร็จ ลองใหม่อีกครั้ง", "error");
      }
    } catch (err) {
      console.error("[Advance] deleteAdvance error:", err);
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = "🗑 ลบ"; }
      _showAlert("❌ เชื่อมต่อ Server ไม่ได้ ลองใหม่อีกครั้ง", "error");
    }
  }

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
    const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    let y, m, day;
    if (d.indexOf("-") >= 0) { [y, m, day] = d.split("-"); }
    else if (d.indexOf("/") >= 0) { const p = d.split(" ")[0].split("/"); day = p[0]; m = p[1]; y = p[2]; }
    else return _esc(d);
    if (!y || !m || !day) return _esc(d);
    let yy = +y; if (yy < 2400) yy += 543;   // แสดงเป็น พ.ศ.
    return `${+day} ${MONTHS[(+m-1+12)%12]} ${yy}`;
  }

  function _esc(s) {
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  return { init };
})();
