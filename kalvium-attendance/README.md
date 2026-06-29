# Kalvium Attendance System — Setup Guide
**Squad 92 · B.Tech CSE AI&ML · AMET University**
Built by Sujan Anandh S (sujan.anandh.s93@kalvium.community)
Internship: SCermlind Healthcare Innovations Pvt. Ltd. | ATIUM Sports

---

## What's in this project

| File | What it does |
|---|---|
| `kalvium-attendance.html` | Full UI — works standalone, open in any browser |
| `src/firebase/config.js` | Firebase project credentials |
| `src/firebase/db.js` | All Firestore read/write functions |
| `src/firebase/auth.js` | Google sign-in + role detection |
| `src/App.jsx` | React entry point connecting Firebase to UI |
| `src/pages/QRAttendance.jsx` | QR generation (mentor) + scanning (student) |
| `functions/index.js` | Cloud Functions — WhatsApp alerts, SMS, monthly PDF |
| `functions/package.json` | Functions dependencies |

---

## STEP 1 — Run the prototype (0 setup needed)

Open `kalvium-attendance.html` directly in Chrome.
Everything works with mock data. Use this for demos.

---

## STEP 2 — Set up Firebase (30 minutes)

### 2a. Create Firebase project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `kalvium-attendance`
3. Disable Google Analytics (not needed) → **Create project**

### 2b. Enable Firestore
1. Left sidebar → **Build → Firestore Database**
2. Click **Create database** → **Start in production mode** → choose region `asia-south1` (Mumbai, closest to Chennai)
3. Click **Enable**

### 2c. Enable Authentication
1. Left sidebar → **Build → Authentication**
2. Click **Get started**
3. **Sign-in method** tab → enable **Google**
4. Add your project support email → **Save**

### 2d. Get your config
1. Left sidebar → **Project settings** (gear icon)
2. Scroll to **Your apps** → click **</>** (Web)
3. Register app as `kalvium-attendance-web`
4. Copy the `firebaseConfig` object

### 2e. Paste config into the project
Open `src/firebase/config.js` and replace each placeholder:
```js
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← paste your values
  authDomain: "kalvium-attendance.firebaseapp.com",
  projectId: "kalvium-attendance",
  storageBucket: "kalvium-attendance.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

### 2f. Set Firestore security rules
1. Firestore → **Rules** tab
2. Delete everything and paste the rules from `src/firebase/auth.js`
   (the string exported as `FIRESTORE_RULES`)
3. Click **Publish**

---

## STEP 3 — Set up Twilio for WhatsApp + SMS (20 minutes)

### 3a. Create Twilio account
1. Go to https://www.twilio.com/try-twilio → sign up free
2. Verify your phone number

### 3b. Enable WhatsApp Sandbox
1. Twilio console → **Messaging → Try it out → Send a WhatsApp message**
2. Follow the instructions — send the join code from your phone to activate the sandbox
3. This gives you a WhatsApp test number (`+14155238886`)
4. **For production**: Apply for a WhatsApp Business Account (takes 2–3 days)

### 3c. Get your credentials
From Twilio console dashboard, copy:
- **Account SID** (starts with `AC`)
- **Auth Token**
- **WhatsApp From number** (sandbox: `+14155238886`)

---

## STEP 4 — Deploy Cloud Functions (15 minutes)

### 4a. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 4b. Initialize Firebase in this project
```bash
cd kalvium-attendance
firebase init
```
Select: **Functions, Firestore, Hosting**
Use existing project → `kalvium-attendance`
Language: JavaScript, ESLint: No, Install dependencies: Yes

### 4c. Set Twilio secrets
```bash
firebase functions:config:set \
  twilio.sid="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  twilio.token="your_auth_token" \
  twilio.whatsapp_from="+14155238886" \
  twilio.sms_from="+1XXXXXXXXXX"
```

### 4d. Install function dependencies
```bash
cd functions
npm install
cd ..
```

### 4e. Test locally first
```bash
firebase emulators:start --only functions
```

### 4f. Deploy
```bash
firebase deploy --only functions
```

You'll see 5 functions deployed:
- `dailyDangerAlert` — runs daily at 4 PM IST
- `assignmentReminder` — runs daily at 8 AM IST
- `monthlyPDFReport` — runs on 1st of every month
- `sendManualAlert` — called from the UI
- `validateQR` — called from student's phone

---

## STEP 5 — Set up React app (optional, if you want the full React build)

```bash
npm create vite@latest kalvium-web -- --template react
cd kalvium-web
npm install firebase qrcode
npm install -D tailwindcss
```

Copy `src/` folder into the Vite project, then:
```bash
npm run dev
```

---

## STEP 6 — Deploy frontend to Vercel (5 minutes)

1. Push project to GitHub: `git push origin main`
2. Go to https://vercel.com → **Add new project**
3. Import your GitHub repo
4. Add environment variable:
   - `VITE_FIREBASE_CONFIG` = your firebase config as JSON string
5. Click **Deploy**

You'll get a URL like `kalvium-attendance.vercel.app` — share this with your mentor.

---

## STEP 7 — Add the QR route

In your React Router setup, add:
```jsx
import { QRScanner } from "./pages/QRAttendance";

<Route path="/scan" element={<QRScanner currentUser={user} />} />
```

Students bookmark `https://kalvium-attendance.vercel.app/scan` on their phones.

---

## How to demo this for college

**What to show:**
1. Open the HTML file → show the full dashboard with Squad 92 data
2. Go to **Mark attendance** → select a student → mark sessions → save
3. Go to **Alerts** → show the danger threshold cards for Karthik and Meera
4. Click **Download PDF** → show the generated report downloading
5. Go to **QR attendance** → generate a code → scan it on your own phone

**What to say:**
> "I built this during my internship at ATIUM Sports, part of SCermlind Healthcare Innovations.
> The system tracks attendance for our Squad 92 cohort, auto-alerts parents via WhatsApp when
> a student drops below 75%, generates monthly PDF report cards, and has a QR-based
> self-marking feature with time-limited tokens. It uses React, Firebase Firestore,
> Cloud Functions, Twilio, and jsPDF."

---

## Firestore data structure

```
students/
  KV001/
    name: "Sujan Anandh S"
    email: "sujan.anandh.s93@kalvium.community"
    parent: "+91 9876543210"
    color: "#6366f1"
    squad: "Squad 92"
    records/
      2026-03-10/
        0: "P"    ← session index: status
        1: "A"
        2: "P"
        savedAt: Timestamp

assignments/
  A1/
    title: "DSA Lab Assignment 3"
    subject: "Data Structures and Algorithms – 1"
    due: "2026-03-12"
    type: "Lab"
    status: "pending"

qrTokens/
  K7X2M9QR/
    sessionId: 2
    date: "2026-03-10"
    dayName: "Tue"
    expiresAt: "2026-03-10T09:35:00.000Z"
    scans: ["KV001", "KV003"]

alerts/
  {auto-id}/
    studentId: "KV003"
    type: "danger_threshold"
    channel: "whatsapp"
    attendancePct: 68
    sentAt: Timestamp
```

---

## Costs (all free tier)

| Service | Free tier | Usage |
|---|---|---|
| Firebase Firestore | 50k reads/day, 20k writes/day | More than enough for 30 students |
| Firebase Functions | 2M invocations/month | ~60 function calls/day |
| Vercel hosting | Unlimited for hobby | ✓ |
| Twilio WhatsApp | $0.005/message after trial | ~₹0.40/message |
| Twilio trial credit | $15.00 USD | ~3000 messages |

**Total cost for pilot with Squad 92 (30 students, 1 month): ~₹100–200**

---

## GitHub repo setup

```bash
git init
git add .
git commit -m "feat: Kalvium Attendance System — Squad 92

- Attendance tracking with Kalvium timetable (Mon–Thu, 7 sessions)
- Danger threshold alerts via WhatsApp (Twilio) when below 75%
- Monthly PDF report cards with jsPDF
- QR self-marking with 10-min time-limited tokens
- Firebase Firestore real-time sync
- Role-based access (mentor admin / student view)
- Assignment deadline tracker with reminders

Built during internship at SCermlind Healthcare Innovations Pvt. Ltd.
Applied ATIUM Sports React patterns to a real college problem."

git remote add origin https://github.com/SujanTheMagician/kalvium-attendance
git push -u origin main
```

Add this to your portfolio at `github.com/SujanTheMagician/Sujan-Anandh-Portfolio-v2`
