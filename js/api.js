// ============================================================
// api.js — ดึงข้อมูลจาก Google Apps Script
// ============================================================

const API = (() => {
  let _cache = null;
  let _lastFetch = 0;
  const CACHE_TTL = 60_000; // 60 วินาที

  async function fetchAll(force = false) {
    const now = Date.now();
    if (!force && _cache && now - _lastFetch < CACHE_TTL) return _cache;

    try {
      const res  = await fetch(CONFIG.API_URL + "?type=json");
      const data = await res.json();

      if (Array.isArray(data)) {
        _cache = { attendance: [...data].reverse(), leave: [] };
      } else {
        _cache = {
          attendance: data.attendance ? [...data.attendance].reverse() : [],
          leave:      data.leave || []
        };
      }
      _lastFetch = now;
      return _cache;
    } catch (err) {
      console.error("[API] fetchAll error:", err);
      return _cache || { attendance: [], leave: [] };
    }
  }

  async function submitLeave(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "submitLeave", ...payload })
    });
    return res;
  }

  // เขียนข้อมูล override การมาทำงานไปยัง Google Sheet
  // payload: { name, year, month, day, timeStr }  |  timeStr = null หมายถึงลบ
  async function writeAttendance(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "writeAttendance", ...payload })
    });
    return res;
  }

  // ส่งคำขอเบิกเงินล่วงหน้าไปยัง Google Sheet
  // payload: { name, amount, reason, requestDate }
  async function submitAdvance(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "submitAdvance", ...payload })
    });
    return res;
  }

  function invalidate() { _cache = null; }

  return { fetchAll, submitLeave, writeAttendance, submitAdvance, invalidate };
})();
