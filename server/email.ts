/**
 * Email utility for QR Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Configure the following env vars to enable real email delivery:
 *
 *   SMTP_HOST       e.g. smtp.sendgrid.net | smtp.gmail.com
 *   SMTP_PORT       e.g. 587 (STARTTLS) or 465 (SSL)
 *   SMTP_SECURE     "true" for SSL (port 465), leave empty for STARTTLS
 *   SMTP_USER       your SMTP username / API key username
 *   SMTP_PASS       your SMTP password / API key
 *   EMAIL_FROM      e.g. "QR Manager <no-reply@yourdomain.com>"
 *
 * Popular providers:
 *   • SendGrid  — host: smtp.sendgrid.net, user: "apikey", pass: your_api_key
 *   • Gmail     — host: smtp.gmail.com, port: 587, user: your@gmail.com, pass: app-password
 *   • Resend    — host: smtp.resend.com, port: 465, secure: true, user: "resend", pass: api_key
 *   • Brevo     — host: smtp-relay.brevo.com, port: 587
 */

import nodemailer from "nodemailer";

// ── Transporter factory ───────────────────────────────────────────────────────

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "[email] SMTP not configured — emails will only log to console. " +
      "Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable real delivery."
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

const transporter = createTransporter();

// ── Public send helper ────────────────────────────────────────────────────────

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM || "QR Manager <no-reply@qrmanager.app>";

  if (!transporter) {
    // Not configured — just log so dev/staging never silently drop events
    console.log(
      `[email] Would send to <${options.to}>\n` +
      `  Subject: ${options.subject}\n` +
      `  Body (text): ${options.text || "(html only)"}`
    );
    return;
  }

  await transporter.sendMail({ from, ...options });
}

// ── Email templates ───────────────────────────────────────────────────────────

export function buildPasswordResetEmail(resetUrl: string, username: string) {
  const subject = "Reset your QR Manager password";

  const text =
    `Hi ${username},\n\n` +
    `You requested a password reset for your QR Manager account.\n\n` +
    `Click the link below to set a new password (valid for 1 hour):\n\n` +
    `${resetUrl}\n\n` +
    `If you didn't request this, you can safely ignore this email.\n\n` +
    `– The QR Manager team`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                     xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
                  <rect x="3" y="3" width="8" height="8" rx="1" fill="white"/>
                  <rect x="5" y="5" width="4" height="4" fill="#4f46e5"/>
                  <rect x="13" y="3" width="8" height="8" rx="1" fill="white"/>
                  <rect x="15" y="5" width="4" height="4" fill="#4f46e5"/>
                  <rect x="3" y="13" width="8" height="8" rx="1" fill="white"/>
                  <rect x="5" y="15" width="4" height="4" fill="#4f46e5"/>
                  <rect x="13" y="13" width="4" height="4" fill="white"/>
                  <rect x="19" y="13" width="2" height="2" fill="white"/>
                  <rect x="13" y="19" width="2" height="2" fill="white"/>
                  <rect x="17" y="17" width="4" height="4" rx="1" fill="white"/>
                </svg>
                <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                  QR-Generator-Pro
                </span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
                Reset your password
              </h1>
              <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
                Hi <strong style="color:#374151;">${username}</strong>,<br/>
                We received a request to reset the password for your QR Manager account.
                Click the button below — the link is valid for <strong>1 hour</strong>.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;
                              color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.1px;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#4f46e5;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;">
              <p style="margin:0;font-size:12px;color:#d1d5db;line-height:1.7;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will not be changed until you click the link above.<br/><br/>
                © ${new Date().getFullYear()} QR Manager. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { subject, text, html };
}
