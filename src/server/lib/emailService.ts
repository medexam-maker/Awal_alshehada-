import nodemailer from 'nodemailer';

export interface SendResetEmailParams {
  toEmail: string;
  resetCode: string;
  recipientName?: string | null;
}

export interface SendResult {
  sent: boolean;
  messageId?: string;
  reason?: 'SMTP_NOT_CONFIGURED' | 'DISPATCH_ERROR' | 'INVALID_RECIPIENT';
  error?: string;
}

/**
 * Checks if Gmail SMTP credentials are configured in the environment.
 * Requires SMTP_PASS to be non-empty.
 */
export function isSmtpConfigured(): boolean {
  const pass = process.env.SMTP_PASS;
  return Boolean(pass && pass.trim().length > 0);
}

/**
 * Returns safe SMTP diagnostic details without exposing secrets or passwords.
 */
export function getSmtpConfigStatus() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || 'awalalshehada2027@gmail.com';
  const from = process.env.SMTP_FROM || `"أول الشهادة" <${user}>`;
  const secure = process.env.SMTP_SECURE === 'true';
  const passConfigured = Boolean(process.env.SMTP_PASS && process.env.SMTP_PASS.trim().length > 0);

  return {
    configured: passConfigured,
    host,
    port,
    user,
    from,
    secure,
  };
}

/**
 * Masks an email for safe diagnostic logging (e.g., s***t@example.com).
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const maskedLocal =
    local.length <= 2
      ? `${local[0]}*`
      : `${local[0]}${'*'.repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Creates a Nodemailer transporter using Gmail SMTP settings.
 */
export function createMailTransporter() {
  const config = getSmtpConfigStatus();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // false for port 587 with STARTTLS
    auth: {
      user: config.user,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Formats the Arabic HTML template for the password reset email.
 */
export function buildResetEmailHtml(resetCode: string, recipientName?: string | null): string {
  const greeting = recipientName ? `مرحباً بك يا ${recipientName}،` : 'مرحباً بك،';
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رمز استعادة كلمة المرور</title>
</head>
<body style="margin: 0; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; direction: rtl; text-align: right;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #059669 0%, #0f766e 100%); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">منصة أول الشهادة</h1>
        <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 14px; font-weight: 500;">امتحانات وتدريبات الشهادة السودانية</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a;">طلب استعادة كلمة المرور</h2>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.7; color: #475569;">
          ${greeting}<br>
          لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منصة <strong>أول الشهادة</strong>. استخدم رمز التحقق التالي لإتمام العملية:
        </p>

        <!-- Reset Code Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
          <tr>
            <td style="background-color: #ecfdf5; border: 2px dashed #10b981; border-radius: 14px; padding: 20px; text-align: center;">
              <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #065f46; direction: ltr;">
                ${resetCode}
              </div>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #047857; font-weight: 600;">
                صالح لمدة 15 دقيقة فقط
              </p>
            </td>
          </tr>
        </table>

        <!-- Security Warnings -->
        <div style="background-color: #fef2f2; border-right: 4px solid #ef4444; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #991b1b; font-weight: 600;">
            تنبيه أمني هام:
          </p>
          <p style="margin: 4px 0 0 0; font-size: 12px; line-height: 1.6; color: #7f1d1d;">
            لا تشارك هذا الرمز مطلقاً مع أي شخص. فريق دعم «أول الشهادة» لن يطلب منك هذا الرمز تحت أي ظرف.
          </p>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.6; color: #64748b;">
          إذا لم تكن قد طلبت استعادة كلمة المرور بنفسك، يرجى تجاهل هذه الرسالة؛ ستبقى كلمة مرورك الحالية آمنة دون أي تغيير.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          هذه رسالة آلية تم إرسالها من منصة أول الشهادة.<br>
          © 2026 أول الشهادة — منصة التحضير الذكي للشهادة السودانية
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the plain text version of the password reset email.
 */
export function buildResetEmailText(resetCode: string, recipientName?: string | null): string {
  const greeting = recipientName ? `مرحباً بك يا ${recipientName}،` : 'مرحباً بك،';
  return `${greeting}

لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منصة أول الشهادة.

رمز التحقق الخاص بك هو: ${resetCode}
صلاحية الرمز: 15 دقيقة فقط.

تنبيه أمني: لا تشارك هذا الرمز مع أي شخص. لن يطلب منك فريق الدعم هذا الرمز أبداً.

إذا لم تقم بطلب استعادة كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.

منصة أول الشهادة — منصة التحضير الذكي للشهادة السودانية
`;
}

/**
 * Dispatches a password reset email via Gmail SMTP.
 */
export async function sendPasswordResetEmail({
  toEmail,
  resetCode,
  recipientName,
}: SendResetEmailParams): Promise<SendResult> {
  if (!isSmtpConfigured()) {
    console.log(
      `[emailService] Diagnostic: SMTP not configured (SMTP_PASS is not set). Skipping delivery to ${maskEmail(toEmail)}.`
    );
    return {
      sent: false,
      reason: 'SMTP_NOT_CONFIGURED',
      error: 'SMTP_PASS environment variable is not configured',
    };
  }

  try {
    const config = getSmtpConfigStatus();
    const transporter = createMailTransporter();

    const mailOptions = {
      from: config.from,
      to: toEmail,
      subject: 'رمز استعادة كلمة المرور — منصة أول الشهادة',
      text: buildResetEmailText(resetCode, recipientName),
      html: buildResetEmailHtml(resetCode, recipientName),
    };

    const info = await transporter.sendMail(mailOptions);

    const accepted = Array.isArray(info.accepted) && info.accepted.length > 0;
    if (accepted) {
      console.log(
        `[emailService] Password reset email successfully accepted for delivery to ${maskEmail(toEmail)} (messageId: ${info.messageId}).`
      );
      return {
        sent: true,
        messageId: info.messageId,
      };
    } else {
      console.warn(
        `[emailService] Warning: SMTP accepted list was empty for ${maskEmail(toEmail)}.`
      );
      return {
        sent: false,
        reason: 'DISPATCH_ERROR',
        error: 'SMTP provider did not accept recipient address',
      };
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const sanitizedError = errMessage.replace(process.env.SMTP_PASS || '___', '[REDACTED]');
    console.error(
      `[emailService] Error: Failed to send password reset email to ${maskEmail(toEmail)}: ${sanitizedError}`
    );
    return {
      sent: false,
      reason: 'DISPATCH_ERROR',
      error: sanitizedError,
    };
  }
}
