# Security Policy

## Supported Versions

This project is currently in active development. Only the latest version on `main` is supported.

| Version | Supported |
|---|---|
| main (latest) | ✅ |
| older commits | ❌ |

---

## Reporting a Vulnerability

If you find a security issue — whether it's an exposed API key, an auth bypass, a Firestore rules gap, or anything else — please **don't open a public issue**.

Instead, report it privately:

**Email:** ketanrawat2004@gmail.com  
**Subject line:** `[SECURITY] LifeSaver - brief description`

Include as much detail as you can:
- What the vulnerability is
- How to reproduce it (steps, curl commands, screenshots — whatever helps)
- What the potential impact is
- Whether you have a suggested fix

I'll acknowledge the report within **48 hours** and aim to have a fix or mitigation in place within **7 days** depending on severity. I'll keep you updated through the process and credit you in the fix commit if you want.

---

## Scope

Things that are in scope:

- Authentication and session handling (Firebase Auth)
- Firestore security rules — if you can read or write another user's data, that's a valid report
- API key exposure (Gemini, Firebase config)
- Server-side request forgery or injection via the Express backend
- XSS or content injection in the React frontend

Things that are out of scope:

- Bugs in third-party dependencies (report those upstream — Firebase, Gemini, etc.)
- Issues that require physical access to a device
- Social engineering
- Rate limiting / DoS on the free-tier Cloud Run deployment — it's a hackathon project, not production infrastructure

---

## What to expect

- I won't take legal action against good-faith security researchers
- I'll be transparent about what I fix and when
- If the issue is serious, I'll rotate affected keys and notify any impacted users before disclosing publicly

---

## Known limitations

Since this was built for a hackathon, a few things worth knowing:

- The Gemini API key lives server-side in Cloud Run env vars — it's not in the repo
- Firebase config values (API key, project ID, etc.) are safe to be public — they're meant to be — but the Firestore rules are what protect the data
- There are no automated security scans set up yet

If you spot something that looks like a gap, assume I haven't checked it and let me know.
