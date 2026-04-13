import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { insertQrCodeSchema, updateQrCodeSchema } from "../shared/schema.js";
import QRCode from "qrcode";
import multer from "multer";

let sharpModule: any | null = null;
let sharpLoadErrorLogged = false;

async function getSharp() {
  if (sharpModule) return sharpModule;
  try {
    const imported = await import("sharp");
    sharpModule = imported.default;
    return sharpModule;
  } catch (error) {
    if (!sharpLoadErrorLogged) {
      console.error("Sharp is unavailable in this runtime:", error);
      sharpLoadErrorLogged = true;
    }
    return null;
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Helper function to apply QR code styling
async function applyQrStyle(qrBuffer: Buffer, style: string): Promise<Buffer> {
  try {
    const sharp = await getSharp();
    if (!sharp) return qrBuffer;
    const image = sharp(qrBuffer);
    
    if (style === "rounded") {
      // Apply rounded corners
      const metadata = await image.metadata();
      const size = metadata.width || 400;
      const cornerRadius = Math.floor(size * 0.05); // 5% of image size
      
      const roundedCornerSvg = `<svg width="${size}" height="${size}">
        <defs>
          <clipPath id="rounded">
            <rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}"/>
          </clipPath>
        </defs>
        <image width="${size}" height="${size}" clip-path="url(#rounded)" href="data:image/png;base64,${qrBuffer.toString('base64')}"/>
      </svg>`;
      
      return await sharp(Buffer.from(roundedCornerSvg))
        .png()
        .toBuffer();
    }
    
    return qrBuffer;
  } catch (error) {
    console.error("Error applying QR style:", error);
    return qrBuffer;
  }
}

// Helper function to add logo to QR code
async function addLogoToQr(qrBuffer: Buffer, logoSource: string, qrSize: number): Promise<Buffer> {
  try {
    const sharp = await getSharp();
    if (!sharp) return qrBuffer;
    const logoSize = Math.floor(qrSize * 0.2); // Logo is 20% of QR size
    const position = Math.floor((qrSize - logoSize) / 2);
    
    let processedLogo: Buffer;
    
    try {
      let logoBuffer: Buffer;
      
      // Check if it's base64 data or a URL
      if (logoSource.startsWith('data:image/')) {
        // Handle base64 data
        const base64Data = logoSource.split(',')[1];
        logoBuffer = Buffer.from(base64Data, 'base64');
        console.log(`Using uploaded logo data, size: ${logoBuffer.length} bytes`);
      } else {
        // Handle URL
        const logoResponse = await fetch(logoSource, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000)
        });
        
        if (!logoResponse.ok) {
          throw new Error(`Failed to fetch logo: ${logoResponse.status}`);
        }
        
        const logoBlob = await logoResponse.blob();
        const logoArrayBuffer = await logoBlob.arrayBuffer();
        logoBuffer = Buffer.from(logoArrayBuffer);
        console.log(`Fetched logo from ${logoSource}, size: ${logoBuffer.length} bytes`);
      }
      
      // Process the logo
      processedLogo = await sharp(logoBuffer)
        .png()
        .resize(logoSize, logoSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .extend({
          top: 10,
          bottom: 10,
          left: 10,
          right: 10,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toBuffer();
        
      console.log('Logo processed successfully');
      
    } catch (logoError: any) {
      console.log(`Failed to process logo:`, logoError.message);
      console.log('Creating fallback logo...');
      
      // Create a fallback logo programmatically
      processedLogo = await sharp({
        create: {
          width: logoSize + 20,
          height: logoSize + 20,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite([{
        input: await sharp({
          create: {
            width: logoSize,
            height: logoSize,
            channels: 4,
            background: { r: 59, g: 130, b: 246, alpha: 1 } // Blue circle as fallback logo
          }
        })
        .png()
        .toBuffer(),
        top: 10,
        left: 10
      }])
      .png()
      .toBuffer();
      
      console.log('Fallback logo created successfully');
    }
    
    // Composite the processed logo onto the QR code
    return await sharp(qrBuffer)
      .composite([{
        input: processedLogo,
        top: position - 10,
        left: position - 10
      }])
      .png()
      .toBuffer();
      
  } catch (error) {
    console.error("Error adding logo to QR:", error);
    return qrBuffer;
  }
}

// HTML escaping function to prevent XSS attacks
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Create QR Code
  app.post("/api/qr-codes", requireAuth, async (req: any, res) => {
    try {
      const qrCodeData = insertQrCodeSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const qrCode = await storage.createQrCode(qrCodeData);
      res.status(201).json(qrCode);
    } catch (error: any) {
      console.error("Error creating QR code:", error);
      res.status(400).json({ message: error.message || "Failed to create QR code" });
    }
  });

  // Get user's QR codes
  app.get("/api/qr-codes", requireAuth, async (req: any, res) => {
    try {
      const qrCodes = await storage.getUserQrCodes(req.user.id);
      res.json(qrCodes);
    } catch (error) {
      console.error("Error fetching QR codes:", error);
      res.status(500).json({ message: "Failed to fetch QR codes" });
    }
  });

  // Update QR code content (change link)
  app.patch("/api/qr-codes/:id", requireAuth, async (req: any, res) => {
    try {
      const data = updateQrCodeSchema.parse({
        id: req.params.id,
        content: req.body.content,
      });

      const updated = await storage.updateQrCodeContent(data.id, req.user.id, data.content);
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ message: "QR code not found or access denied" });
      }
    } catch (error: any) {
      console.error("Error updating QR code:", error);
      res.status(400).json({ message: error.message || "Failed to update QR code" });
    }
  });

  // Delete QR code
  app.delete("/api/qr-codes/:id", requireAuth, async (req: any, res) => {
    try {
      const deleted = await storage.deleteQrCode(req.params.id, req.user.id);
      if (deleted) {
        res.status(200).json({ message: "QR code deleted successfully" });
      } else {
        res.status(404).json({ message: "QR code not found or access denied" });
      }
    } catch (error) {
      console.error("Error deleting QR code:", error);
      res.status(500).json({ message: "Failed to delete QR code" });
    }
  });

  // Get QR code image
  app.get("/api/qr-codes/:id/image", async (req, res) => {
    try {
      const qrCode = await storage.getQrCode(req.params.id);
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }

      let qrContent: string;
      
      // For WiFi and vCard, use direct content since redirects don't work
      // For other types, use tracking URL for analytics
      if (qrCode.type === "wifi") {
        // WiFi format: WIFI:T:WPA;S:NetworkName;P:Password;H:false;;
        // Content stored as JSON: {ssid, password, security} (new format)
        // or legacy colon-format: "NetworkName:Password:Security"
        let networkName: string, password: string, security: string;
        try {
          const parsed = JSON.parse(qrCode.content);
          networkName = parsed.ssid || 'Unknown';
          password = parsed.password || '';
          security = parsed.security || 'WPA';
        } catch {
          // Legacy fallback: SSID:Password:Security
          const wifiParts = qrCode.content.split(':');
          networkName = wifiParts[0] || 'Unknown';
          password = wifiParts[1] || '';
          security = wifiParts[2] || 'WPA';
        }
        qrContent = `WIFI:T:${security};S:${networkName};P:${password};H:false;;`;
      } else if (qrCode.type === "vcard") {
        // vCard format - if not already formatted, wrap in VCARD structure
        if (!qrCode.content.includes('BEGIN:VCARD')) {
          qrContent = `BEGIN:VCARD\nVERSION:3.0\nFN:${qrCode.content}\nEND:VCARD`;
        } else {
          qrContent = qrCode.content;
        }
      } else {
        // Check if tracking is enabled
        const useTracking = qrCode.enableTracking === "true";
        
        if (useTracking) {
          // Use tracking URL for analytics
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          qrContent = `${baseUrl}/api/r/${qrCode.shortCode}`;
        } else {
          // Use direct content for immediate access
          qrContent = qrCode.content;
          
          // Add protocol for URLs if missing
          if (qrCode.type === "url" && !qrContent.startsWith("http://") && !qrContent.startsWith("https://")) {
            qrContent = `https://${qrContent}`;
          } else if (qrCode.type === "email") {
            qrContent = `mailto:${qrContent}`;
          } else if (qrCode.type === "phone") {
            qrContent = `tel:${qrContent}`;
          } else if (qrCode.type === "sms") {
            qrContent = `sms:${qrContent}`;
          }
        }
      }

      // Generate QR code with customization options
      const qrOptions = {
        type: "png" as const,
        width: qrCode.size || 400,
        margin: qrCode.margin || 2,
        color: {
          dark: qrCode.foregroundColor || "#000000",
          light: qrCode.backgroundColor || "#ffffff"
        },
        errorCorrectionLevel: (qrCode.errorCorrection || "M") as "L" | "M" | "Q" | "H"
      };

      let qrImage: Buffer = await QRCode.toBuffer(qrContent, qrOptions);

      // Apply style modifications if needed
      if (qrCode.style === "rounded" || qrCode.style === "dots") {
        qrImage = await applyQrStyle(qrImage, qrCode.style);
      }

      // Add logo if specified (either from uploaded data or URL)
      if (qrCode.logoData) {
        qrImage = await addLogoToQr(qrImage, qrCode.logoData, qrCode.size || 400);
      } else if (qrCode.logoUrl) {
        qrImage = await addLogoToQr(qrImage, qrCode.logoUrl, qrCode.size || 400);
      }

      res.set({
        "Content-Type": "image/png",
        "Content-Length": qrImage.length,
      });
      res.send(qrImage);
    } catch (error) {
      console.error("Error generating QR code image:", error);
      res.status(500).json({ message: "Failed to generate QR code image" });
    }
  });

  // Get QR code image (Direct - no tracking)
  app.get("/api/qr-codes/:id/image/direct", async (req, res) => {
    try {
      const qrCode = await storage.getQrCode(req.params.id);
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }

      let qrContent: string;
      
      // Always use direct content for this endpoint
      if (qrCode.type === "wifi") {
        let networkName: string, password: string, security: string;
        try {
          const parsed = JSON.parse(qrCode.content);
          networkName = parsed.ssid || 'Unknown';
          password = parsed.password || '';
          security = parsed.security || 'WPA';
        } catch {
          const wifiParts = qrCode.content.split(':');
          networkName = wifiParts[0] || 'Unknown';
          password = wifiParts[1] || '';
          security = wifiParts[2] || 'WPA';
        }
        qrContent = `WIFI:T:${security};S:${networkName};P:${password};H:false;;`;
      } else if (qrCode.type === "vcard") {
        if (!qrCode.content.includes('BEGIN:VCARD')) {
          qrContent = `BEGIN:VCARD\nVERSION:3.0\nFN:${qrCode.content}\nEND:VCARD`;
        } else {
          qrContent = qrCode.content;
        }
      } else {
        qrContent = qrCode.content;
        
        // Add protocol for URLs if missing
        if (qrCode.type === "url" && !qrContent.startsWith("http://") && !qrContent.startsWith("https://")) {
          qrContent = `https://${qrContent}`;
        } else if (qrCode.type === "email") {
          qrContent = `mailto:${qrContent}`;
        } else if (qrCode.type === "phone") {
          qrContent = `tel:${qrContent}`;
        } else if (qrCode.type === "sms") {
          qrContent = `sms:${qrContent}`;
        }
      }

      // Generate QR code
      const qrOptions = {
        type: "png" as const,
        width: qrCode.size || 400,
        margin: qrCode.margin || 2,
        color: {
          dark: qrCode.foregroundColor || "#000000",
          light: qrCode.backgroundColor || "#ffffff"
        },
        errorCorrectionLevel: (qrCode.errorCorrection || "M") as "L" | "M" | "Q" | "H"
      };

      let qrImage: Buffer = await QRCode.toBuffer(qrContent, qrOptions);

      // Apply styling and logo
      if (qrCode.style === "rounded" || qrCode.style === "dots") {
        qrImage = await applyQrStyle(qrImage, qrCode.style);
      }
      if (qrCode.logoData) {
        qrImage = await addLogoToQr(qrImage, qrCode.logoData, qrCode.size || 400);
      } else if (qrCode.logoUrl) {
        qrImage = await addLogoToQr(qrImage, qrCode.logoUrl, qrCode.size || 400);
      }

      res.set({
        "Content-Type": "image/png",
        "Content-Length": qrImage.length,
      });
      res.send(qrImage);
    } catch (error) {
      console.error("Error generating direct QR code image:", error);
      res.status(500).json({ message: "Failed to generate QR code image" });
    }
  });

  // Get QR code image (Tracking - with analytics)
  app.get("/api/qr-codes/:id/image/tracking", async (req, res) => {
    try {
      const qrCode = await storage.getQrCode(req.params.id);
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }

      let qrContent: string;
      
      // Always use tracking URLs for this endpoint
      if (qrCode.type === "wifi") {
        let networkName: string, password: string, security: string;
        try {
          const parsed = JSON.parse(qrCode.content);
          networkName = parsed.ssid || 'Unknown';
          password = parsed.password || '';
          security = parsed.security || 'WPA';
        } catch {
          const wifiParts = qrCode.content.split(':');
          networkName = wifiParts[0] || 'Unknown';
          password = wifiParts[1] || '';
          security = wifiParts[2] || 'WPA';
        }
        qrContent = `WIFI:T:${security};S:${networkName};P:${password};H:false;;`;
      } else if (qrCode.type === "vcard") {
        if (!qrCode.content.includes('BEGIN:VCARD')) {
          qrContent = `BEGIN:VCARD\nVERSION:3.0\nFN:${qrCode.content}\nEND:VCARD`;
        } else {
          qrContent = qrCode.content;
        }
      } else {
        // Use tracking URL for analytics
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        qrContent = `${baseUrl}/api/r/${qrCode.shortCode}`;
      }

      // Generate QR code
      const qrOptions = {
        type: "png" as const,
        width: qrCode.size || 400,
        margin: qrCode.margin || 2,
        color: {
          dark: qrCode.foregroundColor || "#000000",
          light: qrCode.backgroundColor || "#ffffff"
        },
        errorCorrectionLevel: (qrCode.errorCorrection || "M") as "L" | "M" | "Q" | "H"
      };

      let qrImage: Buffer = await QRCode.toBuffer(qrContent, qrOptions);

      // Apply styling and logo
      if (qrCode.style === "rounded" || qrCode.style === "dots") {
        qrImage = await applyQrStyle(qrImage, qrCode.style);
      }
      if (qrCode.logoData) {
        qrImage = await addLogoToQr(qrImage, qrCode.logoData, qrCode.size || 400);
      } else if (qrCode.logoUrl) {
        qrImage = await addLogoToQr(qrImage, qrCode.logoUrl, qrCode.size || 400);
      }

      res.set({
        "Content-Type": "image/png",
        "Content-Length": qrImage.length,
      });
      res.send(qrImage);
    } catch (error) {
      console.error("Error generating tracking QR code image:", error);
      res.status(500).json({ message: "Failed to generate QR code image" });
    }
  });

  // Upload logo for QR code
  app.post("/api/upload-logo", requireAuth, upload.single('logo'), async (req: any, res) => {
    try {
      const sharp = await getSharp();
      if (!sharp) {
        return res.status(503).json({ message: "Image processing is unavailable right now." });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No logo file provided" });
      }

      // Process the uploaded image to ensure it's a valid format
      const logoBuffer = req.file.buffer;
      
      // Resize and optimize the logo
      const processedLogo = await sharp(logoBuffer)
        .resize(200, 200, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toBuffer();

      // Convert to base64 for storage
      const logoData = `data:image/png;base64,${processedLogo.toString('base64')}`;

      res.json({ 
        success: true, 
        logoData,
        message: "Logo uploaded successfully"
      });

    } catch (error: any) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: error.message || "Failed to upload logo" });
    }
  });

  // QR code redirect with analytics
  app.get("/api/r/:shortCode", async (req, res) => {
    try {
      const qrCode = await storage.getQrCodeByShortCode(req.params.shortCode);
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }

      // Update click count
      await storage.updateQrCodeClickCount(qrCode.id);

      // Redirect based on type
      let redirectUrl = qrCode.content;
      switch (qrCode.type) {
        case "url":
          if (!redirectUrl.startsWith("http://") && !redirectUrl.startsWith("https://")) {
            redirectUrl = `https://${redirectUrl}`;
          }
          break;
        case "email":
          redirectUrl = `mailto:${qrCode.content}`;
          break;
        case "phone":
          redirectUrl = `tel:${qrCode.content}`;
          break;
        case "sms":
          redirectUrl = `sms:${qrCode.content}`;
          break;
        case "wifi": {
          // WiFi QR codes should show instructions
          let networkName: string, password: string, security: string;
          try {
            const parsed = JSON.parse(qrCode.content);
            networkName = escapeHtml(parsed.ssid || 'Unknown Network');
            password = escapeHtml(parsed.password || '');
            security = escapeHtml(parsed.security || 'WPA');
          } catch {
            const wifiParts = qrCode.content.split(':');
            networkName = escapeHtml(wifiParts[0] || 'Unknown Network');
            password = escapeHtml(wifiParts[1] || '');
            security = escapeHtml(wifiParts[2] || 'WPA');
          }
          return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WiFi Network – ${networkName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%; max-width: 480px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 28px;
      backdrop-filter: blur(24px);
      box-shadow: 0 32px 64px rgba(0,0,0,0.4);
      overflow: hidden;
      animation: slideUp 0.5s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:none; } }
    .hero {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      padding: 40px 36px 32px;
      text-align: center;
      position: relative; overflow: hidden;
    }
    .hero::before {
      content: ''; position: absolute; inset: -40%;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%);
    }
    .wifi-icon {
      width: 72px; height: 72px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 36px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }
    .hero h1 { color: #fff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .hero p { color: rgba(255,255,255,0.75); font-size: 14px; margin-top: 6px; }
    .body { padding: 32px 36px; }
    .field { margin-bottom: 20px; }
    .field label {
      display: block; font-size: 11px; font-weight: 700;
      letter-spacing: 1.2px; text-transform: uppercase;
      color: rgba(255,255,255,0.45); margin-bottom: 8px;
    }
    .field-value {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px; padding: 14px 18px;
    }
    .field-value span { color: #fff; font-size: 17px; font-weight: 600; word-break: break-all; }
    .copy-btn {
      background: rgba(99,102,241,0.3); border: 1px solid rgba(99,102,241,0.5);
      color: #a5b4fc; border-radius: 10px; padding: 7px 14px;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
    }
    .copy-btn:hover { background: rgba(99,102,241,0.5); color: #fff; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3);
      color: #4ade80; border-radius: 999px; padding: 4px 12px;
      font-size: 12px; font-weight: 600;
    }
    .divider { height: 1px; background: rgba(255,255,255,0.08); margin: 8px 0 24px; }
    .tip {
      background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
      border-radius: 14px; padding: 16px 20px;
      color: rgba(255,255,255,0.6); font-size: 13px; line-height: 1.6;
    }
    .tip strong { color: #a5b4fc; }
    .footer { padding: 16px 36px 28px; text-align: center; }
    .footer a {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; text-decoration: none; padding: 13px 32px;
      border-radius: 14px; font-weight: 700; font-size: 14px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 8px 24px rgba(99,102,241,0.35);
    }
    .footer a:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(99,102,241,0.5); }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">
      <div class="wifi-icon">📶</div>
      <h1>WiFi Network</h1>
      <p>Tap to connect instantly</p>
    </div>
    <div class="body">
      <div class="field">
        <label>Network Name (SSID)</label>
        <div class="field-value">
          <span id="ssid">${networkName}</span>
          <button class="copy-btn" onclick="copy('ssid', this)">Copy</button>
        </div>
      </div>
      <div class="field">
        <label>Password</label>
        <div class="field-value">
          <span id="pwd">${password || '(No password)'}</span>
          ${password ? '<button class="copy-btn" onclick="copy(\'pwd\', this)">Copy</button>' : ''}
        </div>
      </div>
      <div class="field">
        <label>Security</label>
        <div class="field-value"><span><span class="badge">🔒 ${security}</span></span></div>
      </div>
      <div class="divider"></div>
      <div class="tip"><strong>💡 Tip:</strong> Most modern phones can connect by scanning the QR code directly from the camera app – no need to type the password.</div>
    </div>
    <div class="footer">
      <a href="/">← Back to QR Generator</a>
    </div>
  </div>
  <script>
    function copy(id, btn) {
      const text = document.getElementById(id).innerText;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Copied';
        btn.style.background = 'rgba(34,197,94,0.3)';
        btn.style.borderColor = 'rgba(34,197,94,0.5)';
        btn.style.color = '#4ade80';
        setTimeout(() => { btn.textContent = orig; btn.style = ''; }, 2000);
      });
    }
  </script>
</body>
</html>`);
        }
        case "vcard": {
          // Parse vCard fields for a nice display
          const vcardContent = qrCode.content;
          const getField = (key: string) => {
            const match = vcardContent.match(new RegExp(key + '[^:]*:([^\r\n]+)', 'i'));
            return match ? escapeHtml(match[1].trim()) : '';
          };
          const fullName = getField('FN') || getField('N') || 'Contact';
          const email = getField('EMAIL');
          const phone = getField('TEL');
          const org = getField('ORG');
          const title = getField('TITLE');
          const url = getField('URL');
          const address = getField('ADR').split(';').map((s: string) => s.trim()).filter(Boolean).join(', ');
          const renderRow = (icon: string, label: string, value: string, href?: string) =>
            value ? `<div class="row"><div class="row-icon">${icon}</div><div class="row-body"><div class="row-label">${label}</div><div class="row-value">${href ? `<a href="${href}" class="link">${value}</a>` : value}</div></div></div>` : '';
          return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fullName} – Contact Card</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%; max-width: 440px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 28px;
      backdrop-filter: blur(24px);
      box-shadow: 0 32px 80px rgba(0,0,0,0.5);
      overflow: hidden;
      animation: slideUp 0.5s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:none; } }
    .hero {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      padding: 40px 32px 36px;
      text-align: center; position: relative; overflow: hidden;
    }
    .hero::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(circle at 25% 0%, rgba(255,255,255,0.2) 0%, transparent 60%);
    }
    .avatar {
      width: 88px; height: 88px; border-radius: 50%;
      background: rgba(255,255,255,0.25);
      border: 3px solid rgba(255,255,255,0.35);
      display: flex; align-items: center; justify-content: center;
      font-size: 42px; margin: 0 auto 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .hero h1 { color: #fff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .hero .sub { color: rgba(255,255,255,0.7); font-size: 14px; margin-top: 4px; }
    .body { padding: 24px 28px 8px; }
    .row {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .row:last-child { border-bottom: none; }
    .row-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .row-body { flex: 1; min-width: 0; }
    .row-label { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 3px; }
    .row-value { font-size: 15px; font-weight: 500; color: #e2e8f0; word-break: break-all; }
    .link { color: #818cf8; text-decoration: none; }
    .link:hover { color: #a5b4fc; text-decoration: underline; }
    .actions { padding: 20px 28px 28px; display: flex; gap: 12px; flex-wrap: wrap; }
    .btn {
      flex: 1; min-width: 120px;
      border: none; border-radius: 14px; padding: 14px 20px;
      font-family: inherit; font-weight: 700; font-size: 14px;
      cursor: pointer; text-align: center; text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s; display: block;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #fff;
      box-shadow: 0 8px 24px rgba(79,70,229,0.4);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(79,70,229,0.55); }
    .btn-secondary {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.8);
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.13); }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">
      <div class="avatar">👤</div>
      <h1>${fullName}</h1>
      ${title || org ? `<p class="sub">${[title, org].filter(Boolean).join(' · ')}</p>` : ''}
    </div>
    <div class="body">
      ${renderRow('📞', 'Phone', phone, phone ? `tel:${phone}` : undefined)}
      ${renderRow('✉️', 'Email', email, email ? `mailto:${email}` : undefined)}
      ${renderRow('🏢', 'Organization', org)}
      ${renderRow('💼', 'Title', title)}
      ${renderRow('🌐', 'Website', url, url)}
      ${renderRow('📍', 'Address', address)}
    </div>
    <div class="actions">
      <button class="btn btn-primary" onclick="saveContact()">💾 Save Contact</button>
      ${phone ? `<a class="btn btn-primary" href="tel:${phone}">📞 Call</a>` : ''}
      ${email ? `<a class="btn btn-primary" href="mailto:${email}">✉️ Email</a>` : ''}
      <a class="btn btn-secondary" href="/">← Home</a>
    </div>
  </div>
  <script>
    const vcfData = ${JSON.stringify(vcardContent)};
    function saveContact() {
      const blob = new Blob([vcfData], { type: 'text/vcard;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '${fullName.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'contact'}.vcf';
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`);
        }
        case "text":
        default: {
          // For text and other types, show the content nicely
          return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR Code Message</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%; max-width: 540px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 28px;
      backdrop-filter: blur(24px);
      box-shadow: 0 32px 80px rgba(0,0,0,0.5);
      overflow: hidden;
      animation: slideUp 0.5s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:none; } }
    .hero {
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      padding: 36px 32px 28px;
      text-align: center; position: relative; overflow: hidden;
    }
    .hero::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(circle at 70% 20%, rgba(255,255,255,0.18) 0%, transparent 55%);
    }
    .icon-wrap {
      width: 68px; height: 68px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 14px; font-size: 32px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    }
    .hero h1 { color: #fff; font-size: 22px; font-weight: 800; }
    .hero p { color: rgba(255,255,255,0.72); font-size: 13px; margin-top: 5px; }
    .body { padding: 28px 32px; }
    .message-box {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-left: 4px solid #6366f1;
      border-radius: 16px;
      padding: 22px 24px;
      color: #e2e8f0;
      font-size: 16px;
      line-height: 1.8;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .actions { margin-top: 22px; display: flex; gap: 12px; flex-wrap: wrap; }
    .btn {
      flex: 1; min-width: 130px;
      border: none; border-radius: 14px; padding: 14px 20px;
      font-family: inherit; font-weight: 700; font-size: 14px;
      cursor: pointer; text-align: center; text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s; display: block;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: #fff; box-shadow: 0 8px 24px rgba(14,165,233,0.35);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(14,165,233,0.5); }
    .btn-secondary {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.75);
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.13); }
    .footer { padding: 0 32px 24px; text-align: center; color: rgba(255,255,255,0.25); font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">
      <div class="icon-wrap">✉️</div>
      <h1>QR Code Message</h1>
      <p>Scanned from your QR code</p>
    </div>
    <div class="body">
      <div class="message-box" id="msg">${escapeHtml(qrCode.content)}</div>
      <div class="actions">
        <button class="btn btn-primary" id="copyBtn" onclick="copyMsg()">📋 Copy Text</button>
        <a class="btn btn-secondary" href="/">← Home</a>
      </div>
    </div>
    <div class="footer">Powered by AdvanceQR</div>
  </div>
  <script>
    function copyMsg() {
      const text = document.getElementById('msg').innerText;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = '✓ Copied!';
        btn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
        btn.style.boxShadow = '0 8px 24px rgba(34,197,94,0.4)';
        setTimeout(() => { btn.textContent = '📋 Copy Text'; btn.style = ''; }, 2500);
      });
    }
  </script>
</body>
</html>`);
        }
      }

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Error handling QR code redirect:", error);
      res.status(500).json({ message: "Failed to process QR code" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
