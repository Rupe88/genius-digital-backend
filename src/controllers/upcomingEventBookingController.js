import { prisma } from '../config/database.js';

function getBookingDelegate() {
  const delegate = prisma.upcomingEventBooking;
  if (!delegate) {
    const err = new Error(
      'UpcomingEventBooking model not in Prisma client. Run: npx prisma generate && restart the server.'
    );
    err.statusCode = 503;
    throw err;
  }
  return delegate;
}

function safePageLimit(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/**
 * Public: Submit Book Now form (event or course).
 * Body: { eventId?, courseId?, name, email, phone, referralSource?, message? }
 * Exactly one of eventId or courseId required.
 */
export const createBooking = async (req, res, next) => {
  try {
    const { eventId, courseId, name, email, phone, referralSource, message } = req.body;

    const hasEvent = eventId && typeof eventId === 'string' && eventId.trim();
    const hasCourse = courseId && typeof courseId === 'string' && courseId.trim();
    if (!hasEvent && !hasCourse) {
      return res.status(400).json({
        success: false,
        message: 'Please select an event or a course.',
      });
    }
    if (hasEvent && hasCourse) {
      return res.status(400).json({
        success: false,
        message: 'Select either an event or a course, not both.',
      });
    }

    const regName = (name || '').trim();
    const regEmail = (email || '').trim();
    const regPhone = (phone || '').trim();
    if (!regName) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (!regEmail) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!regPhone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (hasEvent) {
      const event = await prisma.event.findUnique({
        where: { id: eventId.trim() },
      });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      if (!['UPCOMING', 'ONGOING'].includes(event.status)) {
        return res.status(400).json({
          success: false,
          message: 'This event is not open for booking.',
        });
      }
    }

    if (hasCourse) {
      const course = await prisma.course.findUnique({
        where: { id: courseId.trim() },
      });
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found.' });
      }
      if (course.status !== 'UPCOMING_EVENTS') {
        return res.status(400).json({
          success: false,
          message: 'This course is not listed as an upcoming event.',
        });
      }
    }

    const delegate = getBookingDelegate();
    const existingWhere = hasEvent
      ? { email: regEmail, eventId: eventId.trim() }
      : { email: regEmail, courseId: courseId.trim() };
    const existing = await delegate.findFirst({
      where: existingWhere,
    });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Already booked. We will contact you soon.',
        alreadyBooked: true,
      });
    }

    const booking = await delegate.create({
      data: {
        eventId: hasEvent ? eventId.trim() : null,
        courseId: hasCourse ? courseId.trim() : null,
        name: regName,
        email: regEmail,
        phone: regPhone,
        referralSource: (referralSource || '').trim() || null,
        message: (message || '').trim() || null,
      },
      include: {
        event: { select: { id: true, title: true, startDate: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Booking submitted successfully. We will contact you soon.',
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: List all upcoming event bookings with pagination and filters.
 */
export const getAllBookings = async (req, res, next) => {
  try {
    const { page, limit, skip, take } = safePageLimit(req.query);
    const search = (req.query.search || req.query.q || '').trim();
    const typeFilter = (req.query.type || '').trim().toUpperCase(); // EVENT | COURSE
    const referralSource = (req.query.referralSource || '').trim() || null;

    const where = {};
    if (typeFilter === 'EVENT') where.eventId = { not: null };
    if (typeFilter === 'COURSE') where.courseId = { not: null };
    if (referralSource) where.referralSource = referralSource;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { event: { title: { contains: search, mode: 'insensitive' } } },
        { course: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const delegate = getBookingDelegate();
    const [bookings, total] = await Promise.all([
      delegate.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { id: true, title: true, slug: true, startDate: true } },
          course: { select: { id: true, title: true, slug: true } },
        },
      }),
      delegate.count({ where }),
    ]);

    res.json({
      success: true,
      data: bookings,
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
