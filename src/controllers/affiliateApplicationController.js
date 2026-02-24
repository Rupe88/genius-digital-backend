import { prisma } from '../config/database.js';

function safePageLimit(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
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
 * Public: Submit affiliate application form
 */
export const submitApplication = async (req, res, next) => {
  try {
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

    const delegate = getAffiliateApplicationDelegate();
    const application = await delegate.create({
      data: {
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

    const where = {};
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
