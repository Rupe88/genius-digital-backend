import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config/env.js';

// Shared email styles aligned with Sanskar Vastu theme
const EMAIL_PRIMARY = '#be123c'; // approx frontend primary-700
const EMAIL_PRIMARY_DARK = '#9f1239'; // deeper shade for hover/accents
const EMAIL_PRIMARY_LIGHT = '#fee2e2'; // light tint
const EMAIL_TEXT = '#0f172a';
const EMAIL_BACKGROUND = '#f9fafb';

let transporter = null;
let resendClient = null;

/** Check if any email service is configured */
export const isEmailConfigured = () => {
  const hasSmtp = config.smtpUser?.trim() && config.smtpPass?.trim();
  const hasResend = config.resendApiKey?.trim();
  return Boolean(hasSmtp || hasResend);
};

// Initialize Nodemailer transporter (only when SMTP credentials exist)
const initNodemailer = () => {
  if (!transporter) {
    if (!config.smtpUser?.trim() || !config.smtpPass?.trim()) {
      throw new Error('SMTP credentials (SMTP_USER, SMTP_PASS) are not configured');
    }
    const port = config.smtpPort || 587;
    transporter = nodemailer.createTransport({
      host: config.smtpHost || 'smtp.gmail.com',
      port,
      secure: port === 465, // Gmail: 465 = SSL, 587 = STARTTLS
      auth: {
        user: config.smtpUser.trim(),
        pass: config.smtpPass.trim(),
      },
    });
  }
  return transporter;
};

// Initialize Resend client
const initResend = () => {
  if (!resendClient && config.resendApiKey?.trim()) {
    resendClient = new Resend(config.resendApiKey.trim());
  }
  return resendClient;
};

// Email templates
const getOTPEmailTemplate = (otp, purpose = 'verification') => {
  const purposeText = purpose === 'password_reset' ? 'reset your password' : 'verify your email';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sanskar Vastu - OTP Verification</title>
    </head>
    <body style="margin:0; padding:0; background:${EMAIL_BACKGROUND};">
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:${EMAIL_TEXT}; max-width:600px; margin:0 auto; padding:24px;">
        <!-- Header -->
        <div style="background:${EMAIL_PRIMARY}; padding:24px 28px; text-align:center; border-radius:16px 16px 0 0;">
          <h1 style="color:#ffffff; margin:0; font-size:22px; letter-spacing:0.12em; text-transform:uppercase;">
            Sanskar Vastu
          </h1>
          <p style="color:#ffe4e6; margin:8px 0 0; font-size:13px;">
            ${config.appName}
          </p>
        </div>

        <!-- Card -->
        <div style="background:#ffffff; padding:24px 28px 28px; border-radius:0 0 16px 16px; border:1px solid #e5e7eb;">
          <h2 style="color:${EMAIL_TEXT}; margin:0 0 8px; font-size:18px;">
            OTP Verification
          </h2>
          <p style="margin:0 0 4px; font-size:14px; color:#4b5563;">
            Namaste,
          </p>
          <p style="margin:0 0 12px; font-size:14px; color:#4b5563;">
            You requested to ${purposeText}. Use the one-time password below to complete this step securely.
          </p>

          <div style="
            margin:20px 0 18px;
            padding:20px 24px;
            border-radius:12px;
            border:2px dashed ${EMAIL_PRIMARY};
            background:${EMAIL_PRIMARY_LIGHT};
            text-align:center;
          ">
            <p style="margin:0 0 6px; font-size:12px; text-transform:uppercase; letter-spacing:0.2em; color:${EMAIL_PRIMARY_DARK};">
              Your OTP
            </p>
            <h1 style="
              margin:0;
              color:${EMAIL_PRIMARY};
              font-size:32px;
              letter-spacing:0.4em;
              font-weight:700;
            ">
              ${otp}
            </h1>
          </div>

          <p style="color:#6b7280; font-size:13px; margin:0 0 6px;">
            This OTP is valid for <strong>5 minutes</strong>. For your security, do not share it with anyone.
          </p>
          <p style="color:#9ca3af; font-size:12px; margin:12px 0 0;">
            If you did not initiate this request, you can safely ignore this email and your account will remain secure.
          </p>

          <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0 16px;">
          <p style="color:#9ca3af; font-size:11px; text-align:center; margin:0;">
            © ${new Date().getFullYear()} Sanskar Vastu · ${config.appName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getWelcomeEmailTemplate = (fullName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Sanskar Vastu</title>
    </head>
    <body style="margin:0; padding:0; background:${EMAIL_BACKGROUND};">
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:${EMAIL_TEXT}; max-width:600px; margin:0 auto; padding:24px;">
        <!-- Header -->
        <div style="background:${EMAIL_PRIMARY}; padding:24px 28px; text-align:center; border-radius:16px 16px 0 0;">
          <h1 style="color:#ffffff; margin:0; font-size:22px; letter-spacing:0.12em; text-transform:uppercase;">
            Sanskar Vastu
          </h1>
          <p style="color:#ffe4e6; margin:8px 0 0; font-size:13px;">
            ${config.appName}
          </p>
        </div>

        <!-- Card -->
        <div style="background:#ffffff; padding:24px 28px 28px; border-radius:0 0 16px 16px; border:1px solid #e5e7eb;">
          <h2 style="color:${EMAIL_TEXT}; margin:0 0 8px; font-size:18px;">
            Welcome, ${fullName}!
          </h2>
          <p style="margin:0 0 10px; font-size:14px; color:#4b5563;">
            Thank you for joining <strong>Sanskar Vastu</strong>. Your email has been successfully verified.
          </p>
          <p style="margin:0 0 16px; font-size:14px; color:#4b5563;">
            You now have access to all the learning experiences and resources on ${config.appName}. We’re excited to support your journey.
          </p>

          <div style="text-align:center; margin:26px 0 10px;">
            <a
              href="${config.frontendUrl}/login"
              style="
                background:${EMAIL_PRIMARY};
                color:#ffffff;
                padding:12px 32px;
                text-decoration:none;
                border-radius:999px;
                display:inline-block;
                font-size:14px;
                font-weight:600;
                letter-spacing:0.08em;
                text-transform:uppercase;
              "
            >
              Get Started
            </a>
          </div>

          <p style="margin:0 0 0; font-size:13px; color:#6b7280; text-align:center;">
            You can log in anytime at
            <a href="${config.frontendUrl}" style="color:${EMAIL_PRIMARY_DARK}; text-decoration:none;">
              ${config.frontendUrl}
            </a>.
          </p>

          <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0 16px;">
          <p style="color:#9ca3af; font-size:11px; text-align:center; margin:0;">
            © ${new Date().getFullYear()} Sanskar Vastu · ${config.appName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send email using Nodemailer
const sendWithNodemailer = async (to, subject, html) => {
  try {
    const transporter = initNodemailer();
    const mailOptions = {
      from: `"${config.appName}" <${config.smtpFrom || config.smtpUser}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId, method: 'nodemailer' };
  } catch (error) {
    throw new Error(`Nodemailer error: ${error.message}`);
  }
};

// Send email using Resend (fallback)
const sendWithResend = async (to, subject, html) => {
  try {
    const resend = initResend();
    if (!resend) {
      throw new Error('Resend API key not configured');
    }

    // Resend requires verified domain. Set RESEND_FROM_EMAIL (e.g. noreply@yourdomain.com)
    const fromEmail =
      config.resendFromEmail?.trim() || config.smtpFrom?.trim() || config.smtpUser?.trim() || 'noreply@sanskaracademy.com';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    return { success: true, messageId: data.id, method: 'resend' };
  } catch (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
};

// Main send email function with fallback (tries Resend first when configured, then SMTP)
export const sendEmail = async (to, subject, html) => {
  const hasResend = config.resendApiKey?.trim();
  const hasSmtp = config.smtpUser?.trim() && config.smtpPass?.trim();

  if (!hasResend && !hasSmtp) {
    console.error('[Email] No email service configured. Set RESEND_API_KEY or SMTP_USER+SMTP_PASS.');
    throw new Error('Email service is not configured. Please contact support.');
  }

  let lastError = null;

  // Try Resend first (often more reliable, no port/firewall issues)
  if (hasResend) {
    try {
      const result = await sendWithResend(to, subject, html);
      console.log('[Email] Sent successfully via Resend to', to);
      return result;
    } catch (error) {
      lastError = error;
      console.warn('[Email] Resend failed for', to, ':', error.message);
    }
  }

  // Fallback to Nodemailer (SMTP)
  if (hasSmtp) {
    try {
      const result = await sendWithNodemailer(to, subject, html);
      console.log('[Email] Sent successfully via SMTP to', to);
      return result;
    } catch (error) {
      lastError = error;
      console.warn('[Email] SMTP failed for', to, ':', error.message);
    }
  }

  const msg = lastError?.message || 'Unknown error';
  console.error('[Email] All services failed for', to, ':', msg);
  throw new Error(`Failed to send email. ${msg}`);
};

// Specific email functions
export const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  console.log('[Email] Sending OTP to', email);
  const subject = purpose === 'password_reset'
    ? 'Password Reset OTP'
    : 'Email Verification OTP';
  const html = getOTPEmailTemplate(otp, purpose);
  return await sendEmail(email, subject, html);
};

export const sendWelcomeEmail = async (email, fullName) => {
  const subject = `Welcome to ${config.appName}!`;
  const html = getWelcomeEmailTemplate(fullName);
  return await sendEmail(email, subject, html);
};

