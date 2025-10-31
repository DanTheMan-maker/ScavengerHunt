# Geo Scavenger Hunt - Starter Framework

Minimal runnable prototype for a web-based geo-scavenger-hunt:
- Node.js + Express backend
- Socket.IO for real-time lobby/game events
- Static frontend under `/public` (simple JS + HTML)
- Join-code based game creation

## How to run locally
1. Install dependencies:
   ```
   npm install
   ```
2. Start the server:
   ```
   npm start
   ```
3. Open the app (Replit will provide a live URL). Locally:
   `http://localhost:3000`

## Notes
- This is a starter scaffold meant to run in Replit or locally.
- For production, replace the simple in-memory store with a proper database,
  add authentication, and secure WebSocket origins.
- Frontend is intentionally minimal (no build step). For a React/Next.js app,
  replace `/public` with a proper client folder and build pipeline.
