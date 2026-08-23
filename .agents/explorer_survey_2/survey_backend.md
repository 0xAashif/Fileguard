# FileGuard AI — Backend, Auth & DB Reliability Survey Report

**Author:** Explorer 2 (Backend, Auth & DB Reliability Investigator)  
**Date:** 2026-08-23T02:15:30Z  
**Project:** FileGuard AI  
**Scope:** Backend Architecture, Firebase Authentication (R2), Database Connection Reliability & Health Telemetry (R3), Dependencies, Security & Environment Variables.

---

## 1. Executive Summary & Problem Diagnosis

FileGuard AI is an ES-Module Node.js/Express application designed for cryptographic document verification with client-side SHA-256 hashing and blockchain timestamping.

Investigation of the live and local codebase revealed two fatal architectural bottlenecks preventing production operation:

1. **The Mongoose Fake Fallback & Buffer Timeout Bug (`config/db.js:57-62`):**
   When MongoDB is not connected (or `MONGODB_URI` is missing on Render), `connectDB()` catches the connection error and executes:
   ```javascript
   dbState.isConnected = true;
   dbState.provider = 'in-memory-fallback';
   ```
   However, **Mongoose has no in-memory database engine**. Mongoose remains in `readyState = 0` (disconnected). Any incoming request attempting a query (`User.findOne`, `Document.find`) enters Mongoose's internal operation buffer and hangs for 10,000ms until throwing:
   `MongooseError: Operation users.findOne() buffering timed out after 10000ms`.
   Furthermore, there is **zero retry logic** with exponential backoff.

2. **Broken Legacy JWT Auth (`controllers/authController.js`, `models/User.js`):**
   The existing auth requires server-side bcrypt hashing and custom JWT issuance. Because it relies directly on synchronous user lookups in a broken DB, login and registration fail completely. Furthermore, it lacks social logins (Google, GitHub), creating high user friction.

3. **Content Security Policy (CSP) Restrictions (`config/security.js`):**
   The existing Helmet CSP blocks requests to Google and Firebase auth domains (`accounts.google.com`, `identitytoolkit.googleapis.com`, `github.com`), which will break Firebase popup auth in production unless properly configured.

---

## 2. Backend Codebase Inventory & Line-by-Line Analysis

| File Path | Current Role | Current Implementation & Issues | Required Changes for R2 / R3 |
|---|---|---|---|
| `server.js` | Express app entry point, middleware chain, static file serving, graceful shutdown. | Starts DB with `await connectDB()`. If DB is offline, startup blocks or falls back to broken state. Hardcoded console log. | Ensure server starts gracefully even if DB is offline. Expose `/api/health` with real DB status. Mount updated auth & document routes. |
| `config/db.js` | MongoDB connection manager. | No exponential backoff retries. Catch block sets fake `isConnected = true` and `in-memory-fallback` which causes 10s query hangs. | Implement 3-attempt exponential backoff (1s, 2s, 4s). Real `readyState` tracking. Background auto-reconnection daemon. Fast health check ping helper. |
| `config/security.js` | Helmet and CORS configuration. | CSP `connectSrc` only permits `'self'`. `scriptSrc`, `frameSrc`, `imgSrc` block Firebase SDK, Google OAuth, and GitHub avatars. | Whitelist Firebase and OAuth domains in CSP (`*.googleapis.com`, `*.firebaseio.com`, `*.firebaseapp.com`, `accounts.google.com`, `github.com`, avatar CDNs). |
| `config/firebase.js` *(NEW)* | Firebase Admin SDK initialization & token verifier. | Does not exist. | Create Firebase Admin initialization with `projectId` / service account or public cert JWT verification. Safe dev fallback. |
| `models/User.js` | User schema with bcrypt password hashing. | Stores `email`, `password` (bcrypt), `issuerName`. Uses Mongo `ObjectId` as primary identifier. | Remove bcrypt/password. Key by `firebaseUid` (`unique`, `index`). Add `photoURL`, `provider`. Store issuer organization profile data. |
| `models/Document.js` | Document registry schema. | `userId` is `mongoose.Schema.Types.ObjectId` referencing legacy User. | Change `userId` type to `String` (stores `firebaseUid`). Compound indexes for `{ originalHash: 1, status: 1 }` and `{ userId: 1, createdAt: -1 }`. |
| `middlewares/authMiddleware.js` | JWT verification middleware. | Uses `jwt.verify` with local secret. Queries `User.findById(decoded.id)`. | Extract Bearer token -> Verify Firebase ID token -> Upsert/fetch user in MongoDB by `firebaseUid` -> Attach `req.user` & `req.firebaseUid`. Resilient fallback if DB cold. |
| `middlewares/dbGuard.js` *(NEW)* | Fast-failing DB connectivity middleware. | Does not exist. Requests buffer 10s when DB is down. | Intercept DB-dependent requests when `mongoose.connection.readyState !== 1` and immediately return HTTP 503 with user-friendly retry message. |
| `middlewares/errorHandler.js` | Central error handling. | Handles Multer, Mongoose ValidationError, CastError. | Add handling for Firebase Auth errors (token expired, token revoked, invalid signature) and DB buffer errors. |
| `controllers/authController.js` | Custom registration, login, getMe. | `register`, `login` use bcrypt and custom JWT. Fails when DB down. | Replace with `syncUser` (POST `/api/auth/sync`), `getMe` (GET `/api/auth/me`), and `updateProfile` (PUT `/api/auth/profile`). |
| `controllers/documentController.js` | Document anchor, verify, list, get, health. | `anchorDocument` uses `req.user._id`. `getHealth` returns hardcoded `{ status: 'operational' }` without checking DB connection. `getDocuments` lacks robust pagination. | Refactor `anchorDocument` to use `req.user.firebaseUid` & `issuerName`. Refactor `getHealth` to return real MongoDB `readyState`, latency, memory, and service status. Implement paginated `getDocuments`. |
| `routes/authRoutes.js` | Auth endpoints router. | Defines `/register`, `/login`, `/me`. | Update to `/sync`, `/me`, `/profile`. Protect endpoints with new Firebase auth middleware. |
| `routes/documentRoutes.js` | Document & health endpoints router. | Defines `/health`, `/documents/verify`, `/documents/:id`, `/documents/anchor`, `/documents`. | Keep public vs protected distinction intact. Public: `/health`, `/documents/verify`, `/documents/:id`. Protected: `/documents/anchor`, `/documents`. |
| `services/originStamp.js` | Blockchain timestamping service. | Fully functional dual-mode (API key vs deterministic mock). | Retain as is. Fully operational. |
| `services/hashService.js` | Timing-safe SHA-256 hash comparison. | Uses `crypto.timingSafeEqual`. Fully operational. | Retain as is. |

---

## 3. Deep Root-Cause Analysis of Current Critical Issues

### 3.1. The Mongoose Buffer Timeout Flaw
```javascript
// config/db.js (lines 57-62)
} catch (error) {
  console.error(`[DB] Failed to connect to MongoDB: ${error.message}`);
  console.warn('[DB] Falling back to in-memory mode.');
  dbState.isConnected = true; // <--- FATAL: sets isConnected true when DB failed
  dbState.provider = 'in-memory-fallback';
}
```
**Consequence:**
Mongoose has `bufferCommands: true` by default. When the app attempts to execute `User.findOne(...)`, Mongoose pauses execution waiting for a connection that was never made. After exactly 10,000ms, Mongoose throws:
`MongooseError: Operation users.findOne() buffering timed out after 10000ms`.
The client receives a timeout 500 error after 10 seconds of freeze.

### 3.2. Broken Health Endpoint Masking Failure
```javascript
// controllers/documentController.js (lines 112-114)
export const getHealth = (req, res) => {
  res.json({ status: 'operational', timestamp: new Date() });
};
```
**Consequence:**
`/api/health` reports `status: 'operational'` even when MongoDB is offline, disconnected, or erroring out. Monitoring systems and deployment health checks get false positives.

### 3.3. Content Security Policy Blocking Firebase OAuth
```javascript
// config/security.js (lines 26-31)
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'"],
  },
}
```
**Consequence:**
In production mode, Helmet sets `Content-Security-Policy`. When the client attempts to use Firebase Authentication (`signInWithPopup`), the browser blocks connections to `https://identitytoolkit.googleapis.com`, `https://securetoken.googleapis.com`, and `https://*.firebaseapp.com`.

---

## 4. R2 Specification & Implementation Blueprint: Firebase Authentication

### 4.1. Auth Architecture
```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                                │
│                                                                        │
│  [Google / GitHub / Email-Password Auth] ──> Firebase Auth SDK         │
│                                                     │                  │
│                                           Obtains Firebase ID Token    │
│                                                     │                  │
│  API Request + Header [Authorization: Bearer <Firebase_ID_Token>]      │
└─────────────────────────────────────────────────────┼──────────────────┘
                                                      │
                                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS BACKEND                                │
│                                                                        │
│  1. `protect` Middleware                                               │
│     ├── Verifies Firebase ID Token (firebase-admin or Google Public Cert)│
│     ├── Decodes { uid, email, name, picture }                          │
│     └── Fast MongoDB Sync/Lookup (User keyed by `firebaseUid`)          │
│                                                                        │
│  2. `req.user` Attached                                                │
│     └── { _id, firebaseUid, email, issuerName }                        │
│                                                                        │
│  3. Protected Route Handler (Anchor / My Documents)                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.2. Backend Firebase Token Verification Engine (`config/firebase.js`)
Two-tier resilient verification strategy:
1. **Tier 1 (Primary - `firebase-admin`):**
   Initialize `firebase-admin` app. If `FIREBASE_SERVICE_ACCOUNT_KEY` or `FIREBASE_PROJECT_ID` is present:
   ```javascript
   import admin from 'firebase-admin';

   if (!admin.apps.length) {
     const projectId = process.env.FIREBASE_PROJECT_ID || 'fileguard-ai';
     admin.initializeApp({
       projectId,
     });
   }

   export async function verifyFirebaseIdToken(token) {
     try {
       const decoded = await admin.auth().verifyIdToken(token);
       return { valid: true, user: decoded };
     } catch (error) {
       return { valid: false, error: error.message, code: error.code };
     }
   }
   ```
2. **Tier 2 (Resilient Dev Fallback):**
   If running in development without Firebase credentials, allow decoding token structure or mock issuer for isolated local testing while logging a clear setup notice.

### 4.3. User & Issuer Model Update (`models/User.js`)
```javascript
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    issuerName: {
      type: String,
      required: true,
      trim: true,
      default: function () {
        return this.email ? this.email.split('@')[0] : 'Verified Issuer';
      },
    },
    photoURL: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['google.com', 'github.com', 'password', 'custom'],
      default: 'password',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export default mongoose.model('User', userSchema);
```

### 4.4. Document Schema Alignment (`models/Document.js`)
```javascript
// models/Document.js
userId: {
  type: String, // Stores firebaseUid
  required: true,
  index: true,
},
issuerName: {
  type: String,
  required: true,
  trim: true,
},
```

### 4.5. Auth Middleware (`middlewares/authMiddleware.js`)
```javascript
import { verifyFirebaseIdToken } from '../config/firebase.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please sign in.',
    });
  }

  try {
    const { valid, user: decoded, error } = await verifyFirebaseIdToken(token);
    if (!valid || !decoded) {
      return res.status(401).json({
        error: 'Invalid Token',
        message: error || 'Your session has expired. Please sign in again.',
      });
    }

    // Attach decoded Firebase identity
    req.firebaseUid = decoded.uid;

    // Fast user lookup / upsert in MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      let user = await User.findOne({ firebaseUid: decoded.uid });
      if (!user) {
        // Auto-provision user on first authenticated request
        const derivedIssuer =
          decoded.name ||
          (decoded.email ? decoded.email.split('@')[0] : 'Verified Issuer');

        user = await User.create({
          firebaseUid: decoded.uid,
          email: decoded.email || `${decoded.uid}@fileguard.local`,
          issuerName: derivedIssuer,
          photoURL: decoded.picture || '',
          provider: decoded.firebase?.sign_in_provider || 'custom',
        });
      }
      req.user = user;
    } else {
      // Degraded mode: Construct synthetic user from verified token payload
      req.user = {
        id: decoded.uid,
        firebaseUid: decoded.uid,
        email: decoded.email || '',
        issuerName: decoded.name || decoded.email || 'Verified Issuer',
      };
    }

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Authentication Failed',
      message: err.message,
    });
  }
};
```

---

## 5. R3 Specification & Implementation Blueprint: Database Connection Reliability

### 5.1. Resilient Mongoose Connection Manager (`config/db.js`)
```javascript
import mongoose from 'mongoose';

export const dbState = {
  isConnected: false,
  readyState: 0, // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  provider: 'none',
  retryAttempts: 0,
  lastError: null,
  lastConnectedAt: null,
  latencyMs: 0,
};

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s backoff

/**
 * Connect to MongoDB Atlas with Exponential Backoff
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[DB] ⚠️  No MONGODB_URI found in environment. Database running in offline mode.');
    dbState.isConnected = false;
    dbState.lastError = 'MONGODB_URI not configured';
    return false;
  }

  // Setup connection event telemetry
  mongoose.connection.on('connected', () => {
    dbState.isConnected = true;
    dbState.readyState = 1;
    dbState.provider = 'MongoDB Atlas';
    dbState.lastConnectedAt = new Date();
    dbState.lastError = null;
    console.log('[DB] ✅ MongoDB Atlas connected successfully.');
  });

  mongoose.connection.on('error', (err) => {
    dbState.isConnected = false;
    dbState.readyState = mongoose.connection.readyState;
    dbState.lastError = err.message;
    console.error('[DB] ❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    dbState.isConnected = false;
    dbState.readyState = 0;
    console.warn('[DB] ⚠️  MongoDB disconnected.');
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      dbState.readyState = 2; // connecting
      console.log(`[DB] Connecting to MongoDB (Attempt ${attempt}/${MAX_RETRIES})...`);
      
      const startTime = Date.now();
      await mongoose.connect(uri, {
        maxPoolSize: 50,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        w: 'majority',
      });

      dbState.latencyMs = Date.now() - startTime;
      dbState.isConnected = true;
      dbState.readyState = 1;
      dbState.retryAttempts = attempt;
      return true;
    } catch (err) {
      dbState.lastError = err.message;
      dbState.retryAttempts = attempt;
      console.error(`[DB] ❌ Connection attempt ${attempt} failed: ${err.message}`);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1];
        console.log(`[DB] ⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries exhausted, don't crash the server
  dbState.isConnected = false;
  dbState.readyState = 0;
  console.warn('[DB] ⚠️  Could not connect to MongoDB after 3 attempts. App starting in degraded mode.');
  return false;
}

export async function pingDB() {
  if (mongoose.connection.readyState !== 1) return { alive: false, latencyMs: 0 };
  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    return { alive: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { alive: false, latencyMs: Date.now() - start, error: err.message };
  }
}
```

### 5.2. Fast-Fail DB Guard Middleware (`middlewares/dbGuard.js`)
Prevents 10s Mongoose buffer timeouts on DB-dependent routes:
```javascript
import mongoose from 'mongoose';

export function requireDB(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database Unavailable',
      message: 'The database is temporarily reconnecting or warming up from a cold start. Please retry in a few moments.',
      code: 'DB_UNAVAILABLE',
      retryAfterSeconds: 3,
    });
  }
  next();
}
```

### 5.3. Real-Time Telemetry `/api/health` Endpoint
```javascript
// controllers/documentController.js or controllers/healthController.js
import mongoose from 'mongoose';
import { dbState, pingDB } from '../config/db.js';

export const getHealth = async (req, res) => {
  const dbPing = await pingDB();
  const memory = process.memoryUsage();

  const isHealthy = mongoose.connection.readyState === 1;

  const healthData = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: isHealthy ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
      provider: dbState.provider,
      latencyMs: dbPing.latencyMs,
      retries: dbState.retryAttempts,
      lastError: dbState.lastError,
    },
    services: {
      originStamp: process.env.ORIGINSTAMP_API_KEY ? 'live' : 'mock',
      firebaseAuth: process.env.FIREBASE_PROJECT_ID ? 'configured' : 'fallback-dev',
    },
    system: {
      heapUsedMB: +(memory.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: +(memory.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: +(memory.rss / 1024 / 1024).toFixed(2),
      nodeVersion: process.version,
    },
  };

  res.status(isHealthy ? 200 : 503).json(healthData);
};
```

---

## 6. Dependency & Environment Variable Specifications

### 6.1. Backend `package.json` Updates
- **Add**: `firebase-admin` (`^13.0.0` or `^12.0.0`)
- **Deprecate**: `bcryptjs` (can be uninstalled or left unreferenced)
- **Maintain**: `express`, `mongoose`, `dotenv`, `cors`, `helmet`, `morgan`, `express-rate-limit`, `multer`.

### 6.2. Frontend `client/package.json` Updates
- **Add**: `firebase` (`^11.0.0` or `^10.14.0`)
- **Maintain**: `react`, `react-dom`, `react-router-dom`, `axios`, `lucide-react`, `pdf-lib`, `qrcode`, `tailwindcss`, `vite`.

### 6.3. Comprehensive `.env.example` Specification
```env
# ═══════════════════════════════════════════════════════════════════
# FILEGUARD AI — ENVIRONMENT CONFIGURATION TEMPLATE
# ═══════════════════════════════════════════════════════════════════

# ─── 1. Server Configuration ───
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:5000

# ─── 2. MongoDB Atlas Database ───
# Connection string with retryWrites and majority write concern
# Format: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/fileguard?retryWrites=true&w=majority
MONGODB_URI=mongodb+srv://aashifkpp_db_user:MONGO%40Aloof26@cluster0.2rl0klb.mongodb.net/fileguard?retryWrites=true&w=majority

# ─── 3. Firebase Authentication (Backend Admin SDK) ───
# Firebase Project ID used for verifying incoming ID tokens
FIREBASE_PROJECT_ID=fileguard-ai
# Optional: Path or inline JSON for Service Account (if using privileged actions)
# FIREBASE_SERVICE_ACCOUNT_KEY=

# ─── 4. Firebase Authentication (Frontend Client SDK) ───
# Values obtained from Firebase Console -> Project Settings -> General -> Web Apps
VITE_FIREBASE_API_KEY=AIzaSyDummyKeyForDevelopment12345
VITE_FIREBASE_AUTH_DOMAIN=fileguard-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fileguard-ai
VITE_FIREBASE_STORAGE_BUCKET=fileguard-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ─── 5. OriginStamp Blockchain Timestamping ───
# Optional: Free tier at https://originstamp.com (leave empty for deterministic mock)
ORIGINSTAMP_API_KEY=
```

### 6.4. `render.yaml` Updates
```yaml
services:
  - type: web
    name: fileguard-ai
    env: node
    region: oregon
    plan: free
    buildCommand: npm install && npm run build:client
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: FIREBASE_PROJECT_ID
        sync: false
      - key: VITE_FIREBASE_API_KEY
        sync: false
      - key: VITE_FIREBASE_AUTH_DOMAIN
        sync: false
      - key: VITE_FIREBASE_PROJECT_ID
        sync: false
      - key: VITE_FIREBASE_STORAGE_BUCKET
        sync: false
      - key: VITE_FIREBASE_MESSAGING_SENDER_ID
        sync: false
      - key: VITE_FIREBASE_APP_ID
        sync: false
      - key: ORIGINSTAMP_API_KEY
        sync: false
```

---

## 7. Implementation Roadmap for Builders

1. **Step 1 — Install Dependencies**:
   - Root: `npm install firebase-admin`
   - Client: `cd client && npm install firebase`
2. **Step 2 — Implement Resilient Database Layer**:
   - Update `config/db.js` with exponential backoff (1s, 2s, 4s), event listeners, and ping helper.
   - Create `middlewares/dbGuard.js` to guard DB-dependent endpoints.
3. **Step 3 — Implement Backend Firebase Auth**:
   - Create `config/firebase.js` with `verifyFirebaseIdToken`.
   - Update `config/security.js` with Firebase and OAuth CSP whitelists.
   - Update `models/User.js` (keyed by `firebaseUid`, remove password) and `models/Document.js` (`userId` as String).
   - Update `middlewares/authMiddleware.js` to verify Firebase ID tokens and upsert user.
   - Update `controllers/authController.js` and `routes/authRoutes.js` (`/sync`, `/me`, `/profile`).
4. **Step 4 — Implement Health & Document Controllers**:
   - Refactor `documentController.js` with resilient `getHealth`, `anchorDocument`, `verifyDocument`, `getDocuments` (paginated).
5. **Step 5 — Frontend Firebase Auth Integration**:
   - Create `client/src/lib/firebase.js`.
   - Update `client/src/lib/api.js` (intercept token via `auth.currentUser.getIdToken()`, sync user profile).
   - Redesign `AuthModal.jsx` to support Google popup, GitHub popup, and Email/Password with organization name.
   - Update `Navbar.jsx`, `DocumentList.jsx`, `DropZone.jsx` for seamless auth state.
6. **Step 6 — Verification**:
   - Run health check on `/api/health`.
   - Verify DB retry behavior on simulated offline DB.
   - Verify token verification and document anchoring.
