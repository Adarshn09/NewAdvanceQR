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
        // Input format expected: "NetworkName:Password:Security"
        const wifiParts = qrCode.content.split(':');
        if (wifiParts.length >= 2) {
          const networkName = wifiParts[0];
          const password = wifiParts[1];
          const security = wifiParts[2] || 'WPA';
          qrContent = `WIFI:T:${security};S:${networkName};P:${password};H:false;;`;
        } else {
          qrContent = qrCode.content;
        }
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
        const wifiParts = qrCode.content.split(':');
        if (wifiParts.length >= 2) {
          const networkName = wifiParts[0];
          const password = wifiParts[1];
          const security = wifiParts[2] || 'WPA';
          qrContent = `WIFI:T:${security};S:${networkName};P:${password};H:false;;`;
        } else {
          qrContent = qrCode.content;
        }
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
        const wifiParts = qrCode.content.split(':');
        if (wifiParts.length >= 2) {
          const networkName = wifiParts[0];
          const password = wifiParts[1];
          const security = wifiParts[2] || 'WPA';
          qrContent = `WIFI:T:${security};S:${networkName};P:${password};H:false;;`;
        } else {
          qrContent = qrCode.content;
        }
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
        case "wifi":
          // WiFi QR codes should show instructions
          const wifiParts = qrCode.content.split(':');
          const networkName = escapeHtml(wifiParts[0] || 'Unknown Network');
          const password = escapeHtml(wifiParts[1] || '');
          return res.send(`<html><body><h1>WiFi Network</h1><p><strong>Network:</strong> ${networkName}</p><p><strong>Password:</strong> ${password}</p><p>Scan this QR code with your device to connect automatically.</p></body></html>`);
        case "vcard":
          // vCard content should be displayed
          return res.send(`<html><body><h1>Contact Information</h1><pre>${escapeHtml(qrCode.content)}</pre></body></html>`);
        case "text":
        default:
          // For text and other types, show the content
          return res.send(`<html><body><h1>QR Code Content</h1><p>${escapeHtml(qrCode.content)}</p></body></html>`);
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
