# Handoff Report — Explorer 3: Core Workflows, E2E Integration & Build Investigation

**Agent**: Explorer 3 (Core Workflows, E2E Integration & Build Investigator)  
**Date**: 2026-08-23  
**Working Directory**: `C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai\.agents\explorer_survey_3`  
**Project Root**: `C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai`  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

### Observation 1: Client-Side WebCrypto SHA-256 Hashing
- **File**: `client/src/lib/api.js` (lines 21–27)
- **Code**:
  ```javascript
  export async function calculateHashLocally(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  ```
- **Finding**: Hashing happens purely in browser using standard Web Crypto API. Raw files are never sent over HTTP; only `{ hash, fileName, fileSizeBytes }` are transmitted.

### Observation 2: Document Anchoring & Deduplication Flow
- **File**: `controllers/documentController.js` (lines 4–42)
- **Code**:
  ```javascript
  const existing = await Document.findOne({ originalHash: hash.toLowerCase() });
  if (existing) {
    return res.status(200).json({
      message: 'Document already anchored in registry',
      duplicate: true,
      document: existing,
    });
  }
  ```
- **Finding**: Anchoring checks for duplicates by lowercase hash. If existing, returns HTTP 200 with `duplicate: true`. If new, calls `services/originStamp.js:submitHash` and creates a document record.

### Observation 3: Document Verification & Audit Counter
- **File**: `controllers/documentController.js` (lines 44–85)
- **Code**:
  ```javascript
  const doc = await Document.findOne({ originalHash: hash.toLowerCase() });
  if (!doc) {
    return res.status(404).json({
      verified: false,
      status: 'unknown',
      message: 'No cryptographic record found for this document.',
    });
  }
  doc.verificationCount = (doc.verificationCount || 0) + 1;
  doc.lastVerifiedAt = new Date();
  await doc.save();
  ```
- **Finding**: Public endpoint increments audit counter (`verificationCount`) and updates `lastVerifiedAt` timestamp on successful match.

### Observation 4: PDF Certificate Generation & QR Code Embedding
- **File**: `client/src/lib/certificateGenerator.js` (lines 162–179)
- **Code**:
  ```javascript
  const verifyUrl = `${window.location.origin}/verify?hash=${documentData.originalHash}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 140,
    color: { dark: '#0a0e1a', light: '#ffffff' },
  });
  const qrImage = await pdfDoc.embedPng(qrDataUrl);
  page.drawImage(qrImage, { x: 70, y: qrSectionY - 160, width: 140, height: 140 });
  ```
- **Finding**: Generates valid A4 PDF with `pdf-lib` and embeds a 140x140 QR code PNG created by `qrcode` pointing directly to `/verify?hash=<hash>`.

### Observation 5: Auto-Verification via URL Query Parameter
- **File**: `client/src/components/VerifySection.jsx` (lines 31–39)
- **Code**:
  ```javascript
  useEffect(() => {
    const hashParam = searchParams.get('hash');
    if (hashParam && /^[a-f0-9]{64}$/i.test(hashParam.trim())) {
      setHashInput(hashParam.trim());
      setTab('hash');
      executeHashVerification(hashParam.trim());
    }
  }, [searchParams]);
  ```
- **Finding**: Visiting `/verify?hash=<hash>` automatically executes verification and displays results without requiring any click.

### Observation 6: Broken/Missing Pagination in `getDocuments`
- **File**: `controllers/documentController.js` (lines 87–100)
- **Code**:
  ```javascript
  export const getDocuments = async (req, res, next) => {
    try {
      const docs = await Document.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);
      res.json({
        documents: docs,
        pagination: { total: docs.length, page: 1, pages: 1 },
      });
    } catch (err) {
      next(err);
    }
  };
  ```
- **Finding**: Ignores `page` and `limit` query parameters, returns hardcoded `page: 1, pages: 1, total: docs.length`.

### Observation 7: In-Memory Fallback Illusion in `config/db.js`
- **File**: `config/db.js` (lines 57–62)
- **Code**:
  ```javascript
  } catch (error) {
    console.error(`[DB] Failed to connect to MongoDB: ${error.message}`);
    console.warn('[DB] Falling back to in-memory mode.');
    dbState.isConnected = true;
    dbState.provider = 'in-memory-fallback';
  }
  ```
- **Finding**: Setting `dbState.isConnected = true` in catch does not provide real in-memory database functionality in Mongoose. Subsequent queries buffer for 10s and throw `buffering timed out after 10000ms`.

### Observation 8: Content Security Policy (CSP) Constraint
- **File**: `config/security.js` (lines 24–33)
- **Code**:
  ```javascript
  connectSrc: ["'self'"],
  ```
- **Finding**: When Firebase Auth is introduced, `connectSrc` will block Firebase API calls (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `accounts.google.com`) in production.

### Observation 9: Build & Serving Configuration
- **File**: `package.json` (lines 10–11), `server.js` (lines 86–94)
- **Commands & Output**:
  - Executed `npm run build:client`: Exit code 0, 1885 modules transformed, generated `client/dist/index.html` (0.91 kB), `assets/index-*.css` (26.58 kB), `assets/index-*.js` (794.30 kB).
  - Production static serving in `server.js` correctly maps `/` to `client/dist` and uses SPA fallback `app.get('*', ...)` for client-side routing.

---

## 2. Logic Chain

1. **Step 1 (Zero-Knowledge Validation)**: From Observation 1 and Observation 2, `DropZone.jsx` calls `uploadFile`, which hashes the file via `crypto.subtle.digest` and posts only `{ hash, fileName, fileSizeBytes }`. The raw file buffer is never sent to the backend. Therefore, the zero-knowledge privacy requirement is cryptographically satisfied.
2. **Step 2 (Verification & QR Code Loop)**: From Observation 4 and Observation 5, `generateCertificatePDF` encodes `${window.location.origin}/verify?hash=${hash}` into a QR code. When scanned, `VerifySection.jsx` extracts `searchParams.get('hash')` and triggers `executeHashVerification`, completing a full closed-loop verification cycle.
3. **Step 3 (Pagination Gap)**: From Observation 6, `DocumentList.jsx` sends `page` and `limit` to `/api/documents`, but `documentController.js:getDocuments` ignores these parameters and hardcodes `{ total: docs.length, page: 1, pages: 1 }`. Therefore, pagination is broken for users with more than 50 records.
4. **Step 4 (Database Cold-Start Failure Mechanism)**: From Observation 7, when Render spins up and MongoDB is slow or unreachable, Mongoose enters a buffering state while `dbState` claims to be connected. This causes user requests to hang for 10,000ms before failing with unhandled 500 errors.
5. **Step 5 (Production Security & CSP Hazard)**: From Observation 8, Helmet's CSP policy in production restricts `connectSrc` to `'self'`. When Firebase Auth SDK tries to connect to `identitytoolkit.googleapis.com`, the browser will abort the connection due to CSP violation unless `config/security.js` is updated.
6. **Step 6 (Build & Deployment Viability)**: From Observation 9, the Vite frontend compiles cleanly with zero syntax/build errors, and `server.js` includes the standard static file serving and SPA catch-all middleware for production deployment on Render.

---

## 3. Caveats

- **Firebase Admin SDK Setup**: The exact Firebase Project ID and service account credentials depend on the user's Firebase configuration; token verification on Express can use `firebase-admin` or lightweight JWT verification (`jose` / Google public keys).
- **OriginStamp Free Tier Quota**: OriginStamp provides 50 free blockchain timestamps per month; when the quota is exceeded or no key is present, the service smoothly falls back to deterministic simulation (`mode: 'mock'`).
- **WebCrypto Memory Footprint for Multi-GB Files**: `file.arrayBuffer()` is optimal for standard files (<100MB). For multi-GB files, a 100MB UI size recommendation or chunked reader should be documented.

---

## 4. Conclusion

The core cryptographic workflows (client-side SHA-256 hashing, document anchoring, public verification, PDF certificate generation with embedded QR codes, and URL auto-verification) are fundamentally sound and well-architected.

However, production readiness requires resolving five specific items:
1. **Fix MongoDB connection retry logic** with exponential backoff (3 retries: 1s, 2s, 4s) in `config/db.js`, and connect `/api/health` to real `mongoose.connection.readyState`.
2. **Fix pagination in `documentController.js:getDocuments`** with proper `skip`, `limit`, and `countDocuments`.
3. **Update CSP in `config/security.js`** to whitelist Firebase/Google auth domains.
4. **Adapt `models/Document.js` and `models/User.js`** to support Firebase string UIDs.
5. **Add complete SEO assets** (`robots.txt`, `sitemap.xml`, meta tags, JSON-LD) and update `.env.example` and `render.yaml`.

---

## 5. Verification Method

To independently verify all findings:
1. **Frontend Compilation**:
   ```powershell
   npm run build:client
   ```
   *Expected result*: Exits 0 and generates `client/dist/`.
2. **Static Asset Verification**:
   Inspect `client/dist/index.html` to confirm production assets are generated.
3. **Database Connection & Health Check**:
   Start server: `node server.js`
   Fetch health: `curl http://localhost:5000/api/health`
   *Expected result*: Returns HTTP 200 with JSON payload.
4. **Inspect Key Source Files**:
   - `client/src/lib/api.js` (lines 21–27: WebCrypto SHA-256)
   - `controllers/documentController.js` (lines 44–85: verify, lines 87–100: getDocuments pagination)
   - `client/src/lib/certificateGenerator.js` (lines 162–179: QR embedding)
   - `config/security.js` (lines 24–33: CSP headers)
