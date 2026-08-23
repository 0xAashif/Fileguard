# FileGuard — Zero-Knowledge Trust Infrastructure

FileGuard is a cryptographic document registry and verification platform designed for universities, legal firms, and enterprises. It allows authorized issuers to anchor documents to a public blockchain while maintaining absolute data privacy through client-side (Zero-Knowledge) hashing.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Available-emerald?style=for-the-badge)](https://fileguard-final.onrender.com)

## 🛡️ Core Features

- **Zero-Knowledge Architecture:** Documents are hashed locally in the browser using the WebCrypto API (`SHA-256`). The actual file *never* leaves the user's device.
- **Blockchain Anchoring:** Hashes are aggregated and anchored to public blockchains (Bitcoin/Ethereum) via the OriginStamp API, creating an immutable, cryptographically verifiable timestamp.
- **Verified Issuer Identity:** Only vetted organizations can anchor documents. The system employs JWT authentication, email verification (via Resend), and manual admin approval.
- **Public Auditability:** Anyone can verify a document's authenticity instantly by uploading the file or providing its SHA-256 hash. No account required.
- **Rate Limiting & Security:** Built with strict Express rate limiters (per-IP and per-User) and Helmet for HTTP security headers to prevent abuse.

## 🏗️ Technical Stack

**Frontend:**
- React 18 with Vite
- Tailwind CSS v4 (Zinc/Amber color palette)
- `lucide-react` for icons
- `react-helmet-async` for SEO optimization
- `jspdf` for generating cryptographic verification certificates

**Backend:**
- Node.js & Express
- MongoDB (Mongoose) for fast, indexed hash lookups
- OriginStamp API for DLT/Blockchain timestamping
- Resend for transactional emails
- JWT for stateless authentication

## 🚀 Getting Started

### Prerequisites
- Node.js v20+
- MongoDB instance (Atlas or local)
- OriginStamp API Key (Optional, fallbacks to deterministic mock mode)
- Resend API Key (Optional, fallbacks to console logging)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/0xAashif/Fileguard.git
   cd Fileguard
   ```

2. Install Backend Dependencies:
   ```bash
   npm install
   ```

3. Install Frontend Dependencies:
   ```bash
   cd client
   npm install
   ```

4. Configure Environment Variables (`.env` in root):
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<your-cluster-url>
   JWT_SECRET=your_super_secret_key
   ADMIN_SECRET=your_admin_secret
   ORIGINSTAMP_API_KEY=your_originstamp_key # Optional
   RESEND_API_KEY=your_resend_key # Optional
   ```

5. Run the Application:
   ```bash
   # Start backend (from root)
   npm start
   
   # Start frontend (from /client)
   npm run dev
   ```

## 🔒 Security Posture

FileGuard is designed to "fail-fast". If critical secrets like `JWT_SECRET` or `MONGODB_URI` are missing, the server will intentionally crash rather than boot in a vulnerable state. All API endpoints are rate-limited, and the `anchor` route enforces a strict per-user limiter to prevent hash-spamming from rotated IP addresses.

## 📄 License
MIT License. Built by Aashif Khan.
