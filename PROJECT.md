# Project: FileGuard Production Transformation

## Architecture
FileGuard is a zero-knowledge document integrity and cryptographic notarization platform built on the MERN stack with Firebase Authentication.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, client-side WebCrypto SHA-256 hashing, `pdf-lib` + `qrcode` certificate generation. Dark zinc-950 canvas with cursor-tracking spotlight and dot-grid background.
- **Backend**: Node.js, Express (ES Modules), MongoDB Atlas with Mongoose resilient retry logic, Firebase Admin ID token authentication, Helmet CSP security headers, and health telemetry.
- **Privacy Model**: Zero-Knowledge. Document bytes never leave the user's browser; only 64-char SHA-256 hex hashes and file metadata are anchored.

```
Browser Client (React 19 + Vite)
  ├── WebCrypto SHA-256 (Local hashing)
  ├── Firebase Client SDK (Google, GitHub, Email/Password)
  ├── PDF Certificate Generator (pdf-lib + qrcode)
  └── Minimalist UI (AnimatedBackground, Inter + JetBrains Mono)
         │
         │ HTTPS / JSON (Hash + Metadata + Bearer Token)
         ▼
Express API Backend (Node.js)
  ├── Helmet CSP & Rate Limiting (config/security.js)
  ├── Firebase Token Verification (middlewares/authMiddleware.js)
  ├── DB Resilience & Guard (config/db.js, 503 on disconnected DB)
  ├── Health Telemetry (/api/health)
  └── Document Registry Controller (controllers/documentController.js)
         │
         ▼
MongoDB Atlas (Resilient Connection with Exponential Backoff)
  ├── Users Collection (Keyed by firebaseUid)
  └── Documents Collection (Keyed by originalHash, indexed by userId)
```

## Code Layout
```
fileguard-ai/
├── client/
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── og-image.svg
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   └── site.webmanifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnimatedBackground.jsx
│   │   │   ├── AuthModal.jsx
│   │   │   ├── DocumentList.jsx
│   │   │   ├── DropZone.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── HashResult.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── VerifySection.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── usePageMeta.js
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   ├── certificateGenerator.js
│   │   │   └── firebase.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── config/
│   ├── db.js
│   ├── firebase.js
│   └── security.js
├── controllers/
│   ├── authController.js
│   └── documentController.js
├── middlewares/
│   ├── authMiddleware.js
│   └── errorMiddleware.js
├── models/
│   ├── Document.js
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   └── documentRoutes.js
├── services/
│   └── originStamp.js
├── tests/
│   └── e2e/
│       ├── harness.js
│       ├── test_runner.js
│       ├── tier1_features.test.js
│       ├── tier2_boundaries.test.js
│       ├── tier3_combinations.test.js
│       └── tier4_scenarios.test.js
├── .env.example
├── package.json
├── README.md
├── render.yaml
└── server.js
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DB Exponential Backoff Retry | 3 retries (1s, 2s, 4s) on MongoDB connect/reconnect | M1 | ORIGINAL_REQUEST §R3 |
| 2 | Graceful Startup & Fast Fail | App starts even if DB is cold; non-blocking; returns 503 instead of 10s buffer timeout | M1 | ORIGINAL_REQUEST §R3 |
| 3 | Real Health Endpoint | `/api/health` reports true database status, memory, and telemetry | M1 | ORIGINAL_REQUEST §R3 |
| 4 | Firebase ID Token Middleware | Express backend verifies Bearer Firebase ID token on protected routes | M1 | ORIGINAL_REQUEST §R2 |
| 5 | User Schema Refactor | User model keyed by `firebaseUid` with `organizationName` and profile info | M1 | ORIGINAL_REQUEST §R2 |
| 6 | Document Schema Refactor | Document model `userId` keyed by string Firebase UID with indexing | M1 | ORIGINAL_REQUEST §R2 |
| 7 | Document Pagination Fix | `/api/documents` properly handles `page`, `limit`, `skip`, and total count | M1 | ORIGINAL_REQUEST §R5 |
| 8 | Helmet CSP OAuth Configuration | Update CSP `connectSrc`, `scriptSrc`, `frameSrc` to permit Firebase and Google/GitHub OAuth | M1 | ORIGINAL_REQUEST §R2 |
| 9 | AnimatedBackground Exact Code | 47-line dot-grid + cursor spotlight with reduced motion and `aria-hidden` | M2 | ORIGINAL_REQUEST §R1 |
| 10 | Premium Minimalist Design Tokens | Dark zinc-950 solid canvas, gold/amber (#f59e0b) accent, Inter + JetBrains Mono, 0 backdrop-blur, 0 generic blue/slate | M2 | ORIGINAL_REQUEST §R1 |
| 11 | Firebase Client Auth SDK | Google popup, GitHub popup, Email/Password sign-in/up initialized from env | M2 | ORIGINAL_REQUEST §R2 |
| 12 | AuthModal Redesign | Luxury minimalist auth modal with Google, GitHub, and Email/Password tabs | M2 | ORIGINAL_REQUEST §R1, §R2 |
| 13 | Responsive Navbar & Clean Sign-Out | Responsive navbar with auth state, profile pill, and clean sign-out clearing state | M2 | ORIGINAL_REQUEST §R1, §R2 |
| 14 | Redesigned Hero Component | Linear/Stripe style typography, punchy headline, clean CTA buttons | M2 | ORIGINAL_REQUEST §R1 |
| 15 | Redesigned DropZone Component | Client-side WebCrypto SHA-256, hash progress, zero-knowledge guarantee | M2 | ORIGINAL_REQUEST §R1, §R5 |
| 16 | Redesigned HashResult Component | Monospace hash display (`font-mono`), copy hash, metadata, PDF download trigger | M2 | ORIGINAL_REQUEST §R1, §R5 |
| 17 | Redesigned VerifySection Component | Dual tab (file drop / hash input), auto-verification via URL query, audit counter | M2 | ORIGINAL_REQUEST §R1, §R5 |
| 18 | Redesigned DocumentList Component | Paginated table of user's anchored records with status pills and certificate downloads | M2 | ORIGINAL_REQUEST §R1, §R5 |
| 19 | Redesigned Footer Component | Minimalist footer with status indicator, links, copyright | M2 | ORIGINAL_REQUEST §R1 |
| 20 | Mobile Responsiveness | Flawless layouts at 375px, 768px, and 1280px+ viewports | M2 | ORIGINAL_REQUEST §R1 |
| 21 | PDF Certificate with Embedded QR | `pdf-lib` + `qrcode` generating tamper-proof certificate linking to `/verify?hash=xxx` | M2 | ORIGINAL_REQUEST §R5 |
| 22 | URL Auto-Verification Redirect | Visiting `/verify?hash=<hash>` immediately runs verification | M2 | ORIGINAL_REQUEST §R5 |
| 23 | Comprehensive Meta & Social Tags | `<title>`, `<meta description>`, OpenGraph, Twitter Cards in index.html | M3 | ORIGINAL_REQUEST §R4 |
| 24 | JSON-LD Structured Data | WebApplication schema in index.html | M3 | ORIGINAL_REQUEST §R4 |
| 25 | Crawl & Discoverability Assets | `robots.txt`, `sitemap.xml`, `favicon.svg`, `og-image.svg`, `site.webmanifest` | M3 | ORIGINAL_REQUEST §R4 |
| 26 | Dynamic Page Title Hook | `usePageMeta` hook for route-specific titles | M3 | ORIGINAL_REQUEST §R4 |
| 27 | Production README.md | Comprehensive documentation with architecture, setup, environment vars, and badges | M3 | ORIGINAL_REQUEST §R4 |
| 28 | Environment Documentation | Complete `.env.example` and updated `render.yaml` | M3 | ORIGINAL_REQUEST §R2, §R3 |
| 29 | Comprehensive E2E Test Suite | 4-Tier test suite testing features, boundaries, combinations, and scenarios | M4 | ORIGINAL_REQUEST §Acceptance Criteria |
| 30 | Build & Production Serving | `npm run build:client` and `node server.js` static frontend + API serving | M4 | ORIGINAL_REQUEST §Build & Deploy |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Reliability & Auth | DB exponential backoff, `/api/health`, Firebase Admin token verification, User/Document schemas, pagination fix, CSP configuration | none | PLANNED |
| M2 | Frontend Redesign & Auth | AnimatedBackground, minimalist styling overhaul (8 components), client Firebase SDK, AuthModal, WebCrypto hashing, PDF/QR generation | none | PLANNED |
| M3 | SEO & Metadata Infrastructure | Meta tags, OpenGraph, Twitter Cards, JSON-LD, robots.txt, sitemap.xml, usePageMeta, README.md, .env.example, render.yaml | none | PLANNED |
| M4 | E2E Testing Track & Final Hardening | Standalone automated 4-Tier test runner (Tiers 1-4), TEST_READY.md, 100% test pass, Tier 5 adversarial hardening | M1, M2, M3 | PLANNED |

## Interface Contracts
### Client ↔ Express Backend API
- **`GET /api/health`**:
  - Response: `{ status: 'healthy'|'degraded', database: { status: 'connected'|'disconnected', latencyMs: number }, timestamp: ISOString }`
- **`POST /api/documents/anchor`**:
  - Headers: `Authorization: Bearer <firebaseIdToken>`, `Content-Type: application/json`
  - Body: `{ hash: string (64-char hex), fileName: string, fileSizeBytes: number, customNote?: string }`
  - Response: `{ message: string, duplicate: boolean, document: DocumentObject }`
- **`POST /api/documents/verify`**:
  - Headers: `Content-Type: application/json`
  - Body: `{ hash: string (64-char hex) }`
  - Response: `{ verified: boolean, status: string, message: string, document?: DocumentObject }`
- **`GET /api/documents`**:
  - Headers: `Authorization: Bearer <firebaseIdToken>`
  - Query: `?page=1&limit=10`
  - Response: `{ documents: DocumentObject[], pagination: { total: number, page: number, pages: number, limit: number } }`
- **`GET /api/auth/me`**:
  - Headers: `Authorization: Bearer <firebaseIdToken>`
  - Response: `{ user: { firebaseUid: string, email: string, displayName: string, organizationName?: string } }`
- **`PUT /api/auth/profile`**:
  - Headers: `Authorization: Bearer <firebaseIdToken>`, `Content-Type: application/json`
  - Body: `{ organizationName: string, displayName?: string }`
  - Response: `{ user: UserObject }`

### Client Internal Contracts
- **`calculateHashLocally(file)`**: returns `Promise<string>` (64-char lowercase hex). Zero network calls.
- **`generateCertificatePDF({ documentData, issuerName, organizationName })`**: returns `Promise<Uint8Array>` (valid PDF document). Embeds QR code targeting `${window.location.origin}/verify?hash=${hash}`.
