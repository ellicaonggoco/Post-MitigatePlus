/**
 * MitigatePlus Email OTP Service (100% Free via Nodemailer & Gmail SMTP)
 */

const nodemailer = require('nodemailer');

const sendEmailOTP = async (recipientEmail, otpCode) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass || gmailUser === 'your_gmail@gmail.com') {
    console.log(`[EMAIL OTP DEMO MODE] Target: ${recipientEmail} | OTP Code: ${otpCode}`);
    return { success: true, mode: 'demo', message: 'Email OTP logged in demo mode (Add GMAIL_USER and GMAIL_APP_PASSWORD to .env for real email sending)' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const mailOptions = {
      from: `"MitigatePlus Manila LGU" <${gmailUser}>`,
      to: recipientEmail,
      subject: `[MitigatePlus] Your Account Verification Code: ${otpCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #EDEBE4; border-radius: 12px; background: #FAFAF7;">
          <h2 style="color: #173F56; margin-top: 0;">MitigatePlus — Manila City LGU</h2>
          <p style="color: #1B242B; font-size: 14px;">Your 6-digit account verification code is:</p>
          <div style="background: #173F56; color: #FFFFFF; font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 14px; text-align: center; border-radius: 8px; margin: 16px 0;">
            ${otpCode}
          </div>
          <p style="color: #6B7680; font-size: 12px;">This code will expire in 10 minutes. Please do not share this code with anyone.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SENT] Successfully dispatched OTP to ${recipientEmail}:`, info.messageId);
    return { success: true, mode: 'live', messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL EXCEPTION] Failed to send email OTP:`, error.message);
    return { success: false, mode: 'live', error: error.message };
  }
};

module.exports = { sendEmailOTP };
