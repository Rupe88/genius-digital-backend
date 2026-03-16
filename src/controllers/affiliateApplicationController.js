import { prisma } from '../config/database.js';
import { validationResult } from 'express-validator';

function safePageLimit(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function generateAffiliateCode(userId) {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AFF${String(userId).substring(0, 8).toUpperCase()}${random}`;
}

function getAffiliateApplicationDelegate() {
  const delegate = prisma.affiliateApplication;
  if (!delegate) {
    const err = new Error(
      'AffiliateApplication model not in Prisma client. Run: npx prisma generate && restart the server.'
    );
    err.statusCode = 503;
    throw err;
  }
  return delegate;
}

/**
 * User: Submit affiliate application form
 */
export const submitApplication = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      country,
      city,
      currentOccupation,
      hasAffiliateExperience,
      experienceDetails,
      occultKnowledge,
      occultOther,
      whyJoin,
    } = req.body;

    const name = (fullName || '').trim();
    const regEmail = (email || '').trim();
    const regPhone = (phone || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!regEmail) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!regPhone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const userId = req.user?.id || null;

    const delegate = getAffiliateApplicationDelegate();
    const application = await delegate.create({
      data: {
        ...(userId && { userId }),
        fullName: name,
        email: regEmail,
        phone: regPhone,
        dateOfBirth: (dateOfBirth || '').trim() || null,
        country: (country || '').trim() || null,
        city: (city || '').trim() || null,
        currentOccupation: (currentOccupation || '').trim() || null,
        hasAffiliateExperience: hasAffiliateExperience === true || hasAffiliateExperience === 'true',
        experienceDetails: (experienceDetails || '').trim() || null,
        occultKnowledge: (occultKnowledge || '').trim() || null,
        occultOther: (occultOther || '').trim() || null,
        whyJoin: (whyJoin || '').trim() || null,
      },
    });

    // Ensure the user has an affiliate record (kept PENDING until admin approval).
    if (userId) {
      const existing = await prisma.affiliate.findUnique({ where: { userId } });
      if (!existing) {
        // Handle rare code collisions by retrying.
        let created = null;
        for (let i = 0; i < 5 && !created; i += 1) {
          try {
            created = await prisma.affiliate.create({
              data: {
                userId,
                affiliateCode: generateAffiliateCode(userId),
                status: 'PENDING',
                commissionRate: 10.0,
              },
            });
          } catch (e) {
            if (e && e.code === 'P2002') continue;
            throw e;
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. We will contact you soon.',
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: List all affiliate applications
 */
export const getAllApplications = async (req, res, next) => {
  try {
    const { page, limit, skip, take } = safePageLimit(req.query);
    const search = (req.query.search || req.query.q || '').trim();
    const status = (req.query.status || '').trim();

    const where = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { currentOccupation: { contains: search, mode: 'insensitive' } },
        { whyJoin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const delegate = getAffiliateApplicationDelegate();
    const [applications, total] = await Promise.all([
      delegate.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      delegate.count({ where }),
    ]);

    res.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total,
        pages: total > 0 ? Math.ceil(total / limit) : 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Approve/Reject an application and update affiliate status
 */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user?.id || null;

    const delegate = getAffiliateApplicationDelegate();
    const existing = await delegate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const updated = await delegate.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        ...(adminId && { reviewedById: adminId }),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (updated.userId) {
      const userId = updated.userId;
      const affiliate = await prisma.affiliate.findUnique({ where: { userId } });

      if (affiliate) {
        await prisma.affiliate.update({
          where: { userId },
          data: { status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED' },
        });
      } else if (status === 'APPROVED') {
        let created = null;
        for (let i = 0; i < 5 && !created; i += 1) {
          try {
            created = await prisma.affiliate.create({
              data: {
                userId,
                affiliateCode: generateAffiliateCode(userId),
                status: 'APPROVED',
                commissionRate: 10.0,
              },
            });
          } catch (e) {
            if (e && e.code === 'P2002') continue;
            throw e;
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Application ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
