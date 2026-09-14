/**
 * MitigatePlus Email OTP Service (100% Free via Nodemailer & Gmail SMTP)
 */

const nodemailer = require('nodemailer');
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const sendEmailOTP = async (recipientEmail, otpCode) => {
  const gmailUser = process.env.GMAIL_USER || 'ellicaonggoco19@gmail.com';
  const gmailPass = process.env.GMAIL_APP_PASSWORD || 'hyokqixpcrowqhrt';

  if (!gmailUser || !gmailPass) {
    console.log(`[EMAIL OTP DEMO MODE] Target: ${recipientEmail} | OTP Code: ${otpCode}`);
    return { success: true, mode: 'demo', message: 'Email OTP logged in demo mode (Add GMAIL_USER and GMAIL_APP_PASSWORD to .env for real email sending)' };
  }

  const mailOptions = {
    from: `"MitigatePlus Manila LGU" <${gmailUser}>`,
    to: recipientEmail,
    subject: `[MitigatePlus] Your Account Verification Code: ${otpCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #EDEBE4; border-radius: 12px; background: #FAFAF7;">
        <h2 style="color: #173F56; margin-top: 0;">MitigatePlus - Manila City LGU</h2>
        <p style="color: #1B242B; font-size: 14px;">Your 6-digit account verification code is:</p>
        <div style="background: #173F56; color: #FFFFFF; font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 14px; text-align: center; border-radius: 8px; margin: 16px 0;">
          ${otpCode}
        </div>
        <p style="color: #6B7680; font-size: 12px;">This code will expire in 10 minutes. Please do not share this code with anyone.</p>
      </div>
    `,
  };

  // Priority 1: HTTPS Webhook Relay (Bypasses cloud firewall & blocked SMTP ports 25, 465, 587)
  const webhookUrl = process.env.GMAIL_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbyIARONpL_G_XSG34s_XE0cLZi4nGm2N0iC9RfZBRhwpVFW-0dTYNLQIgnCPplW1VxSrw/exec';
  if (webhookUrl) {
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `[MitigatePlus] Your Account Verification Code: ${otpCode}`,
          otpCode,
          html: mailOptions.html,
        }),
        redirect: 'follow',
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok || data.success) {
        console.log(`[EMAIL SENT - HTTPS RELAY] Dispatched OTP to ${recipientEmail} via Webhook:`, data);
        return { success: true, mode: 'live', relay: 'https', data };
      }
      console.warn('[EMAIL WEBHOOK FAILED]', data);
    } catch (whErr) {
      console.warn(`[EMAIL WEBHOOK EXCEPTION] ${whErr.message}. Falling back to SMTP...`);
    }
  }

  // Priority 2: Port 465 (SSL) with forced IPv4
  try {
    const transporter465 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      family: 4,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
    const info = await transporter465.sendMail(mailOptions);
    console.log(`[EMAIL SENT - PORT 465] Successfully dispatched OTP to ${recipientEmail}:`, info.messageId);
    return { success: true, mode: 'live', port: 465, messageId: info.messageId };
  } catch (err465) {
    console.warn(`[EMAIL PORT 465 FAILED] ${err465.message}. Trying port 587...`);
    // Attempt 2: Port 587 (STARTTLS) with forced IPv4
    try {
      const transporter587 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        family: 4,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
      const info = await transporter587.sendMail(mailOptions);
      console.log(`[EMAIL SENT - PORT 587] Successfully dispatched OTP to ${recipientEmail}:`, info.messageId);
      return { success: true, mode: 'live', port: 587, messageId: info.messageId };
    } catch (err587) {
      console.error(`[EMAIL EXCEPTION] Failed on both ports: 465(${err465.message}), 587(${err587.message})`);
      return { success: false, mode: 'live', error: `465: ${err465.message} | 587: ${err587.message}` };
    }
  }
};

module.exports = { sendEmailOTP };
