// ============================================================
// config.js — ค่าตั้งต้นของระบบ แก้ไขได้ที่นี่
// ============================================================

const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbx7U7--gclJrJ9UgsyMeJvS1XtpnfFnke5UwfYKr26mBVNqVVMZSkaWh_dL4Od7C3CK/exec",
  APP_NAME: "ระบบพนักงาน",
  APP_SUBTITLE: "Employee Management System",
  LOGO_TEXT: "EMS",

  // 🔐 รหัสสำหรับ "แก้ไข" และเข้าหน้า รายงาน / จัดการ
  //    (หน้าหลัก "ดูวันทำงาน" เข้าดูได้เลยโดยไม่ต้องล็อกอิน)
  LOGIN_USER: { username: "sanaethai", password: "sanaethai15", name: "ผู้ดูแล Sanae Thai" },

  // ชื่อ key สำหรับเก็บสถานะล็อกอิน (ใช้ localStorage — ค้างจนกดออกจากระบบ)
  SESSION_KEY: "emp_session",

  // Work time thresholds (24h format, minute-based)
  TIME_ON_TIME:  9 * 60 + 30,   // 09:30 น. — ปกติ
  TIME_LATE:     11 * 60,        // 11:00 น. — ครึ่งวัน
  // หลัง 11:00 = ครึ่งวัน / ไม่มีข้อมูล = ขาด

  // สีสถานะ
  STATUS_COLORS: {
    ontime: "#22c55e",
    late:   "#eab308",
    half:   "#f97316",
    absent: "#ef4444",
    leave:  "#6366f1",
  }
};
