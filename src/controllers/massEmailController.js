import * as massEmailService from '../services/massEmailService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * GET /api/admin/mass-email/audience-count
 * Get recipient count for an audience (for preview before sending)
 */
export const getAudienceCount = asyncHandler(async (req, res) => {
  const { audience, courseId } = req.query;

  if (!audience || !['all_users', 'course_enrolled'].includes(audience)) {
    return res.status(400).json({
      success: false,
      message: 'Valid audience required: all_users or course_enrolled',
    });
  }

  if (audience === 'course_enrolled' && !courseId) {
    return res.status(400).json({
      success: false,
      message: 'courseId is required when audience is course_enrolled',
    });
  }

  const count = await massEmailService.getAudienceCount(audience, courseId || null);

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * POST /api/admin/mass-email/send
 * Send mass email to selected audience
 */
export const sendMassEmail = asyncHandler(async (req, res) => {
  const { subject, body, audience, courseId, linkUrl, linkText, batchSize, delayMs } = req.body;

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Subject is required',
    });
  }

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Email body is required',
    });
  }

  if (!audience || !['all_users', 'course_enrolled'].includes(audience)) {
    return res.status(400).json({
      success: false,
      message: 'Valid audience required: all_users or course_enrolled',
    });
  }

  if (audience === 'course_enrolled' && !courseId) {
    return res.status(400).json({
      success: false,
      message: 'courseId is required when audience is course_enrolled',
    });
  }

  const result = await massEmailService.sendMassEmail(
    subject.trim(),
    body.trim(),
    audience,
    courseId || null,
    (typeof linkUrl === 'string' && linkUrl.trim()) || null,
    (typeof linkText === 'string' && linkText.trim()) || null,
    Math.min(parseInt(batchSize, 10) || 10, 50),
    Math.min(parseInt(delayMs, 10) || 500, 2000)
  );

  res.json({
    success: true,
    message: `Email sent to ${result.sent} recipients${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
    data: result,
  });
});
