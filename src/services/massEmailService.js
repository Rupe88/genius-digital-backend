import { prisma } from '../config/database.js';
import { sendEmail } from './emailService.js';
import { config } from '../config/env.js';

const EMAIL_PRIMARY = '#be123c';
const EMAIL_BACKGROUND = '#f9fafb';
const EMAIL_TEXT = '#0f172a';

const AUDIENCE_ALL_USERS = 'all_users';
const AUDIENCE_COURSE_ENROLLED = 'course_enrolled';

/**
 * Get recipient count for an audience (without fetching all emails)
 */
export const getAudienceCount = async (audience, courseId = null) => {
  if (audience === AUDIENCE_ALL_USERS) {
    return prisma.user.count({
      where: { isActive: true },
    });
  }
  if (audience === AUDIENCE_COURSE_ENROLLED && courseId) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        status: 'ACTIVE',
      },
      include: { user: { select: { email: true } } },
      distinct: ['userId'],
    });
    return enrollments.length;
  }
  return 0;
};

/**
 * Get list of email recipients for an audience
 */
export const getRecipients = async (audience, courseId = null) => {
  const recipients = [];

  if (audience === AUDIENCE_ALL_USERS) {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { email: true, fullName: true },
    });
    users.forEach((u) => recipients.push({ email: u.email, fullName: u.fullName }));
  } else if (audience === AUDIENCE_COURSE_ENROLLED && courseId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      include: { user: { select: { email: true, fullName: true } } },
      distinct: ['userId'],
    });
    enrollments.forEach((e) =>
      recipients.push({ email: e.user.email, fullName: e.user.fullName })
    );
  }

  // Deduplicate by email
  const seen = new Set();
  return recipients.filter((r) => {
    const key = r.email.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Wrap plain/HTML body in branded template
 */
const wrapInTemplate = (body) => {
  const isHtml = body.trim().startsWith('<');
  const content = isHtml ? body : `<p style="white-space: pre-wrap; color:${EMAIL_TEXT};">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:${EMAIL_BACKGROUND};">
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:${EMAIL_TEXT}; max-width:600px; margin:0 auto; padding:24px;">
    <div style="background:${EMAIL_PRIMARY}; padding:20px 24px; text-align:center; border-radius:12px 12px 0 0;">
      <h1 style="color:#ffffff; margin:0; font-size:18px; letter-spacing:0.1em;">${config.appName}</h1>
    </div>
    <div style="background:#ffffff; padding:24px; border-radius:0 0 12px 12px; border:1px solid #e5e7eb;">
      ${content}
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0 12px;">
      <p style="color:#9ca3af; font-size:11px; text-align:center; margin:0;">
        © ${new Date().getFullYear()} Sanskar Vastu · ${config.appName}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Send mass email in batches to avoid rate limits
 */
export const sendMassEmail = async (
  subject,
  body,
  audience,
  courseId = null,
  batchSize = 10,
  delayMs = 500
) => {
  const recipients = await getRecipients(audience, courseId);
  if (recipients.length === 0) {
    return { sent: 0, failed: 0, errors: ['No recipients found for the selected audience'] };
  }

  const html = wrapInTemplate(body);
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (r) => {
        try {
          await sendEmail(r.email, subject, html);
          sent++;
        } catch (err) {
          failed++;
          errors.push(`${r.email}: ${err.message}`);
        }
      })
    );
    if (i + batchSize < recipients.length) {
      await delay(delayMs);
    }
  }

  return { sent, failed, total: recipients.length, errors: errors.slice(0, 20) };
};

export { AUDIENCE_ALL_USERS, AUDIENCE_COURSE_ENROLLED };
