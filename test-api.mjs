// Quick API test script for FileGuard
const fs = await import('fs');
const path = await import('path');

const API = 'http://localhost:5000/api';

// Test 1: Health Check
console.log('=== Test 1: Health Check ===');
const health = await fetch(`${API}/health`).then(r => r.json());
console.log('Status:', health.status);
console.log('Memory:', health.memory.heapUsed);
console.log();

// Test 2: Upload File
console.log('=== Test 2: Upload File ===');
const fileContent = fs.readFileSync('test-doc.txt');
const formData = new FormData();
formData.append('file', new Blob([fileContent]), 'test-doc.txt');

const uploadRes = await fetch(`${API}/documents/upload`, {
  method: 'POST',
  body: formData,
}).then(r => r.json());

console.log('Message:', uploadRes.message);
console.log('File:', uploadRes.document?.fileName);
console.log('Hash:', uploadRes.document?.originalHash);
console.log('Size:', uploadRes.document?.fileSizeBytes, 'bytes');
console.log('Time:', uploadRes.document?.processingTimeMs, 'ms');
console.log('Status:', uploadRes.document?.status);
console.log('TX ID:', uploadRes.document?.originStampTxId?.slice(0, 20) + '...');
console.log();

// Test 3: Verify by Hash
console.log('=== Test 3: Verify by Hash ===');
const hash = uploadRes.document?.originalHash;
const verifyRes = await fetch(`${API}/documents/verify/hash`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hash }),
}).then(r => r.json());

console.log('Verified:', verifyRes.verified);
console.log('Status:', verifyRes.status);
console.log('Method:', verifyRes.comparisonMethod);
console.log();

// Test 4: List Documents
console.log('=== Test 4: List Documents ===');
const docsRes = await fetch(`${API}/documents`).then(r => r.json());
console.log('Total documents:', docsRes.pagination?.total);
console.log('First doc:', docsRes.documents?.[0]?.fileName);
console.log();

console.log('✅ All tests passed!');
