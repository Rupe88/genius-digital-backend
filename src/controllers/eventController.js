import { prisma } from '../config/database.js';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function safePageLimit(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function parseEventBody(body) {
  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate =
    body.endDate !== undefined && body.endDate !== ''
      ? new Date(body.endDate)
      : undefined;
  const price =
    body.price !== undefined && body.price !== ''
      ? parseFloat(body.price)
      : undefined;
  const isFree = body.isFree === true || body.isFree === 'true';
  const maxAttendees =
    body.maxAttendees !== undefined && body.maxAttendees !== ''
      ? parseInt(body.maxAttendees, 10)
      : undefined;
  const featured = body.featured === true || body.featured === 'true';
  return { startDate, endDate, price, isFree, maxAttendees, featured };
}

const EVENT_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  shortDescription: true,
  image: true,
  venue: true,
  location: true,
  startDate: true,
  endDate: true,
  price: true,
  isFree: true,
  maxAttendees: true,
  status: true,
  featured: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { registrations: true } },
};

// -----------------------------------------------------------------------------
// Public: List events
// -----------------------------------------------------------------------------

export const getAllEvents = async (req, res, next) => {
  try {
    const { status, featured, upcoming, past } = req.query;
    const { page, limit, skip, take } = safePageLimit(req.query);

    const where = {};
    if (status) where.status = status;
    if (featured === 'true') where.featured = true;
    if (upcoming === 'true') {
      where.startDate = { gte: new Date() };
      where.status = { in: ['UPCOMING', 'ONGOING'] };
    }
    if (past === 'true') {
      where.endDate = { lt: new Date() };
      where.status = { in: ['COMPLETED', 'CANCELLED'] };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: { startDate: 'asc' },
        select: EVENT_LIST_SELECT,
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      success: true,
      data: events,
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

// -----------------------------------------------------------------------------
// Public: Get single event by id or slug
// -----------------------------------------------------------------------------

export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    let isRegistered = false;
    if (req.user?.id || req.user?.email) {
      const reg = await prisma.eventRegistration.findFirst({
        where: {
          eventId: event.id,
          OR: [
            ...(req.user?.id ? [{ userId: req.user.id }] : []),
            ...(req.user?.email ? [{ email: req.user.email }] : []),
          ],
        },
      });
      isRegistered = !!reg;
    }

    res.json({
      success: true,
      data: { ...event, isRegistered },
    });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Admin: Create event (image via upload only: req.cloudinary?.url)
// -----------------------------------------------------------------------------

export const createEvent = async (req, res, next) => {
  try {
    const body = req.body;
    const { title, slug, description, shortDescription, venue, location } = body;
    const { startDate, endDate, price, isFree, maxAttendees, featured } = parseEventBody(body);

    const existing = await prisma.event.findUnique({
      where: { slug },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Event with this slug already exists',
      });
    }

    const imageUrl = req.cloudinary?.url ?? null;

    const event = await prisma.event.create({
      data: {
        title,
        slug,
        description: description ?? null,
        shortDescription: shortDescription ?? null,
        image: imageUrl,
        venue: venue ?? null,
        location: location ?? null,
        startDate,
        endDate: endDate ?? null,
        price: price ?? 0,
        isFree: isFree ?? false,
        maxAttendees: maxAttendees ?? null,
        status: 'UPCOMING',
        featured: featured ?? false,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Admin: Update event (image via upload only; omit to keep existing)
// -----------------------------------------------------------------------------

export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const event = await prisma.event.findUnique({
      where: { id },
    });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const slug = body.slug?.trim();
    if (slug && slug !== event.slug) {
      const existing = await prisma.event.findUnique({
        where: { slug },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Event with this slug already exists',
        });
      }
    }

    const { startDate, endDate, price, isFree, maxAttendees, featured } = parseEventBody(body);
    const imageUrl = req.cloudinary?.url;

    const updateData = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (slug !== undefined) updateData.slug = slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
    if (imageUrl !== undefined) updateData.image = imageUrl;
    if (body.venue !== undefined) updateData.venue = body.venue;
    if (body.location !== undefined) updateData.location = body.location;
    if (startDate) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (price !== undefined) updateData.price = price;
    if (body.isFree !== undefined) updateData.isFree = body.isFree === true || body.isFree === 'true';
    if (maxAttendees !== undefined) updateData.maxAttendees = maxAttendees;
    if (body.status) updateData.status = body.status;
    if (body.featured !== undefined) updateData.featured = body.featured === true || body.featured === 'true';

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent,
    });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Admin: Delete event
// -----------------------------------------------------------------------------

export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
    });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    await prisma.event.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Auth: Register for event
// -----------------------------------------------------------------------------

export const registerForEvent = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const { name, email, phone } = req.body;
    const userId = req.user?.id ?? null;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (!['UPCOMING', 'ONGOING'].includes(event.status)) {
      return res.status(400).json({
        success: false,
        message: 'Event is not open for registration',
      });
    }

    if (event.maxAttendees != null) {
      const count = await prisma.eventRegistration.count({
        where: { eventId },
      });
      if (count >= event.maxAttendees) {
        return res.status(400).json({
          success: false,
          message: 'Event is full',
        });
      }
    }

    const regEmail = (email || req.user?.email || '').trim();
    if (!regEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for registration',
      });
    }

    const existingReg = await prisma.eventRegistration.findUnique({
      where: {
        eventId_email: { eventId, email: regEmail },
      },
    });
    if (existingReg) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event',
      });
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        userId,
        eventId,
        name: (name || req.user?.fullName || '').trim() || regEmail,
        email: regEmail,
        phone: (phone || req.user?.phone || '').trim() || null,
      },
      include: {
        event: true,
        user: userId
          ? { select: { id: true, fullName: true, email: true } }
          : false,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Registered for event successfully',
      data: registration,
    });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Admin: List event registrations
// -----------------------------------------------------------------------------

export const getEventRegistrations = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const { page, limit, skip, take } = safePageLimit(req.query);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where: { eventId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, profileImage: true },
          },
        },
      }),
      prisma.eventRegistration.count({ where: { eventId } }),
    ]);

    res.json({
      success: true,
      data: registrations,
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

// -----------------------------------------------------------------------------
// Admin: Mark registration as attended
// -----------------------------------------------------------------------------

export const markEventAttendance = async (req, res, next) => {
  try {
    const { id: eventId, registrationId } = req.params;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
    });
    if (!registration || registration.eventId !== eventId) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { attended: true },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        event: true,
      },
    });

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
