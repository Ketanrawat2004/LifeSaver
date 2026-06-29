<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# LifeSaver AI

A productivity + focus app built with React, TypeScript, and Gemini API. It helps you manage cognitive load through task scheduling, focus sessions, and periodic self-check psychometric audits.

Built for the [Vibe2Ship Hackathon](https://www.codingninjas.com/) by Coding Ninjas × Google for Developers.

**Live:** https://lifesaver-ai-701042777489.asia-southeast1.run.app

---

## What it does

The core idea is that most productivity tools just give you a list. LifeSaver tries to account for *when* you work, not just *what* you need to do. It pulls in Gemini to help schedule tasks around your peak focus windows and gives you breathing exercises and short cognitive check-ins throughout the day.

Main features:
- **Task orbital sandbox** — drag tasks around a weighted canvas to prioritize by effort vs urgency
- **Chronobiology scheduler** — Gemini suggests task order based on time of day and your stated energy patterns
- **Box breathing module** — 4-7-8 breathing timer that runs between work blocks
- **Psychometric audits** — short periodic questionnaires that track attention, stress, and fatigue over time
- **Flow state tracker** — logs when you hit deep focus and correlates with what you were working on

---

## Tech

| Thing | What |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| AI | Google Gemini API via `@google/genai` |
| Backend | Express + TypeScript (`server.ts`) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Animations | Motion (Framer) |
| Charts | Recharts |
| Deploy | Google Cloud Run |

---

## Running locally

You need Node.js installed. That's it.

```bash
git clone https://github.com/Ketanrawat2004/LifeSaver.git
cd LifeSaver
npm install
```

Copy the env example and fill in your keys:

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

```
GEMINI_API_KEY=your_key_here
```

Get a Gemini key at https://aistudio.google.com/app/apikey — it's free.

Then run:

```bash
npm run dev
```

App will be at `http://localhost:5173` (or wherever Vite picks).

---

## Project structure

```
├── src/
│   ├── main.tsx          # entry point
│   └── ...               # components, hooks, pages
├── server.ts             # Express server (proxies Gemini API calls)
├── index.html
├── vite.config.ts
├── firebase-blueprint.json
└── firestore.rules
```

The server.ts exists mainly to keep the Gemini API key off the client. All AI calls go through `/api/*` routes on the Express side.

---

## Scripts

```bash
npm run dev      # start dev server (tsx server.ts + vite)
npm run build    # build frontend + bundle server for prod
npm run start    # run the built server
npm run lint     # typecheck only, no emit
```

---

## Firebase setup

If you want auth and Firestore to work locally, you'll need your own Firebase project:

1. Create a project at https://console.firebase.google.com
2. Enable Authentication (Email/Password or Google)
3. Enable Firestore
4. Copy your config into `.env.local` (check `.env.example` for the exact variable names)
5. Deploy Firestore rules: `firebase deploy --only firestore:rules`

The `firestore.rules` file in the repo has sensible defaults — users can only read/write their own data.

---

## Deploying

The app is deployed on Google Cloud Run. To deploy your own:

```bash
npm run build
gcloud run deploy lifesaver-ai \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key
```

---

## Notes

- This was built solo for a hackathon, so some parts are rough around the edges
- The psychometric audit data stays in Firestore per user — nothing is shared
- Gemini API calls are rate-limited on the free tier, so heavy usage might hit quota
- Mobile layout works but wasn't the main focus

---

Made by [@Ketanrawat2004](https://github.com/Ketanrawat2004)
