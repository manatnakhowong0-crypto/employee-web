// ============================================================
// config.js — ค่าตั้งต้นของระบบ แก้ไขได้ที่นี่
// ============================================================

const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbx7U7--gclJrJ9UgsyMeJvS1XtpnfFnke5UwfYKr26mBVNqVVMZSkaWh_dL4Od7C3CK/exec",
  APP_NAME: "ระบบพนักงาน",
  APP_SUBTITLE: "Employee Management System",
  LOGO_TEXT: "EMS",

  // Login credentials (ในโปรเจกต์จริงควรตรวจสอบฝั่ง server)
  LOGIN_USERS: [
    { username: "admin",   password: "admin1234",  role: "admin",   name: "ผู้ดูแลระบบ" },
    { username: "manager", password: "manager123", role: "manager", name: "ผู้จัดการ" },
    { username: "hr",      password: "hr1234",     role: "hr",      name: "ฝ่ายบุคคล" },
  ],

  // ชื่อ key สำหรับ sessionStorage
  SESSION_KEY: "emp_session",

  // Work time thresholds (24h format, minute-based)
  TIME_ON_TIME:  9 * 60 + 30,   // 09:30 น. — ปกติ
  TIME_LATE:     11 * 60,        // 11:00 น. — ครึ่งวัน
  // หลัง 11:00 = ขาดงาน

  // สีสถานะ
  STATUS_COLORS: {
    ontime: "#22c55e",
    late:   "#eab308",
    half:   "#f97316",
    absent: "#ef4444",
    leave:  "#6366f1",
  }
};
