# FileGuard — Comprehensive Core Workflows, E2E Integration & Build Investigation Report

**Investigator**: Explorer 3 (Core Workflows, E2E Integration & Build Investigator)  
**Date**: 2026-08-23  
**Project**: FileGuard Document Integrity Platform  
**Target Directory**: `C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai`

---

## 1. Executive Summary

FileGuard is a cryptographic document verification web application built on the MERN stack (Node.js/Express backend, React 19/Vite/Tailwind v4 frontend, MongoDB database, OriginStamp ledger integration).

The core value proposition is **Zero-Knowledge Privacy**: document files are hashed locally in the user's browser using the native Web Crypto API (`crypto.subtle.digest('SHA-256')`). Raw file contents never leave the user's computer; only the 64-character SHA-256 hexadecimal digest, filename, file size, and issuer organization metadata are sent to the backend for anchoring.

This investigation provides a rigorous, line-by-line audit of all end-to-end workflows, client-server data contracts, PDF certificate generation, QR code redirection, pagination, security headers (CSP/CORS), build scripts, deployment configs (`render.yaml`), and outlines a 4-tier testing blueprint.

---

## 2. End-to-End Workflow Audits

### 2.1 Client-Side WebCrypto SHA-256 Hashing
- **Source File**: `client/src/lib/api.js` (lines 21–27)
- **Implementation**:
  ```javascript
  export async function calculateHashLocally(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  ```
- **Strengths**:
  - Leverages standard browser `window.crypto.subtle.digest`, requiring zero external crypto libraries on the client.
  - Zero-Knowledge guarantee: no multipart form data or file buffers are transmitted over HTTP.
- **Observations & Edge Cases**:
  - `file.arrayBuffer()` reads the entire file into browser memory at once. For standard business and legal documents (<100MB), this is instantaneous. For multi-gigabyte files, reading the entire buffer can lead to tab memory pressure.
  - Hashing is properly awaited before initiating the network request.
  - Output is strictly 64 lowercase hexadecimal characters.

---

### 2.2 Document Anchoring API Flow
- **Components Involved**:
  - Frontend: `client/src/components/DropZone.jsx` → `client/src/lib/api.js:uploadFile`
  - Network Route: `POST /api/documents/anchor`
  - Middleware: `uploadLimiter` (10 req / 15 min), `protect` (`middlewares/authMiddleware.js`)
  - Controller: `controllers/documentController.js:anchorDocument`
  - Service: `services/originStamp.js:submitHash`
  - Database: `models/Document.js`
- **Detailed Trace**:
  1. User drops a file onto `DropZone.jsx`. If user is unauthenticated, `AuthModal` is triggered.
  2. `uploadFile(file, onProgress)` calls `calculateHashLocally(file)` (UI indicates `hashing`).
  3. `uploadFile` executes `POST /api/documents/anchor` with payload:
     `{ hash: string, fileName: string, fileSizeBytes: number }` (UI indicates `anchoring`).
  4. Backend `protect` middleware validates the Authorization header.
  5. `anchorDocument` performs deduplication check:
     `Document.findOne({ originalHash: hash.toLowerCase() })`.
     - If existing, returns HTTP 200 with `{ duplicate: true, document: existing }`.
  6. If new, invokes `submitHash(hash, fileName)` in `services/originStamp.js`:
     - If `ORIGINSTAMP_API_KEY` is present, sends POST to `https://api.originstamp.com/v4/timestamp/create`.
     - Otherwise, generates a deterministic simulated transaction ID (`0x` + SHA-256).
  7. Inserts record into MongoDB with fields: `userId`, `issuerName`, `fileName`, `originalHash`, `fileSizeBytes`, `status`, `originStampTxId`, `originStampTimestamp`.
  8. Returns HTTP 201 with `{ message: 'Document anchored successfully', document: doc }`.
  9. Frontend transitions `DropZone` state to `'success'`, rendering `HashResult.jsx`.

---

### 2.3 Document Verification Flow (By File & By Hash)
- **Components Involved**:
  - Frontend: `client/src/components/VerifySection.jsx` → `client/src/lib/api.js:verifyByFile` / `verifyByHash`
  - Network Route: `POST /api/documents/verify` (Public route, rate-limited by `apiLimiter` 100 req / 15 min)
  - Controller: `controllers/documentController.js:verifyDocument`
  - Model: `models/Document.js`
- **Detailed Trace**:
  1. **Verification by File**: User drops document onto Verify dropzone. `verifyByFile` calculates hash in browser and forwards the 64-char hash string to `/api/documents/verify`.
  2. **Verification by Hash**: User enters 64-character SHA-256 hash. Input is validated against `/^[a-f0-9]{64}$/i` and sent to `/api/documents/verify`.
  3. Backend executes `Document.findOne({ originalHash: hash.toLowerCase() })`.
     - If not found: Returns HTTP 404 with `{ verified: false, status: 'unknown', message: 'No cryptographic record found for this document.' }`.
     - If found: Increments `doc.verificationCount`, records `doc.lastVerifiedAt = new Date()`, persists to MongoDB, and returns HTTP 200 with `{ verified: true, status: doc.status, document: ... }`.
  4. Frontend displays verification badge (Emerald shield for authentic, Rose/Red shield for failure/unknown) with complete audit trail and action buttons ("Download PDF Certificate", "Share Proof Link", "Verify Another").

---

### 2.4 PDF Certificate Generation & Embedded QR Code
- **Source File**: `client/src/lib/certificateGenerator.js`
- **Dependencies**: `pdf-lib` (v1.17.1), `qrcode` (v1.5.4)
- **Detailed Trace**:
  1. Invoked via `generateCertificatePDF(documentData)` from `HashResult.jsx` or `VerifySection.jsx`.
  2. Creates standard A4 page (`[595.28, 841.89]` pt) with `pdf-lib`.
  3. Constructs verification URL:
     `const verifyUrl = `${window.location.origin}/verify?hash=${documentData.originalHash}`;`
  4. Generates QR Code PNG DataURL via `QRCode.toDataURL(verifyUrl, { margin: 1, width: 140, color: { dark: '#0a0e1a', light: '#ffffff' } })`.
  5. Embeds PNG into PDF via `pdfDoc.embedPng(qrDataUrl)`.
  6. Renders:
     - Header banner with "FILEGUARD TRUST PROTOCOL" and "Certificate of Cryptographic Authenticity"
     - Issuer organization name
     - Document filename
     - 64-char SHA-256 fingerprint in Courier monospace
     - Anchoring timestamp (UTC)
     - OriginStamp ledger transaction ID
     - Audit & integrity status
     - Embedded QR Code image (140x140 pt) with clear verification instructions
     - Legal compliance footer
  7. Converts PDF to Blob and triggers automatic browser download: `FileGuard-Certificate-<fileName>.pdf`.

---

### 2.5 QR Code Verification Redirect Flow (`/verify?hash=xxx`)
- **Source File**: `client/src/components/VerifySection.jsx` (lines 31–39)
- **Trace**:
  1. Anyone scanning the QR code on a mobile device or opening the shared URL visits `https://<domain>/verify?hash=<64-char-hash>`.
  2. React Router mounts `VerifySection.jsx`.
  3. `useEffect` watches `[searchParams]`:
     ```javascript
     const hashParam = searchParams.get('hash');
     if (hashParam && /^[a-f0-9]{64}$/i.test(hashParam.trim())) {
       setHashInput(hashParam.trim());
       setTab('hash');
       executeHashVerification(hashParam.trim());
     }
     ```
  4. Automatically issues `POST /api/documents/verify` and displays instant verification results without requiring any user click or registration.

---

### 2.6 My Documents List with Pagination
- **Source Files**: `client/src/components/DocumentList.jsx`, `controllers/documentController.js:getDocuments`
- **Trace**:
  - Accessible at `/documents`. Requires user authentication.
  - Displays table of all records anchored by the logged-in issuer.
  - Client provides search filtering across file names and SHA-256 hashes.
  - **Identified Defect in Backend Controller**:
    `controllers/documentController.js:getDocuments` currently hardcodes:
    ```javascript
    const docs = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({
      documents: docs,
      pagination: { total: docs.length, page: 1, pages: 1 },
    });
    ```
    It ignores `req.query.page` and `req.query.limit`, does not use `.skip((page - 1) * limit)`, and does not query `Document.countDocuments({ userId: req.user._id })`. This must be implemented to support scalable pagination as required by R5.

---

### 2.7 Clean Sign-Out & Auth State Lifecycle
- **Source Files**: `client/src/components/Navbar.jsx`, `client/src/lib/api.js`
- **Current Flow**:
  - `logoutUser()` removes `fg_token` and `fg_user` from `localStorage`.
  - `Navbar.jsx` resets local user state and reloads the window.
- **Firebase Auth Migration Requirement (R2 & R5)**:
  - Must call `signOut(auth)` from Firebase Auth client SDK.
  - Clear any cached tokens/profile state.
  - Unauthenticated users must smoothly navigate public routes (`/`, `/verify`) while protected actions cleanly open the Auth Modal.

---

## 3. Build, Packaging & Deployment Configuration Analysis

### 3.1 Root `package.json`
- **Scripts**:
  - `"start": "node server.js"` — Production server entry.
  - `"dev": "node --watch server.js"` — Development server with Node built-in file watcher.
  - `"build:client": "cd client && npm install && npm run build"` — Installs client deps and builds Vite bundle.
  - `"postinstall": "cd client && npm install"` — Ensures client dependencies are installed during root install.
- **Dependencies**:
  - `express`, `mongoose`, `cors`, `helmet`, `morgan`, `dotenv`, `express-rate-limit`, `multer`, `bcryptjs`, `jsonwebtoken`.
  - **Firebase Integration Note**: Backend requires `firebase-admin` or token verification logic to authenticate Firebase ID tokens on protected routes.

### 3.2 Client `package.json` & Vite Build
- **Dependencies**: `@tailwindcss/vite`, `@vitejs/plugin-react`, `axios`, `lucide-react`, `pdf-lib`, `qrcode`, `react` (v19.0.0), `react-dom` (v19.0.0), `react-router-dom` (v7.1.1), `tailwindcss` (v4.1.8), `vite` (v6.3.5).
- **Vite Config** (`client/vite.config.js`):
  - Uses `@tailwindcss/vite` and `@vitejs/plugin-react`.
  - Configures development proxy `/api` → `http://localhost:5000`.
- **Verified Build Status**:
  - Successfully executed `npm run build:client`.
  - Output generated into `client/dist/` (`dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`).
  - Bundle size: ~794 kB minified (includes `pdf-lib`, `qrcode`, and React 19).

### 3.3 Static File Serving in `server.js`
- Lines 86–94:
  ```javascript
  if (NODE_ENV === 'production') {
    const clientBuild = path.join(__dirname, 'client', 'dist');
    app.use(express.static(clientBuild));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'));
    });
  }
  ```
- **Observations**:
  - Correctly mounted after all `/api` routes, ensuring API endpoints take precedence.
  - The catch-all `app.get('*')` enables React Router client-side routing in production.

### 3.4 Deployment Configuration (`render.yaml`)
- Current configuration:
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
        - key: JWT_SECRET
          sync: false
  ```
- **Required Updates for Production**:
  - Remove deprecated `JWT_SECRET` once Firebase Auth replaces custom JWT.
  - Document all required environment variables in `.env.example` (both backend and Vite frontend vars).

---

## 4. Discovered Critical Issues, Gaps & Edge Cases

| ID | Category | Component | Observation / Issue | Impact | Recommended Solution |
|---|---|---|---|---|---|
| **ISS-01** | Database | `config/db.js` | Catch block sets `dbState.isConnected = true` and `provider = 'in-memory-fallback'`, but Mongoose has no in-memory driver. Queries hang for 10s and throw buffer timeout errors. | Fatal when MongoDB cold-starts on Render. | Implement retry logic with exponential backoff (3 retries, 1s/2s/4s) and safe error handling (R3). |
| **ISS-02** | Security | `config/security.js` | Helmet CSP `connectSrc` is only `["'self'"]`. Firebase Auth client SDK requires connections to Google/Firebase APIs (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `accounts.google.com`, etc.). | Firebase popup & token refresh will fail under production CSP. | Expand CSP `connectSrc`, `frameSrc`, and `scriptSrc` to allow Firebase domains in production. |
| **ISS-03** | API / Database | `controllers/documentController.js` | `getDocuments` hardcodes `limit(50)` and returns `page: 1, pages: 1, total: docs.length`. Ignores query params `?page=X&limit=Y`. | Pagination controls in "My Documents" break when documents exceed limit. | Implement `skip((page-1)*limit).limit(limit)` and `countDocuments({ userId })`. |
| **ISS-04** | Health Check | `controllers/documentController.js` | `getHealth` returns static `{ status: 'operational' }` without checking `mongoose.connection.readyState`. | False positive health reporting when DB is down. | Inspect `mongoose.connection.readyState` (1 = connected) and return true connectivity status. |
| **ISS-05** | Auth / Schema | `models/Document.js` & `User.js` | `Document.userId` is typed as `mongoose.Schema.Types.ObjectId`. With Firebase Auth, UID is a string. | Mongoose `CastError` if Firebase string UID is assigned to `ObjectId` field. | Change `Document.userId` type to `String` (indexed) or associate via User model with `firebaseUid`. |
| **ISS-06** | Test Script | `test-api.mjs` | Outdated API endpoints: calls `/api/documents/upload` instead of `/api/documents/anchor`, and `/api/documents/verify/hash` instead of `/api/documents/verify`. | Test script fails when run. | Modernize test suite with comprehensive automated testing script covering anchor, verify, health, and pagination. |
| **ISS-07** | SEO / HTML | `client/index.html` | Missing SEO meta tags (`description`, Open Graph, Twitter cards, JSON-LD, robots/sitemap references). | Site is not discoverable on search engines (R4). | Add complete meta tags, Open Graph tags, JSON-LD `WebApplication` schema, `robots.txt`, and `sitemap.xml`. |
| **ISS-08** | PDF Generator | `certificateGenerator.js` | Non-ASCII/Unicode characters in filename can cause `pdf-lib` standard Helvetica font to fail if not sanitized. | PDF download crash on special characters. | Sanitize filename strings to printable ASCII or fallback cleanly. |

---

## 5. Four-Tier Testing Strategy Plan

### Tier 1: Local Unit Tests (Crypto & Utilities)
- Verify `crypto.subtle.digest('SHA-256')` against standard test vectors:
  - Empty input (`""`): `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
  - Known test string: `hashString("FileGuard")`
- Verify constant-time comparison in `services/hashService.js:compareHashes`:
  - Identical hashes → `{ match: true, method: 'constant-time (timingSafeEqual)' }`
  - Mismatched length / invalid hex → `{ match: false }`
- Verify `services/originStamp.js:generateDeterministicTxId` produces stable, predictable `0x...` digests.

### Tier 2: API & Integration Tests
- **Health Check (`GET /api/health`)**:
  - Verify returns HTTP 200 with `{ status: 'operational', database: 'connected' }` when MongoDB is up.
  - Verify returns HTTP 503 or degraded status when MongoDB is down.
- **Public Verification (`POST /api/documents/verify`)**:
  - Test valid existing hash → returns HTTP 200, `verified: true`, document details.
  - Test non-existent hash → returns HTTP 404, `verified: false`.
  - Test invalid hash string (e.g. `"1234"`, non-hex) → returns HTTP 400 validation error.
- **Protected Anchoring (`POST /api/documents/anchor`)**:
  - Without auth header → returns HTTP 401 Unauthorized.
  - With valid auth header → anchors document, returns HTTP 201.
  - Re-anchoring duplicate hash → returns HTTP 200 with `duplicate: true`.
- **Pagination (`GET /api/documents?page=1&limit=5`)**:
  - Verify query returns correct slice of user's records with accurate `total`, `page`, and `pages`.

### Tier 3: End-to-End Workflow Validation
- **Upload & Anchor Flow**: User signs in → selects file → browser computes SHA-256 → anchors to DB → receives success card with copyable hash.
- **PDF Certificate & QR Verification Flow**: Click "Download Certificate" → PDF generated with embedded QR → scan/visit `/verify?hash=<hash>` → auto-verifies and renders authentic record.
- **Sign-Out Isolation**: Click "Sign Out" → auth session cleared → user cannot access `/documents` or anchor without signing in.

### Tier 4: Build, Production Serving & Security Validation
- Run `npm run build:client` → builds with 0 errors.
- Run `NODE_ENV=production node server.js` → serves API and client static bundle from `client/dist`.
- Verify SPA fallback: navigating directly to `/upload`, `/verify`, `/documents` serves `index.html`.
- Verify security headers (Helmet, CSP, HSTS, CORS) present in production response headers.

---

## 6. Implementation Guidance & Handoff Recommendations

1. **Database & Resilience**: Update `config/db.js` with exponential backoff and export reliable health check query for `/api/health`.
2. **Backend Auth**: Update `middlewares/authMiddleware.js` to verify Firebase ID tokens, mapping `req.user` to `{ uid, email, issuerName }`.
3. **Document Controller & Models**: Update `models/Document.js` to support string `userId` (Firebase UID). Fix pagination in `controllers/documentController.js:getDocuments`.
4. **Security & CSP**: Update `config/security.js` to whitelist Firebase Auth domains in Helmet CSP.
5. **Frontend UI & SEO**: Implement the new minimalist dark UI (#09090b + amber-500 accent + Inter + JetBrains Mono) with the required `AnimatedBackground.jsx`, `robots.txt`, `sitemap.xml`, and SEO meta tags.
6. **Certificate Generator**: Update `certificateGenerator.js` colors to match the refined palette (amber/slate/charcoal) and sanitize document names.
