# Kalvium Attendance — now a real Vite + React project

This replaces the old single-file `index.html` (in-browser Babel) with a proper
Vite + React build. Same Firebase project, same GitHub repo, same Vercel
deployment — only the build system changed.

## What changed

- No more in-browser Babel — code is compiled ahead of time by Vite, so there's
  no risk of a stray attribute (like the `data-presets` typo) breaking the
  entire page at runtime.
- Every page and modal is its own file under `src/pages` / `src/components`,
  instead of one 1200-line HTML file.
- The typing bug (inputs losing focus after one character) is permanently
  fixed — that bug only existed because modals were defined *inside* the
  `App` function in the old HTML version, causing React to recreate the
  `<input>` DOM node on every keystroke. In this version every component is
  a stable top-level export, so that can't happen again.
- Mentor/campus manager emails are NOT hardcoded anywhere — they live in a
  Firestore `mentors` collection and are managed from the in-app **Team
  access** page.

## Local setup

```bash
cd kalvium-react
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Deploy (same Vercel project, same domain)

This project is structured so it can replace the contents of your existing
`kalvium-attendance` GitHub repo directly. Vercel auto-detects Vite and uses
the `vercel.json` rewrite rule included here, so the existing
`kalvium-attendance-nu.vercel.app` domain keeps working without any new
project setup.

```bash
# from inside your existing repo folder, after replacing files with this project:
git add .
git commit -m "feat: migrate to Vite + React (fixes typing bug, revamped UI)"
git push
```

Vercel will detect the `package.json` + `vite.config.js` and switch from
static HTML hosting to a proper Vite build automatically. No dashboard
changes needed on Vercel's side.

## Firebase

Same project (`kalvium-attendance`), same config — now living in
`src/lib/firebase.js` instead of inline `<script type="module">` tags.
Firestore security rules, Authentication settings, and authorized domains
in the Firebase console do **not** need to change.

## Adding mentors / campus managers

Sign in as a mentor → click **Team access** in the sidebar → enter an email
(and optional name/role) → **Add to team**. That person gets full mentor
access the next time they sign in with Google — no code change, no
redeploy. Removing someone from that list instantly revokes their mentor
view.
