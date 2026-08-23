# Original User Request

## 2026-08-23T02:11:03Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Transform FileGuard from a working prototype into a production-ready document integrity web service that real users can sign up for, authenticate, upload files for cryptographic verification, and receive tamper-proof PDF certificates. The site must be SEO-discoverable and have a world-class minimalist frontend comparable to Linear.app or Stripe.

Working directory: C:\Users\aasho\.gemini\antigravity\scratch\fileguard-ai\
Integrity mode: development

## Context

Existing MERN stack application:
- **Backend**: Node.js, Express (ES Modules), MongoDB Atlas, custom JWT auth (currently broken)
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React icons
- **Core Feature**: Client-side SHA-256 hashing via WebCrypto API (zero-knowledge — files never leave the browser)
- **Deployed at**: https://fileguard-final.onrender.com/ (Render free tier)
- **GitHub**: https://github.com/0xAashif/Fileguard

### Current Critical Issues
1. **MongoDB not connecting on Render** — `MONGODB_URI` environment variable is not set on Render, causing `'users.findOne()' buffering timed out after 10000ms` errors
2. **Auth completely broken** — custom JWT email/password auth fails because MongoDB is unreachable
3. **UI looks AI-generated** — generic dark theme with amber accents, no differentiation from thousands of AI-generated projects
4. **No SEO** — no meta tags, no sitemap, not discoverable on search engines
5. **No social login** — users must create email/password accounts (friction)

### MongoDB Connection String (to be set as MONGODB_URI on Render)
```
mongodb+srv://aashifkpp_db_user:MONGO%40Aloof26@cluster0.2rl0klb.mongodb.net/fileguard?retryWrites=true&w=majority
```

## Requirements

### R1. Frontend Redesign — Premium Minimalist Design
Completely redesign all frontend components (Hero, Navbar, DropZone, VerifySection, HashResult, AuthModal, DocumentList, Footer) with a premium, minimalist aesthetic built by a world-class frontend engineer. The design must NOT look AI-generated. 

Key design principles:
- Dark zinc-950 (#09090b) canvas with a subtle dot-grid + cursor-tracking spotlight background (component code provided below — use EXACTLY as given)
- Single restrained accent color — choose one that conveys "seal of authenticity" and trust (amber/gold recommended but agents may choose better)
- Clean Inter font for UI, JetBrains Mono for hashes/technical data
- No generic blue/purple gradients, no heavy glassmorphism/backdrop-blur, no bounce/elastic animations
- Generous whitespace, centered content, industrial/premium feel inspired by the reference mockup
- Mobile-responsive across phone (375px), tablet (768px), and desktop (1280px+)

**AnimatedBackground.jsx — USE THIS EXACT CODE:**
```jsx
import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const spotlightRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) return;

    function handleMouseMove(e) {
      const el = spotlightRef.current;
      if (!el) return;
      el.style.setProperty('--x', `${e.clientX}px`);
      el.style.setProperty('--y', `${e.clientY}px`);
    }

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden bg-zinc-950">
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />
      <div
        ref={spotlightRef}
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            'radial-gradient(600px circle at var(--x, 50%) var(--y, 40%), rgba(245, 158, 11, 0.15), transparent 80%)',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
}
```

### R2. Authentication with Firebase
Replace the current broken custom JWT auth system with Firebase Authentication. Support three sign-in methods:
1. **Google Sign-in** (one-click via popup)
2. **GitHub Sign-in** (one-click via popup)  
3. **Email/Password** (with registration)

Firebase config values are read from environment variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`).

The Express backend must verify Firebase ID tokens on all protected API routes (anchor document, list user's documents). Unprotected routes (verify by hash, verify by file, health check) remain public.

Update the User/issuer concept: when a user registers, their Firebase `displayName` or `email` serves as their issuer identity. Store issuer profile data (organization name) in MongoDB, keyed by Firebase UID.

### R3. Database Connection Reliability
Fix the MongoDB connection in `config/db.js` to handle Render's cold-start and free-tier spin-down gracefully:
- Add retry logic with exponential backoff (3 retries, 1s/2s/4s)
- Add clear, user-facing error messages when the database is temporarily unavailable (not raw Mongoose errors)
- The application must start and serve the frontend even if MongoDB is temporarily unreachable
- Add a `/api/health` endpoint that reports actual database connectivity status

### R4. SEO & Web Discoverability
Make FileGuard discoverable on Google search:
- Add descriptive `<title>`, `<meta name="description">`, Open Graph (`og:*`), and Twitter Card meta tags per route
- Add `robots.txt` that allows all crawlers
- Add `sitemap.xml` listing all public routes (/, /verify)
- Add JSON-LD structured data (WebApplication schema)
- Use semantic HTML throughout (proper headings, landmarks, alt text)
- Add a descriptive `README.md` with badges, screenshots, and setup instructions

### R5. End-to-End Working Product
The complete user flow must work without errors:
1. User visits homepage → sees premium landing page
2. User clicks "Sign In" → Firebase auth modal with Google/GitHub/Email options
3. User signs in → redirected to upload page
4. User drops file → SHA-256 hash computed in browser (zero-knowledge)
5. Hash anchored to MongoDB with user's issuer identity
6. User sees result card with hash, metadata, and action buttons
7. User downloads PDF Certificate of Authenticity with QR code
8. Anyone scans QR / visits /verify?hash=xxx → auto-verification works
9. Signed-in user views "My Documents" → paginated list of their anchored records
10. User signs out → auth state fully cleared

All existing features (client-side WebCrypto hashing, PDF certificate generation via pdf-lib, QR code generation, auto-verification portal) must be preserved and functional.

## Acceptance Criteria

### Design Quality
- [ ] AnimatedBackground (dot-grid + cursor spotlight) renders on all pages with `aria-hidden` and reduced-motion support
- [ ] Zero instances of `backdrop-blur`, generic `blue-500/600`, or `slate-800/900` in any component file
- [ ] All hash strings rendered in monospace font (JetBrains Mono / `font-mono`)
- [ ] All animations use `ease-out` or `ease-in-out` timing — no bounce/spring
- [ ] Layout is responsive at 375px, 768px, and 1280px viewport widths
- [ ] A senior frontend developer at a Y Combinator startup would NOT identify this as AI-generated

### Authentication
- [ ] Firebase SDK initialized with config from environment variables
- [ ] Google Sign-in popup works and creates/signs-in user
- [ ] GitHub Sign-in popup works and creates/signs-in user
- [ ] Email/password registration creates user with organization name
- [ ] Email/password sign-in works for existing users
- [ ] Backend middleware verifies Firebase ID token on protected routes
- [ ] Sign-out clears all auth state (localStorage, Firebase session)
- [ ] Unauthenticated users can still access Home and Verify pages

### Core Functionality
- [ ] Client-side SHA-256 hash computation works (file bytes never sent to server)
- [ ] Document anchoring saves record to MongoDB with correct userId and issuerName
- [ ] Document verification by file returns matching record
- [ ] Document verification by hash returns matching record
- [ ] PDF certificate downloads successfully with embedded QR code
- [ ] QR code URL resolves to /verify?hash=xxx and auto-verifies
- [ ] My Documents page lists only the signed-in user's records with pagination

### SEO & Infrastructure
- [ ] `robots.txt` accessible at root, allows all crawlers
- [ ] `sitemap.xml` accessible at root, lists public routes
- [ ] Every page has unique `<title>` and `<meta name="description">`
- [ ] OG image, title, description tags present for social sharing

### Build & Deploy
- [ ] `npm install && npm run build:client` succeeds with zero errors
- [ ] `NODE_ENV=production node server.js` serves the complete application (API + static frontend)
- [ ] `.env.example` documents ALL required environment variables with descriptions
- [ ] `render.yaml` accurately describes the deployment configuration

## Verification Resources
- Live deployment: https://fileguard-final.onrender.com/
- GitHub repo: https://github.com/0xAashif/Fileguard
- Run `npm run build:client` to verify frontend builds
- Run `node server.js` to verify backend starts and serves the app
- Test authentication flows manually (Google, GitHub, email)
- Test file upload + verification + PDF download flow manually
