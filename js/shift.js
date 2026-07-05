const ShiftScheduler = (() => {
  const DOW = ["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์","อาทิตย์"];   // index 0..6 = Mon..Sun
  const DOW_SHORT = ["จ.","อ.","พ.","พฤ.","ศ.","ส.","อา."];
  const THMON = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

  let _emps = [
    { name: "ทราย", off: 2 }, // พุธ
    { name: "พลอย", off: 1 }, // อังคาร
    { name: "นก",   off: 4 }, // ศุกร์
    { name: "ตูน",  off: 0 }, // จันทร์
    { name: "เนย",  off: 3 }, // พฤหัสบดี
  ];

  function _renderEmpRows() {
    const box = document.getElementById("sf-emp-list");
    if (!box) return;
    box.innerHTML = _emps.map((e, i) => `
      <div class="sf-emp-row">
        <input class="sf-name" data-i="${i}" value="${_esc(e.name)}" placeholder="ชื่อพนักงาน">
        <select class="sf-off" data-i="${i}">
          <option value="-1"${e.off===-1?" selected":""}>ไม่มีวันหยุดประจำ</option>
          ${DOW.map((d,di)=>`<option value="${di}"${e.off===di?" selected":""}>หยุด ${d}</option>`).join("")}
        </select>
        <button class="sf-del" data-i="${i}" title="ลบ">✕</button>
      </div>`).join("");
    box.querySelectorAll(".sf-name").forEach(inp => inp.addEventListener("input", e => { _emps[+e.target.dataset.i].name = e.target.value; }));
    box.querySelectorAll(".sf-off").forEach(sel => sel.addEventListener("change", e => { _emps[+e.target.dataset.i].off = +e.target.value; }));
    box.querySelectorAll(".sf-del").forEach(b => b.addEventListener("click", () => { _emps.splice(+b.dataset.i,1); _renderEmpRows(); }));
  }

  function _generate() {
    const emps = _emps.filter(e => (e.name||"").trim()).map(e => ({ name:e.name.trim(), off:e.off }));
    if (emps.length < 2) { alert("ต้องมีพนักงานอย่างน้อย 2 คน"); return null; }

    const perDay = Math.max(1, Math.min(emps.length, +document.getElementById("sf-perday").value || 2));
    const weeks  = Math.max(1, Math.min(8, +document.getElementById("sf-weeks").value || 4));
    const startRaw = document.getElementById("sf-start").value;

    let monday = null;
    if (startRaw) {
      const d = new Date(startRaw + "T00:00:00");
      const wd = (d.getDay() + 6) % 7; // 0=Mon
      d.setDate(d.getDate() - wd);
      monday = d;
    }

    const count = {}, last = {};
    emps.forEach(e => { count[e.name] = 0; last[e.name] = -999; });

    const schedule = []; // [{week, dayIdx, dateStr, off:[], on:[]}]
    let gd = 0;
    for (let w = 0; w < weeks; w++) {
      for (let di = 0; di < 7; di++) {
        const off = emps.filter(e => e.off === di).map(e => e.name);
        const offSet = new Set(off);
        const avail = emps.filter(e => !offSet.has(e.name));
        avail.sort((a,b) => (count[a.name]-count[b.name]) || (last[a.name]-last[b.name]) || a.name.localeCompare(b.name,"th"));
        const on = avail.slice(0, perDay).map(e => e.name);
        on.forEach(n => { count[n]++; last[n] = gd; });

        let dateStr = "";
        if (monday) {
          const dd = new Date(monday); dd.setDate(dd.getDate() + gd);
          dateStr = `${dd.getDate()} ${THMON[dd.getMonth()]}`;
        }
        schedule.push({ week:w, dayIdx:di, dateStr, off, on });
        gd++;
      }
    }
    return { emps, perDay, weeks, schedule, count };
  }

  function run() {
    const res = _generate();
    if (!res) return;
    const out = document.getElementById("sf-output");

    let html = "";
    for (let w = 0; w < res.weeks; w++) {
      const wk = res.schedule.filter(s => s.week === w);
      const wkCount = {};
      res.emps.forEach(e => wkCount[e.name] = 0);
      wk.forEach(s => s.on.forEach(n => wkCount[n]++));

      html += `<div class="sf-week">
        <div class="sf-week-head">📅 สัปดาห์ที่ ${w+1}</div>
        <div class="sf-table-scroll"><table class="sf-table">
          <thead><tr><th>วัน</th><th>คนหยุด</th><th>อยู่เวรเย็น (${res.perDay} คน)</th></tr></thead>
          <tbody>${wk.map(s => `
            <tr class="${s.dayIdx>=5?"sf-weekend":""}">
              <td class="sf-day">${DOW[s.dayIdx]}${s.dateStr?` <span class="sf-date">${s.dateStr}</span>`:""}</td>
              <td class="sf-off-cell">${s.off.length ? s.off.join(", ") : "<i>(ไม่มีคนหยุด)</i>"}</td>
              <td class="sf-on-cell"><b>${s.on.join(", ")}</b></td>
            </tr>`).join("")}</tbody>
        </table></div>
        <div class="sf-wk-summary">
          <div class="sf-wk-summary-title">📋 สรุปเวรสัปดาห์นี้</div>
          <div class="sf-table-scroll"><table class="sf-table sf-mini">
            <thead><tr>${res.emps.map(e=>`<th>${_esc(e.name)}</th>`).join("")}</tr></thead>
            <tbody><tr>${res.emps.map(e=>`<td><b>${wkCount[e.name]}</b> วัน</td>`).join("")}</tr></tbody>
          </table></div>
        </div>
      </div>`;
    }

    const perWeek = {};
    res.emps.forEach(e => perWeek[e.name] = Array(res.weeks).fill(0));
    res.schedule.forEach(s => s.on.forEach(n => perWeek[n][s.week]++));
    const totalMax = Math.max(...Object.values(res.count));
    const totalMin = Math.min(...Object.values(res.count));

    html += `<div class="sf-summary">
      <div class="sf-week-head">📊 สรุปยอดรวมจำนวนวันเข้าเวรทั้งเดือน</div>
      <div class="sf-table-scroll"><table class="sf-table">
        <thead><tr><th>พนักงาน</th>${Array.from({length:res.weeks},(_,i)=>`<th>สัปดาห์ ${i+1}</th>`).join("")}<th>รวมทั้งเดือน</th></tr></thead>
        <tbody>${res.emps.map(e => `
          <tr>
            <td class="sf-day">${e.name}</td>
            ${perWeek[e.name].map(c=>`<td>${c} วัน</td>`).join("")}
            <td class="sf-total ${res.count[e.name]===totalMax&&totalMax!==totalMin?"sf-hi":""}"><b>${res.count[e.name]} วัน</b></td>
          </tr>`).join("")}</tbody>
      </table></div>
      <p class="sf-note">💡 เฉลี่ยเวรได้ยุติธรรม — ต่างกันมากสุด ${totalMax-totalMin} วัน ${totalMax!==totalMin?`(คนเข้าเวรมากสุด ${totalMax} วัน, น้อยสุด ${totalMin} วัน)`:"(ทุกคนเท่ากัน)"} • เดือนหน้าแนะนำสลับให้คนที่ได้ ${totalMax} วัน ลดเหลือ ${totalMin} วัน</p>
    </div>`;

    out.innerHTML = html;
    out.style.display = "block";
    document.getElementById("sf-print-btn").style.display = "inline-block";
  }

  function printSchedule() {
    const out = document.getElementById("sf-output");
    if (!out || !out.innerHTML.trim()) { run(); }
    const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map(n => n.outerHTML).join("");
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">'+styles+
      '<style>@page{size:A4;margin:12mm}body{margin:0;padding:0;font-family:"Sarabun",sans-serif}'+
      '.sf-week,.sf-summary{page-break-inside:avoid}'+
      '.sf-wk-summary,.sf-summary{display:none !important}'+   /* ปริ้นเอาแค่ตารางเวรรายวัน */
      '</style></head><body>'+
      '<h2 style="color:#1e3a5f;text-align:center;margin:0 0 4px">ตารางจัดเวรเย็น — SANAE THAI</h2>'+
      '<p style="text-align:center;color:#64748b;margin:0 0 16px">ออกเมื่อ '+new Date().toLocaleDateString("th-TH")+'</p>'+
      document.getElementById("sf-output").innerHTML+'</body></html>');
    doc.close();
    setTimeout(() => { try{ iframe.contentWindow.focus(); iframe.contentWindow.print(); }catch(e){} setTimeout(()=>{try{document.body.removeChild(iframe);}catch(e){}}, 1500); }, 500);
  }

  function _esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  function init() {
    if (!document.getElementById("sf-emp-list")) return;
    _renderEmpRows();
    document.getElementById("sf-add").addEventListener("click", () => { _emps.push({name:"", off:-1}); _renderEmpRows(); });
    document.getElementById("sf-gen").addEventListener("click", run);
    document.getElementById("sf-print-btn").addEventListener("click", printSchedule);
  }

  return { init };
})();
