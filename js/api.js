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
        _cache = { attendance: [...data].reverse(), leave: [], advance: [] };
      } else {
        _cache = {
          attendance: data.attendance ? [...data.attendance].reverse() : [],
          leave:      data.leave   || [],
          advance:    data.advance || [],
          holiday:    data.holiday || []
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

  function _mgr() { return (typeof Auth !== "undefined" && Auth.mgrPassword) ? Auth.mgrPassword() : ""; }

  async function writeAttendance(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "writeAttendance", password: _mgr(), ...payload })
    });
    return res;
  }

  async function submitAdvance(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "submitAdvance", ...payload })
    });
    return res;
  }

  async function updateAdvance(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "updateAdvance", password: _mgr(), ...payload })
    });
    return res;
  }

  async function deleteAdvance(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "deleteAdvance", password: _mgr(), ...payload })
    });
    return res;
  }

  function invalidate() { _cache = null; }

  async function verify(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "verify", ...payload })
    });
    return res;
  }

  async function swapHoliday(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "swapHoliday", ...payload })
    });
    return res;
  }

  async function getPayroll(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getPayroll", ...payload })
    });
    return res;
  }

  async function savePayslip(payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "savePayslip", password: _mgr(), ...payload })
    });
    return res;
  }

  return { fetchAll, submitLeave, writeAttendance, submitAdvance, updateAdvance, deleteAdvance, verify, swapHoliday, getPayroll, savePayslip, invalidate };
})();
