## 2026-08-22T20:46:14Z

You are Worker M1 (Backend Core, Database Resilience & Firebase Auth Implementer).
Working Directory: C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai\.agents\worker_m1
Project Root: C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai

Read the original request at: C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai\.agents\ORIGINAL_REQUEST.md
Read the project architecture at: C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai\PROJECT.md
Read the detailed backend survey at: C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai\.agents\explorer_survey_2\survey_backend.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task for Milestone 1 (Backend Core, Database Resilience & Firebase Auth):
1. Dependencies:
   - Ensure backend dependencies include `firebase-admin` (install or add to package.json, run npm install if needed).
2. Database Reliability (R3):
   - In `config/db.js`, implement a genuine 3-attempt exponential backoff retry loop (1s, 2s, 4s) when connecting to MongoDB Atlas.
   - Non-blocking startup: If DB connection fails after retries, log the error clearly and allow the Node/Express server to continue running without exiting, but maintain an accurate `dbState.isConnected = false`.
   - Export a `dbGuard` / fast-failing middleware or check: When a request hits a DB-dependent route while DB is disconnected, immediately return HTTP 503 Service Unavailable with a clean JSON error message `{ "error": "Database service temporarily unavailable. Please retry shortly." }` instead of allowing Mongoose to hang for 10 seconds.
   - In `controllers/documentController.js`, implement a real `/api/health` handler that checks `mongoose.connection.readyState`, measures ping latency, and returns `{ status: 'healthy'|'degraded', database: { status: 'connected'|'disconnected', latencyMs, provider: 'mongodb-atlas' }, uptime, timestamp }` with status 200 (if connected) or 503 (if degraded).
3. Firebase ID Token Verification & Auth Refactor (R2):
   - In `config/firebase.js`, initialize Firebase Admin SDK using `FIREBASE_PROJECT_ID` or fallback/credentials from env. If Firebase credentials/project ID are not configured in dev, provide a clean development verifier or warning while maintaining full production readiness.
   - In `middlewares/authMiddleware.js`, verify incoming `Authorization: Bearer <token>`. Extract the decoded token (Firebase UID, email, name). Auto-find or provision the `User` record in MongoDB keyed by `firebaseUid`, and attach `req.user` with `{ firebaseUid, email, displayName, organizationName, role }`. Return 401 Unauthorized for missing or invalid tokens.
   - In `models/User.js`, refactor schema: key by `firebaseUid: { type: String, required: true, unique: true, index: true }`, `email`, `displayName`, `organizationName`, removing bcrypt and password fields.
   - In `models/Document.js`, refactor `userId: { type: String, required: true, index: true }`.
   - In `controllers/authController.js` and `routes/authRoutes.js`, update `/api/auth/me` and `/api/auth/profile` to work with Firebase authenticated users and allow updating `organizationName`. Remove legacy custom password register/login endpoints (or redirect them cleanly to Firebase).
4. Document Controller & Pagination (R5 backend):
   - In `controllers/documentController.js`:
     - Update `anchorDocument` to use `req.user.firebaseUid` and `req.user.organizationName || req.user.displayName`.
     - Update `getDocuments` to properly implement pagination using query params `page` (default 1) and `limit` (default 10 or 20), calculating `skip = (page - 1) * limit`, executing `Document.countDocuments({ userId: req.user.firebaseUid })`, and returning `{ documents, pagination: { total, page, pages, limit } }`.
5. Security Headers (R1/R2 CSP):
   - In `config/security.js`, update Helmet CSP directives: allow `connectSrc` for `https://*.googleapis.com`, `https://*.firebaseio.com`, `https://identitytoolkit.googleapis.com`, `https://securetoken.googleapis.com`; allow `scriptSrc` and `frameSrc` for Google/GitHub OAuth popup domains.
6. Verification & Handoff:
   - Run tests / test script / node startup check to verify all backend modules load cleanly without syntax or import errors.
   - Write your implementation report to C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai\.agents\worker_m1\implementation.md and a self-contained handoff to C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai\.agents\worker_m1\handoff.md.
   - When done, message parent orchestrator.
