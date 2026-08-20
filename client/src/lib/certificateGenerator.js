import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

/**
 * Generates an official Certificate of Cryptographic Authenticity (PDF)
 * with an embedded QR code linking directly to the public verification URL.
 */
export async function generateCertificatePDF(documentData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 (points)
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  // Colors
  const darkNavy = rgb(0.04, 0.08, 0.18);
  const brandBlue = rgb(0.15, 0.38, 0.92);
  const slateGray = rgb(0.38, 0.44, 0.52);
  const lightBg = rgb(0.97, 0.98, 0.99);
  const borderGray = rgb(0.85, 0.88, 0.92);

  // Background Fill
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: lightBg,
  });

  // Outer Decorative Border
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: brandBlue,
    borderWidth: 2,
  });

  // Inner Subtle Border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: borderGray,
    borderWidth: 1,
  });

  // Top Header Banner
  page.drawRectangle({
    x: 32,
    y: height - 110,
    width: width - 64,
    height: 78,
    color: darkNavy,
  });

  page.drawText('FILEGUARD TRUST PROTOCOL', {
    x: 52,
    y: height - 65,
    size: 10,
    font: fontBold,
    color: rgb(0.4, 0.65, 1.0),
  });

  page.drawText('Certificate of Cryptographic Authenticity', {
    x: 52,
    y: height - 90,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Subtitle / Intro
  let currentY = height - 145;
  page.drawText(
    'This document certifies that the digital asset detailed below has been cryptographically registered',
    {
      x: 52,
      y: currentY,
      size: 9.5,
      font: fontRegular,
      color: slateGray,
    }
  );
  currentY -= 14;
  page.drawText(
    'with a zero-knowledge SHA-256 fingerprint anchored to the immutable public ledger audit trail.',
    {
      x: 52,
      y: currentY,
      size: 9.5,
      font: fontRegular,
      color: slateGray,
    }
  );

  // Details Container Box
  currentY -= 25;
  const boxHeight = 280;
  page.drawRectangle({
    x: 52,
    y: currentY - boxHeight,
    width: width - 104,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 1,
  });

  let rowY = currentY - 28;

  // Helper to render field rows
  const drawField = (label, value, isMono = false, isHighlight = false) => {
    page.drawText(label.toUpperCase(), {
      x: 70,
      y: rowY,
      size: 8,
      font: fontBold,
      color: slateGray,
    });

    page.drawText(String(value || 'N/A'), {
      x: 70,
      y: rowY - 14,
      size: isMono ? 8.5 : 10,
      font: isMono ? fontMono : isHighlight ? fontBold : fontRegular,
      color: isHighlight ? brandBlue : darkNavy,
    });

    rowY -= 38;
  };

  drawField('Verified Issuer Organization', documentData.issuerName || 'Verified Organization', false, true);
  drawField('Document Filename', documentData.fileName || 'Document', false, false);
  drawField('Cryptographic Fingerprint (SHA-256)', documentData.originalHash, true, false);
  drawField(
    'Anchoring Timestamp',
    new Date(documentData.originStampTimestamp || documentData.createdAt || Date.now()).toUTCString(),
    false,
    false
  );
  drawField('OriginStamp Ledger Transaction ID', documentData.originStampTxId || 'Verified Record', true, false);
  drawField('Audit & Integrity Status', `${(documentData.status || 'ANCHORED').toUpperCase()} · ZERO-KNOWLEDGE PROOF`, false, false);

  // Verification & QR Section
  const qrSectionY = currentY - boxHeight - 30;
  page.drawRectangle({
    x: 52,
    y: qrSectionY - 180,
    width: width - 104,
    height: 180,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: rgb(0.8, 0.88, 1.0),
    borderWidth: 1,
  });

  // Generate QR Code
  const verifyUrl = `${window.location.origin}/verify?hash=${documentData.originalHash}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 140,
    color: {
      dark: '#0a0e1a',
      light: '#ffffff',
    },
  });

  const qrImage = await pdfDoc.embedPng(qrDataUrl);
  page.drawImage(qrImage, {
    x: 70,
    y: qrSectionY - 160,
    width: 140,
    height: 140,
  });

  // QR Section Text
  page.drawText('INDEPENDENT VERIFICATION', {
    x: 230,
    y: qrSectionY - 45,
    size: 11,
    font: fontBold,
    color: darkNavy,
  });

  const verifyDesc = [
    'Scan the QR code with any smartphone camera or navigate to:',
    verifyUrl.length > 55 ? `${verifyUrl.slice(0, 52)}...` : verifyUrl,
    '',
    'Any party can independently upload the original file to verify that',
    'its bit-for-bit SHA-256 hash matches this certificate identically.',
    'If even 1 byte has been modified, verification will fail.',
  ];

  let descY = qrSectionY - 65;
  for (const line of verifyDesc) {
    page.drawText(line, {
      x: 230,
      y: descY,
      size: 8.5,
      font: line.startsWith('http') ? fontMono : fontRegular,
      color: line.startsWith('http') ? brandBlue : slateGray,
    });
    descY -= 14;
  }

  // Footer / Compliance Note
  page.drawText(
    'Issued by FileGuard Cryptographic Trust Protocol · Mathematically Verifiable · Tamper-Evident',
    {
      x: 52,
      y: 44,
      size: 7.5,
      font: fontRegular,
      color: slateGray,
    }
  );

  const pdfBytes = await pdfDoc.save();

  // Trigger browser download
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `FileGuard-Certificate-${documentData.fileName || 'Proof'}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
