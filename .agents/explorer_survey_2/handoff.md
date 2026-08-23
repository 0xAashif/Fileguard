# Handoff Report — Backend, Auth & DB Reliability Investigation

**Agent:** Explorer 2 (Backend, Auth & DB Reliability Investigator)  
**Recipient:** Parent Orchestrator / Builder Agents  
**Timestamp:** 2026-08-23T02:15:45Z  
**Type:** Hard Handoff  

---

## 1. Observation

Direct observations from source file inspection and static code analysis:

1. **Fake Fallback & Mongoose Buffer Timeout in `config/db.js` (lines 57-62):**
   ```javascript
   } catch (error) {
     console.error(`[DB] Failed to connect to MongoDB: ${error.message}`);
     console.warn('[DB] Falling back to in-memory mode.');
     dbState.isConnected = true;
     dbState.provider = 'in-memory-fallback';
   }
   ```
   - When initial connection fails (e.g. cold start, missing URI), `dbState.isConnected` is incorrectly set to `true`.
   - Mongoose remains disconnected (`readyState = 0`). Mongoose's default `bufferCommands: true` causes all queries (`User.findOne`, `Document.find`) to hang for 10,000ms until throwing: `MongooseError: Operation ... buffering timed out after 10000ms`.
   - There is no retry loop with exponential backoff (1s/2s/4s) in `config/db.js`.

2. **Hardcoded `/api/health` Endpoint in `controllers/documentController.js` (lines 112-114):**
   ```javascript
   export const getHealth = (req, res) => {
     res.json({ status: 'operational', timestamp: new Date() });
   };
   ```
   - Returns `{ status: 'operational' }` unconditionally without checking `mongoose.connection.readyState` or database connectivity.

3. **Legacy Custom JWT Auth in `models/User.js`, `controllers/authController.js`, and `middlewares/authMiddleware.js`:**
   - `models/User.js` (lines 12-17, 25-33): Defines `password` with bcrypt hashing and `comparePassword`.
   - `controllers/authController.js` (lines 4-9, 12-42, 44-66): Uses `jwt.sign` with local secret `JWT_SECRET` and performs password verification.
   - `middlewares/authMiddleware.js` (lines 13-17): Uses `jwt.verify` against local secret and queries `User.findById(decoded.id)`.
   - No Firebase Auth integration exists anywhere in the backend.

4. **Document Model Schema Constraints in `models/Document.js` (lines 5-10):**
   ```javascript
   userId: {
     type: mongoose.Schema.Types.ObjectId,
     ref: 'User',
     required: true,
     index: true,
   },
   ```
   - `userId` is strictly typed as `mongoose.Schema.Types.ObjectId`. Firebase UIDs are alphanumeric strings, which causes `CastError` if a string UID is supplied without schema modification.

5. **Strict Helmet Content Security Policy (CSP) in `config/security.js` (lines 26-32):**
   ```javascript
   directives: {
     defaultSrc: ["'self'"],
     scriptSrc: ["'self'"],
     styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
     fontSrc: ["'self'", 'https://fonts.gstatic.com'],
     imgSrc: ["'self'", 'data:', 'blob:'],
     connectSrc: ["'self'"],
   }
   ```
   - Blocks all connections to Google (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `accounts.google.com`) and GitHub auth endpoints, breaking Firebase popup sign-in in production.

6. **Missing Dependencies in `package.json` and `client/package.json`:**
   - `package.json`: Contains `bcryptjs`, `jsonwebtoken`, `mongoose`, but lacks `firebase-admin`.
   - `client/package.json`: Contains `react`, `axios`, `lucide-react`, `pdf-lib`, `qrcode`, but lacks `firebase`.

7. **Environment Variable Configuration in `.env.example` and `render.yaml`:**
   - `.env.example`: Missing Firebase configuration keys (`FIREBASE_PROJECT_ID`, `VITE_FIREBASE_*`).
   - `render.yaml`: Lists `JWT_SECRET` (obsolete) and lacks Firebase environment variables.

---

## 2. Logic Chain

1. From **Observation 1**, when MongoDB Atlas is warming up from a cold start or unreachable, Mongoose enters buffer mode. Because `config/db.js` lacks exponential backoff retries and lacks fast-fail checks, user queries hang for 10 seconds and crash with a 500 error.
   - *Inference:* Implementing a 3-attempt exponential backoff retry loop (1s, 2s, 4s) in `config/db.js` plus a `requireDB` fast-failing middleware (returning immediate 503) will eliminate 10s hangs and allow graceful cold-start recovery.

2. From **Observation 2**, `/api/health` currently provides deceptive telemetry.
   - *Inference:* `/api/health` must inspect `mongoose.connection.readyState`, perform a live ping with latency measurement, and report real database, memory, and service status (returning 200 when healthy, 503 when degraded).

3. From **Observation 3**, custom JWT authentication is broken and does not support Google/GitHub popup login or frictionless signup.
   - *Inference:* Replace legacy JWT with Firebase Auth. Frontend uses Firebase Client SDK (`signInWithPopup` for Google/GitHub, `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`). Backend uses `firebase-admin` (or Google public certificate verification) to verify incoming Bearer ID tokens on protected routes (`/api/documents/anchor`, `/api/documents`, `/api/auth/me`).

4. From **Observation 4**, `Document.userId` requires a string Firebase UID rather than an `ObjectId`.
   - *Inference:* Modify `models/Document.js` to define `userId: { type: String, required: true, index: true }` and update `models/User.js` to key records by `firebaseUid: { type: String, unique: true, index: true }`, removing password/bcrypt fields.

5. From **Observation 5**, Helmet CSP in production blocks OAuth popups and Firebase endpoints.
   - *Inference:* Update `config/security.js` CSP directives (`connectSrc`, `scriptSrc`, `frameSrc`, `imgSrc`) to whitelist `*.googleapis.com`, `*.firebaseio.com`, `*.firebaseapp.com`, `accounts.google.com`, and GitHub avatar CDNs.

6. From **Observations 6 & 7**, `firebase-admin` (backend) and `firebase` (frontend) must be installed, and `.env.example` / `render.yaml` updated with all required keys.

---

## 3. Caveats

1. **Firebase Project Setup in Firebase Console:**
   - The application code can be completely wired with fallback mocks and client SDK initialization, but the user/developer must enable Google & GitHub sign-in providers and Email/Password in the Firebase Console and configure the exact Firebase Web App keys in `.env` / Render environment.
2. **MongoDB Connection String Format:**
   - The MongoDB Atlas connection string contains special characters in passwords which require URL encoding (e.g. `@` as `%40`). The URI provided in `ORIGINAL_REQUEST.md` has `MONGO%40Aloof26` correctly encoded.
3. **Local Terminal Execution Limits:**
   - Subagent environment timed out on interactive terminal permission; all conclusions and specifications are strictly verified via static analysis, code examination, and schema validation.

---

## 4. Conclusion

The backend and database reliability requirements (R2 & R3) have been fully surveyed, diagnosed, and architected.

The required deliverables for builders are:
1. **R3 (DB Reliability):** Implement `config/db.js` with exponential backoff retries (1s/2s/4s), `dbGuard` fast-failing middleware (503 Service Unavailable), and telemetry-driven `/api/health`.
2. **R2 (Firebase Auth & ID Token Verification):** Install `firebase-admin` (root) and `firebase` (client). Create `config/firebase.js`. Refactor `models/User.js` and `models/Document.js` to use `firebaseUid`. Update `middlewares/authMiddleware.js`, `controllers/authController.js`, and `routes/authRoutes.js`.
3. **Security Hardening:** Update `config/security.js` CSP directives to permit Firebase and Google/GitHub OAuth domains.
4. **Environment & Deployment:** Update `.env.example` and `render.yaml` with all required Firebase and MongoDB variables.

The full design and code specifications are detailed in `.agents/explorer_survey_2/survey_backend.md`.

---

## 5. Verification Method

1. **Syntax & Static Lint Verification:**
   - Inspect all modified backend files (`config/db.js`, `config/firebase.js`, `config/security.js`, `models/User.js`, `models/Document.js`, `middlewares/authMiddleware.js`, `controllers/authController.js`, `controllers/documentController.js`, `routes/authRoutes.js`, `routes/documentRoutes.js`).
2. **Database Resilience Verification:**
   - Test `/api/health` when `MONGODB_URI` is unset or invalid: verify response status `503` with `{ "status": "degraded", "database": { "status": "disconnected" } }`.
   - Verify server starts and serves HTTP requests even without active DB.
   - Test `/api/health` when MongoDB Atlas is connected: verify response status `200` with `{ "status": "healthy", "database": { "status": "connected" } }`.
3. **Authentication Verification:**
   - Verify unauthenticated calls to `POST /api/documents/anchor` return `401 Unauthorized`.
   - Verify valid Firebase Bearer token allows document anchoring and auto-provisions `User` record in MongoDB keyed by `firebaseUid`.
   - Verify public endpoints (`POST /api/documents/verify`, `GET /api/health`, `GET /api/documents/:id`) remain accessible without tokens.
4. **Build & Startup Verification:**
   - `npm install` and `node server.js` executes without startup crashes.
