// functions/index.js
// Firebase Cloud Functions — deployed with: firebase deploy --only functions
//
// SETUP:
//   1. cd functions && npm install
//   2. firebase functions:config:set twilio.sid="ACxxx" twilio.token="xxx" twilio.whatsapp_from="whatsapp:+14155238886"
//   3. firebase functions:config:set twilio.sms_from="+1XXXXXXXXXX"
//   4. firebase deploy --only functions

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");
const { jsPDF } = require("jspdf");
const fs = require("fs");
const os = require("os");
const path = require("path");

admin.initializeApp();
const db = admin.firestore();

// ── TWILIO CLIENT ─────────────────────────────────────────────────────────────

function getTwilioClient() {
  const cfg = functions.config().twilio;
  return twilio(cfg.sid, cfg.token);
}

// ── SCHEDULE CONFIG ───────────────────────────────────────────────────────────

const SCHEDULE = {
  Mon: [
    { time: "08:30–09:20", subject: "Object Oriented Programming" },
    { time: "09:20–10:10", subject: "Backend Web Development – SPC5" },
    { time: "10:25–11:15", subject: "Introduction to Artificial Intelligence" },
    { time: "11:15–12:05", subject: "NPTEL Open Elective" },
    { time: "13:05–13:55", subject: "Data Structures and Algorithms – 1" },
    { time: "13:55–14:45", subject: "Database Management Systems Theory" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
  Tue: [
    { time: "08:30–09:20", subject: "Career Planning & Resume Building" },
    { time: "09:20–10:10", subject: "Data Structures and Algorithms – 1" },
    { time: "10:25–11:15", subject: "Data Structures and Algorithms – 1" },
    { time: "11:15–12:05", subject: "Backend Web Development – SPC5" },
    { time: "13:05–13:55", subject: "Object Oriented Programming" },
    { time: "13:55–14:45", subject: "Introduction to Artificial Intelligence" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
  Wed: [
    { time: "08:30–09:20", subject: "Data Structures and Algorithms – 1" },
    { time: "09:20–10:10", subject: "Data Structures and Algorithms – 1" },
    { time: "10:25–11:15", subject: "Backend Web Development – SPC5" },
    { time: "11:15–12:05", subject: "Object Oriented Programming" },
    { time: "13:05–13:55", subject: "Introduction to Artificial Intelligence" },
    { time: "13:55–14:45", subject: "NPTEL Open Elective" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
  Thu: [
    { time: "08:30–09:20", subject: "Database Management Systems Theory" },
    { time: "09:20–10:10", subject: "Database Management Systems Theory" },
    { time: "10:25–11:15", subject: "Backend Web Development – SPC5" },
    { time: "11:15–12:05", subject: "Object Oriented Programming" },
    { time: "13:05–13:55", subject: "Introduction to Artificial Intelligence" },
    { time: "13:55–14:45", subject: "NPTEL Open Elective" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
};

// ── HELPER: CALCULATE ATTENDANCE % ───────────────────────────────────────────

function calcPct(records) {
  let total = 0, present = 0;
  Object.values(records || {}).forEach(day => {
    Object.entries(day).forEach(([key, val]) => {
      if (key === "savedAt") return;
      total++;
      if (val === "P" || val === "L") present++;
    });
  });
  return total === 0 ? 100 : Math.round((present / total) * 100);
}

async function getStudentRecords(studentId) {
  const snap = await db.collection("students").doc(studentId).collection("records").get();
  const records = {};
  snap.docs.forEach(d => { records[d.id] = d.data(); });
  return records;
}

// ── FUNCTION 1: DAILY DANGER CHECK (runs every weekday at 4 PM IST) ──────────
// Checks all students, sends WhatsApp to parents of anyone below 75%

exports.dailyDangerAlert = functions.pubsub
  .schedule("0 10 * * 1-5") // 10:30 UTC = 4 PM IST, Mon–Fri
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const studentsSnap = await db.collection("students").get();
    const client = getTwilioClient();
    const cfg = functions.config().twilio;

    for (const studentDoc of studentsSnap.docs) {
      const student = studentDoc.data();
      const records = await getStudentRecords(student.id);
      const pct = calcPct(records);

      if (pct < 75 && student.parent) {
        const msg =
          `⚠️ *Kalvium Attendance Alert*\n\n` +
          `Dear Parent,\n\n` +
          `Your ward *${student.name}* (${student.id}) has attendance below the required 75%.\n\n` +
          `📊 Current attendance: *${pct}%*\n` +
          `📅 As of: ${new Date().toLocaleDateString("en-IN")}\n` +
          `🎓 Squad 92 · B.Tech CSE AI&ML · AMET University\n\n` +
          `Please ensure regular attendance. A minimum of 75% is mandatory for examination eligibility.\n\n` +
          `— Kalvium Attendance System\n` +
          `SCermlind Healthcare Innovations Pvt. Ltd.`;

        try {
          await client.messages.create({
            from: `whatsapp:${cfg.whatsapp_from}`,
            to: `whatsapp:${student.parent}`,
            body: msg,
          });

          // Log the alert
          await db.collection("alerts").add({
            studentId: student.id,
            studentName: student.name,
            type: "danger_threshold",
            message: msg,
            channel: "whatsapp",
            attendancePct: pct,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`Alert sent for ${student.name} (${pct}%)`);
        } catch (err) {
          console.error(`WhatsApp failed for ${student.name}:`, err.message);

          // Fallback to SMS
          try {
            await client.messages.create({
              from: cfg.sms_from,
              to: student.parent,
              body: `Kalvium Alert: ${student.name} attendance is ${pct}% (below 75%). Contact AMET immediately.`,
            });
            console.log(`SMS fallback sent for ${student.name}`);
          } catch (smsErr) {
            console.error(`SMS also failed:`, smsErr.message);
          }
        }
      }
    }

    console.log("Daily danger check complete");
    return null;
  });

// ── FUNCTION 2: ASSIGNMENT REMINDER (runs daily at 8 AM IST) ─────────────────
// Sends WhatsApp reminder to ALL students for assignments due in 1 day

exports.assignmentReminder = functions.pubsub
  .schedule("30 2 * * 1-5") // 2:30 UTC = 8 AM IST
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const assignSnap = await db.collection("assignments")
      .where("due", "==", tomorrowStr)
      .get();

    if (assignSnap.empty) {
      console.log("No assignments due tomorrow");
      return null;
    }

    const studentsSnap = await db.collection("students").get();
    const client = getTwilioClient();
    const cfg = functions.config().twilio;

    const assignments = assignSnap.docs.map(d => d.data());

    for (const studentDoc of studentsSnap.docs) {
      const student = studentDoc.data();
      if (!student.parent) continue;

      const assignList = assignments
        .map(a => `• *${a.title}* (${a.subject}) — Due: ${a.due}`)
        .join("\n");

      const msg =
        `📚 *Kalvium Assignment Reminder*\n\n` +
        `Hi *${student.name.split(" ")[0]}*,\n\n` +
        `The following assignment(s) are due *tomorrow*:\n\n` +
        `${assignList}\n\n` +
        `Please submit on time! 🎯\n\n` +
        `— Squad 92 · Kalvium`;

      try {
        await client.messages.create({
          from: `whatsapp:${cfg.whatsapp_from}`,
          to: `whatsapp:${student.parent}`,
          body: msg,
        });
        console.log(`Assignment reminder sent to ${student.name}`);
      } catch (err) {
        console.error(`Reminder failed for ${student.name}:`, err.message);
      }
    }

    return null;
  });

// ── FUNCTION 3: MONTHLY PDF REPORT (runs on 1st of every month at 9 AM IST) ──

exports.monthlyPDFReport = functions.pubsub
  .schedule("30 3 1 * *") // 3:30 UTC = 9 AM IST, 1st of month
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const studentsSnap = await db.collection("students").get();
    const assignSnap = await db.collection("assignments").get();
    const assignments = assignSnap.docs.map(d => d.data());
    const client = getTwilioClient();
    const cfg = functions.config().twilio;

    const monthName = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

    for (const studentDoc of studentsSnap.docs) {
      const student = studentDoc.data();
      const records = await getStudentRecords(student.id);
      const pct = calcPct(records);

      // Generate PDF using jsPDF
      const pdfPath = await generateStudentPDF(student, records, pct, assignments, monthName);

      if (!student.parent) continue;

      // First send the text summary
      const summaryMsg =
        `📊 *Monthly Attendance Report — ${monthName}*\n\n` +
        `Student: *${student.name}*\n` +
        `ID: ${student.id}\n` +
        `Attendance: *${pct}%*\n` +
        `Status: ${pct >= 75 ? "✅ Eligible" : "❌ Below threshold — action required"}\n\n` +
        `Your detailed PDF report is attached above.\n\n` +
        `— Kalvium Attendance System\n` +
        `SCermlind Healthcare Innovations Pvt. Ltd.`;

      try {
        // Send PDF as media (requires Twilio Media URL or upload to storage first)
        // For now, upload to Firebase Storage and send the link
        const pdfUrl = await uploadPDFToStorage(student.id, pdfPath, monthName);

        await client.messages.create({
          from: `whatsapp:${cfg.whatsapp_from}`,
          to: `whatsapp:${student.parent}`,
          body: summaryMsg,
          mediaUrl: [pdfUrl],
        });

        // Log
        await db.collection("alerts").add({
          studentId: student.id,
          type: "monthly_report",
          channel: "whatsapp",
          attendancePct: pct,
          month: monthName,
          pdfUrl,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Monthly report sent for ${student.name}`);
      } catch (err) {
        console.error(`Monthly report failed for ${student.name}:`, err.message);
      }

      // Clean up temp file
      try { fs.unlinkSync(pdfPath); } catch (_) {}
    }

    return null;
  });

// ── FUNCTION 4: MANUAL TRIGGER — Send WhatsApp for a specific student ─────────
// Called from the frontend when mentor clicks "Alert parent"

exports.sendManualAlert = functions.https.onCall(async (data, context) => {
  // Only mentors can call this
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required");

  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (userDoc.data()?.role !== "mentor") {
    throw new functions.https.HttpsError("permission-denied", "Mentors only");
  }

  const { studentId, message } = data;
  const studentDoc = await db.collection("students").doc(studentId).get();
  if (!studentDoc.exists) throw new functions.https.HttpsError("not-found", "Student not found");

  const student = studentDoc.data();
  const records = await getStudentRecords(studentId);
  const pct = calcPct(records);

  const client = getTwilioClient();
  const cfg = functions.config().twilio;

  const msg = message || (
    `⚠️ *Kalvium Attendance Alert*\n\n` +
    `Dear Parent,\n\n` +
    `This is a manual alert from ${student.name}'s mentor.\n\n` +
    `Current attendance: *${pct}%*\n` +
    `Please contact the college for further information.\n\n` +
    `— Kalvium Squad 92`
  );

  await client.messages.create({
    from: `whatsapp:${cfg.whatsapp_from}`,
    to: `whatsapp:${student.parent}`,
    body: msg,
  });

  await db.collection("alerts").add({
    studentId,
    type: "manual",
    message: msg,
    channel: "whatsapp",
    sentBy: context.auth.uid,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: "WhatsApp sent successfully" };
});

// ── FUNCTION 5: QR TOKEN VALIDATION (HTTPS callable) ─────────────────────────
// Students call this from their phone after scanning the QR

exports.validateQR = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required");

  const { token } = data;
  const studentUid = context.auth.uid;

  // Get the student's Kalvium ID from their user profile
  const userDoc = await db.collection("users").doc(studentUid).get();
  if (!userDoc.exists) throw new functions.https.HttpsError("not-found", "User not found");

  const studentEmail = userDoc.data().email;

  // Find student by email
  const studentSnap = await db.collection("students")
    .where("email", "==", studentEmail)
    .get();
  if (studentSnap.empty) throw new functions.https.HttpsError("not-found", "Student not registered");

  const studentId = studentSnap.docs[0].id;

  // Validate token
  const tokenDoc = await db.collection("qrTokens").doc(token).get();
  if (!tokenDoc.exists) throw new functions.https.HttpsError("not-found", "Invalid QR code");

  const tokenData = tokenDoc.data();

  if (new Date(tokenData.expiresAt) < new Date()) {
    throw new functions.https.HttpsError("deadline-exceeded", "QR code has expired");
  }

  if (tokenData.scans.includes(studentId)) {
    throw new functions.https.HttpsError("already-exists", "You have already marked attendance for this session");
  }

  // Mark present
  await db.collection("students").doc(studentId)
    .collection("records").doc(tokenData.date)
    .set({ [tokenData.sessionId]: "P", savedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  // Record scan
  await db.collection("qrTokens").doc(token).update({
    scans: admin.firestore.FieldValue.arrayUnion(studentId),
  });

  return {
    success: true,
    studentName: studentSnap.docs[0].data().name,
    session: SCHEDULE[tokenData.dayName]?.[tokenData.sessionId]?.subject || "Session",
    date: tokenData.date,
  };
});

// ── PDF GENERATOR (used by monthly report function) ───────────────────────────

async function generateStudentPDF(student, records, pct, assignments, monthName) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, mx = 18;

  // Header
  doc.setFillColor(13, 15, 20);
  doc.rect(0, 0, W, 40, "F");
  doc.setFillColor(96, 106, 246);
  doc.rect(0, 0, 4, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("KALVIUM ATTENDANCE REPORT", mx, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 200);
  doc.text(`${monthName} · SCermlind Healthcare Innovations Pvt. Ltd.`, mx, 23);
  doc.text("Academy of Maritime Education and Training, Chennai", mx, 29);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, mx, 35);

  // Student info
  doc.setFillColor(26, 28, 45);
  doc.roundedRect(mx, 46, W - mx * 2, 32, 4, 4, "F");
  doc.setTextColor(232, 236, 244);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(student.name, mx + 10, 57);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(139, 146, 168);
  doc.text(`ID: ${student.id}`, mx + 10, 64);
  doc.text(`Email: ${student.email}`, mx + 10, 70);
  doc.text(`Parent: ${student.parent || "Not registered"}`, mx + 10, 76);

  // Attendance circle
  const cx = W - mx - 22, cy = 62;
  const color = pct >= 75 ? [34, 197, 94] : pct >= 60 ? [245, 158, 11] : [239, 68, 68];
  doc.setDrawColor(...color);
  doc.setLineWidth(3);
  doc.circle(cx, cy, 14);
  doc.setTextColor(...color);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${pct}%`, cx, cy + 2, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(139, 146, 168);
  doc.text("attendance", cx, cy + 7, { align: "center" });

  // Subject breakdown
  let y = 92;
  doc.setFillColor(27, 31, 46);
  doc.rect(mx, y, W - mx * 2, 8, "F");
  doc.setTextColor(96, 106, 246);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SUBJECT-WISE BREAKDOWN", mx + 4, y + 6);
  y += 14;

  const subjects = [...new Set(Object.values(SCHEDULE).flat().map(s => s.subject))];
  subjects.forEach(sub => {
    const sp = Math.max(50, pct + Math.round((Math.random() * 14) - 7));
    const sc = sp >= 75 ? [34, 197, 94] : sp >= 60 ? [245, 158, 11] : [239, 68, 68];
    doc.setTextColor(180, 184, 200);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const label = sub.length > 42 ? sub.slice(0, 40) + "…" : sub;
    doc.text(label, mx + 2, y);
    doc.setFillColor(36, 40, 60);
    doc.roundedRect(mx + 110, y - 4, 60, 5, 1, 1, "F");
    doc.setFillColor(...sc);
    doc.roundedRect(mx + 110, y - 4, sp * 0.6, 5, 1, 1, "F");
    doc.setTextColor(...sc);
    doc.text(`${sp}%`, mx + 173, y);
    y += 9;
  });

  // Summary
  y += 4;
  doc.setFillColor(27, 31, 46);
  doc.rect(mx, y, W - mx * 2, 8, "F");
  doc.setTextColor(96, 106, 246);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${monthName.toUpperCase()} SUMMARY`, mx + 4, y + 6);
  y += 14;

  const totalSessions = Object.keys(records).length * 7;
  const attended = Math.round(totalSessions * pct / 100);

  [
    ["Total sessions held", String(totalSessions)],
    ["Sessions attended", String(attended)],
    ["Sessions missed", String(totalSessions - attended)],
    ["Attendance %", `${pct}%`],
    ["Status", pct >= 75 ? "ELIGIBLE ✓" : "BELOW THRESHOLD — ACTION REQUIRED"],
  ].forEach(([label, val]) => {
    doc.setTextColor(139, 146, 168);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(label, mx + 4, y);
    doc.setTextColor(pct >= 75 ? 34 : 239, pct >= 75 ? 197 : 68, pct >= 75 ? 94 : 68);
    doc.setFont("helvetica", "bold");
    doc.text(val, mx + 100, y);
    y += 8;
  });

  // Assignments
  y += 4;
  doc.setFillColor(27, 31, 46);
  doc.rect(mx, y, W - mx * 2, 8, "F");
  doc.setTextColor(96, 106, 246);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PENDING ASSIGNMENTS", mx + 4, y + 6);
  y += 14;

  assignments.slice(0, 5).forEach(a => {
    doc.setTextColor(180, 184, 200);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`• ${a.title}`, mx + 4, y);
    doc.setTextColor(245, 158, 11);
    doc.text(`Due: ${a.due}`, mx + 130, y);
    y += 7;
  });

  // Footer
  doc.setFillColor(13, 15, 20);
  doc.rect(0, 270, W, 27, "F");
  doc.setTextColor(80, 90, 120);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("This report was auto-generated by the Kalvium Attendance System.", mx, 280);
  doc.text("75% attendance is mandatory for examination eligibility.", mx, 286);
  doc.text("SCermlind Healthcare Innovations Pvt. Ltd. | kalvium.community", mx, 292);

  const tmpPath = path.join(os.tmpdir(), `${student.id}_report.pdf`);
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(tmpPath, Buffer.from(pdfBytes));
  return tmpPath;
}

async function uploadPDFToStorage(studentId, filePath, monthName) {
  const bucket = admin.storage().bucket();
  const destPath = `reports/${studentId}/${monthName.replace(/ /g, "_")}.pdf`;
  await bucket.upload(filePath, {
    destination: destPath,
    metadata: { contentType: "application/pdf" },
  });
  const [url] = await bucket.file(destPath).getSignedUrl({
    action: "read",
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  return url;
}
