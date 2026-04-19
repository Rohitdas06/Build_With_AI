# SHERS — Smart Hospitality Emergency Response System

Real-time emergency coordination for hotels and hospitality venues: live sensor feed, incidents, staff comms, team roster, analytics, and **server-side Google Gemini** for predictive threat intel, incident narratives, and the guest SOS assistant (ARIA).

## Stack

| Layer | Technology |
|--------|------------|
| UI | React 19, TypeScript, Tailwind CSS 4, Motion, Lucide, Recharts, i18next |
| Build | Vite |
| Server | Express (Node), `tsx` in development |
| Data | SQLite (`better-sqlite3`), file `shers.db` at project root |
| Realtime | WebSockets (`ws`) on `/ws` (JWT in query: `?token=…`) |
| Auth | JWT + bcrypt-hashed users (seeded demo accounts) |
| AI | `@google/genai` on the **server only** (no API key in the browser bundle) |

## Quick start

1. **Install**  
   `npm install`

2. **Environment**  
   Copy `.env.example` to `.env` and set at least:

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `GEMINI_API_KEY` | Yes (for AI features) | Google AI / Gemini API key (no quotes or spaces around the value; the server trims it once). If Google rejects the key, threat intel stops after one warning—login and sensors still run. |
   | `JWT_SECRET` | Recommended | JWT signing secret |
   | `PORT` | No | HTTP port (default **3000**) |
   | `GEMINI_MODEL` | No | Model id (default `gemini-2.0-flash`) |
   | `TWILIO_*` | No | Placeholder hooks for SMS on critical events |

3. **Database**  
   SQLite is created and migrated on first server start. Seeded users are inserted only when the `users` table is empty.

4. **Run**  
   `npm run dev` — single process: Express serves the API, WebSocket, and (in dev) Vite middleware + HMR.

5. **Open**  
   [http://localhost:3000](http://localhost:3000) (or your configured `PORT`).

## Demo accounts

| Username   | Password      | Role     |
|------------|---------------|----------|
| `admin`    | `admin123`    | admin    |
| `staff`    | `staff123`    | staff    |
| `security` | `security123` | security |

After login, use **Run Live Demo** for a scripted incident/message flow, watch the **sensor feed** and **threat intel** panel, open **AI Report** on an incident, and try the **guest SOS** (ARIA) widget.

On each server start, the three demo users above are **re-synced** (bcrypt hashes and profile fields) so an older `shers.db` or failed seed cannot permanently break login.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (`tsx server.ts`) |
| `npm run build` | Production client bundle → `dist/` |
| `npm run start` | Run server (ensure Node can execute `server.ts` or use `tsx server.ts` in production) |
| `npm run lint` | `tsc --noEmit` |

## Project layout (high level)

- `server.ts` — Express routes, SQLite, WebSocket hub, sensor + threat loops, Gemini calls  
- `src/` — React app (`Dashboard`, incidents, comms, analytics, guest chat, i18n)  
- `src/api/client.ts` — Authenticated `fetch` helpers  
- `.planning/codebase/` — GSD codebase map (optional reference for contributors)

## Deployment note

The app expects a **long-lived Node** process with SQLite and WebSockets. A static-only or classic serverless host is not a drop-in fit; use a VM, container, or Node-friendly PaaS, and align `vercel.json` (or remove it) with your actual hosting model.

## License

See file headers in source (e.g. Apache-2.0 where noted).
