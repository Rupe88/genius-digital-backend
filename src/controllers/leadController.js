import { prisma } from '../config/database.js';

function safePageLimit(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function normalizePayload(body) {
  return {
    fullName: (body.fullName || '').trim(),
    email: (body.email || '').trim().toLowerCase(),
    phone: (body.phone || '').trim() || null,
    message: (body.message || '').trim() || null,
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : null,
  };
}

export const createNumerologyLead = async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body);
    const created = await prisma.numerologyLead.create({ data: payload });
    res.status(201).json({
      success: true,
      message: 'Numerology lead submitted successfully',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

export const getNumerologyLeads = async (req, res, next) => {
  try {
    const { page, limit, skip, take } = safePageLimit(req.query);
    const search = (req.query.search || req.query.q || '').trim();
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prisma.numerologyLead.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.numerologyLead.count({ where }),
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: total > 0 ? Math.ceil(total / limit) : 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCompassLead = async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body);
    const created = await prisma.compassLead.create({ data: payload });
    res.status(201).json({
      success: true,
      message: 'Compass lead submitted successfully',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

export const getCompassLeads = async (req, res, next) => {
  try {
    const { page, limit, skip, take } = safePageLimit(req.query);
    const search = (req.query.search || req.query.q || '').trim();
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prisma.compassLead.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.compassLead.count({ where }),
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: total > 0 ? Math.ceil(total / limit) : 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
