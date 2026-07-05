const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbx7U7--gclJrJ9UgsyMeJvS1XtpnfFnke5UwfYKr26mBVNqVVMZSkaWh_dL4Od7C3CK/exec",
  APP_NAME: "ระบบพนักงาน",
  APP_SUBTITLE: "Employee Management System",
  LOGO_TEXT: "EMS",

  LOGIN_USER: { username: "sanaethai", name: "ผู้ดูแล Sanae Thai" },

  SESSION_KEY: "emp_session",

  TIME_ON_TIME:  8 * 60 + 30,   // 08:30 น. — มาก่อน/ตรงเวลานี้ = ปกติ, หลังจากนี้ = สาย
  TIME_LATE:     11 * 60,        // 11:00 น. — หลังจากนี้ = ครึ่งวัน

  STATUS_COLORS: {
    ontime: "#22c55e",
    late:   "#eab308",
    half:   "#f97316",
    absent: "#ef4444",
    leave:  "#6366f1",
  }
};
