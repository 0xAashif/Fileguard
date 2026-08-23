import { useLocation } from 'react-router-dom';
import SEO from './SEO';

export default function Legal() {
  const location = useLocation();
  const isPrivacy = location.pathname === '/privacy';

  return (
    <>
      <SEO 
        title={isPrivacy ? 'Privacy Policy' : 'Terms of Service'} 
        description={`FileGuard ${isPrivacy ? 'Privacy Policy' : 'Terms of Service'} - Learn how we protect your data.`}
      />
      <div className="max-w-3xl mx-auto px-4 py-16 animate-fade-in text-zinc-300 space-y-6 text-sm">
        <h1 className="text-3xl font-bold text-white mb-8">
          {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
        </h1>
        
        {isPrivacy ? (
          <>
            <p>Last updated: August 2026</p>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Zero-Knowledge Architecture</h2>
            <p>FileGuard operates on a zero-knowledge architecture. When you anchor or verify a document, the cryptographic hash (SHA-256) is calculated entirely within your web browser. Your actual files are <strong>never</strong> transmitted to our servers, and we have no ability to view, store, or recover your documents.</p>
            
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Data We Collect</h2>
            <p>We collect and store only the minimum data necessary to operate the cryptographic ledger:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Cryptographic hashes (SHA-256) of anchored documents</li>
              <li>Document metadata provided by issuers (e.g., filename, file size)</li>
              <li>Issuer account information (email address, organization name)</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Blockchain Anchoring</h2>
            <p>Document hashes are aggregated and anchored to public blockchains via OriginStamp. This process creates an immutable timestamp that is publicly verifiable and cannot be deleted by FileGuard.</p>
          </>
        ) : (
          <>
            <p>Last updated: August 2026</p>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using FileGuard's document anchoring and verification services, you agree to be bound by these Terms of Service.</p>
            
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Issuer Responsibilities</h2>
            <p>Organizations registering as Issuers are solely responsible for the authenticity of the documents they anchor. FileGuard verifies the existence of a document at a specific point in time; it does not verify the factual accuracy of the document's contents.</p>
            
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Immutable Ledger</h2>
            <p>You acknowledge that cryptographic proofs anchored to the blockchain cannot be deleted, modified, or reversed. Do not anchor hashes of documents if you do not have the legal right to do so.</p>
            
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Limitation of Liability</h2>
            <p>FileGuard provides this cryptographic infrastructure "as is". We are not liable for any damages arising from your reliance on the verification status of any document, nor for any loss of data, loss of access, or service interruptions.</p>
          </>
        )}
      </div>
    </>
  );
}
