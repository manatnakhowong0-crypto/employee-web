# 📊 Employee Management System

ระบบข้อมูลพนักงาน — ดึงข้อมูลจาก Google Sheets | มี Login | มีตาราง Attendance Grid

---

## 📁 โครงสร้างไฟล์

```
employee-system/
├── index.html                  ← หน้า Login (เข้าก่อนทุกครั้ง)
├── pages/
│   ├── dashboard.html          ← แดชบอร์ด + คนมาวันนี้
│   ├── attendance.html         ← ตารางสรุปมาทำงานรายเดือน ★
│   ├── search.html             ← ค้นหาตามวันที่
│   ├── employee.html           ← ประวัติทั้งหมด
│   └── leave.html              ← แจ้งลา + ปฏิทิน
├── css/
│   ├── main.css                ← Global styles + Sidebar layout
│   ├── attendance.css          ← Attendance grid styles
│   └── pages.css               ← Dashboard, Search, Leave styles
├── js/
│   ├── config.js               ← API URL + Settings
│   ├── auth.js                 ← Login/Logout/Session
│   ├── api.js                  ← Fetch + Cache จาก Google Sheets
│   ├── attendance.js           ← Logic ตาราง Attendance Grid
│   ├── pages.js                ← Search, Leave, Calendar, Employee logic
│   └── layout.js               ← Sidebar injection (unused — each page has own sidebar)
└── README.md
```

---

## 🚀 วิธีใช้งาน

1. เปิด `index.html` ในเบราว์เซอร์
2. ล็อกอินด้วย:

| Username | Password    | บทบาท      |
|----------|-------------|------------|
| admin    | admin1234   | ผู้ดูแลระบบ |
| manager  | manager123  | ผู้จัดการ   |
| hr       | hr1234      | ฝ่ายบุคคล  |

3. ระบบจะ redirect ไปหน้า Dashboard อัตโนมัติ

---

## 📊 ตาราง Attendance Grid (หน้าหลัก)

- เลือก **พนักงาน** / **ปี** / **เดือน** ได้อิสระ
- แต่ละช่องแสดงสีตามเวลาเข้างาน:
  - 🟢 **ปกติ** — ก่อน 09:30
  - 🟡 **สาย** — 09:31 – 11:00  
  - 🟠 **ครึ่งวัน** — หลัง 11:00
  - 🔴 **ขาด** — ไม่มีข้อมูล (วันทำงาน)
  - ⬜ **เสาร์-อาทิตย์** — ข้าม
- Summary cards รวมยอดทั้งเดือน

---

## 🔧 แก้ไข Google Apps Script URL

เปิด `js/config.js` แก้ที่บรรทัด `API_URL`:

```js
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  ...
};
```

---

## 🔒 ระบบ Login

- ใช้ `sessionStorage` — ปิดแท็บ = ออกจากระบบ
- ทุกหน้าใน `pages/` ตรวจ session ก่อน render
- ในโปรเจกต์จริงควรย้าย credential ไปตรวจที่ฝั่ง server
