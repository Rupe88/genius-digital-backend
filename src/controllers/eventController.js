import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Get all events with filtering
 */
export const getAllEvents = async (req, res, next) => {
  try {
    const {
      status,
      featured,
      upcoming,
      past,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (featured === 'true') where.featured = true;

    // Filter upcoming events
    if (upcoming === 'true') {
      where.startDate = {
        gte: new Date(),
      };
      where.status = {
        in: ['UPCOMING', 'ONGOING'],
      };
    }

    // Filter past events
    if (past === 'true') {
      where.endDate = {
        lt: new Date(),
      };
      where.status = {
        in: ['COMPLETED', 'CANCELLED'],
      };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          _count: {
            select: {
              registrations: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          startDate: 'asc',
        },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      success: true,
      data: events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event by ID or slug
 */
export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if user is registered (if authenticated)
    let isRegistered = false;
    if (req.user) {
      const registration = await prisma.eventRegistration.findFirst({
        where: {
          eventId: event.id,
          OR: [
            { userId: req.user.id },
            { email: req.user.email },
          ],
        },
      });
      isRegistered = !!registration;
    }

    res.json({
      success: true,
      data: {
        ...event,
        isRegistered,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create event (Admin only)
 */
export const createEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      title,
      slug,
      description,
      shortDescription,
      image,
      venue,
      location,
      startDate,
      endDate,
      price,
      isFree,
      maxAttendees,
      featured,
    } = req.body;

    // Check if slug already exists
    const existing = await prisma.event.findUnique({
      where: { slug },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Event with this slug already exists',
      });
    }

    const event = await prisma.event.create({
      data: {
        title,
        slug,
        description,
        shortDescription,
        image,
        venue,
        location,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        price: parseFloat(price) || 0,
        isFree: isFree === true || isFree === 'true',
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
        status: 'UPCOMING',
        featured: featured === true || featured === 'true',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update event (Admin only)
 */
export const updateEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const {
      title,
      slug,
      description,
      shortDescription,
      image,
      venue,
      location,
      startDate,
      endDate,
      price,
      isFree,
      maxAttendees,
      status,
      featured,
    } = req.body;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if slug already exists (excluding current event)
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

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(image !== undefined && { image }),
        ...(venue !== undefined && { venue }),
        ...(location !== undefined && { location }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(isFree !== undefined && { isFree: isFree === true || isFree === 'true' }),
        ...(maxAttendees !== undefined && { maxAttendees: maxAttendees ? parseInt(maxAttendees) : null }),
        ...(status && { status }),
        ...(featured !== undefined && { featured: featured === true || featured === 'true' }),
      },
    });

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete event (Admin only)
 */
export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
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
  } catch (error) {
    next(error);
  }
};

/**
 * Register for event
 */
export const registerForEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, email, phone } = req.body;
    const userId = req.user?.id || null;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if event is open for registration
    if (!['UPCOMING', 'ONGOING'].includes(event.status)) {
      return res.status(400).json({
        success: false,
        message: 'Event is not open for registration',
      });
    }

    // Check max attendees
    if (event.maxAttendees) {
      const registrationCount = await prisma.eventRegistration.count({
        where: { eventId: id },
      });

      if (registrationCount >= event.maxAttendees) {
        return res.status(400).json({
          success: false,
          message: 'Event is full',
        });
      }
    }

    // Check if already registered
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_email: {
          eventId: id,
          email: email || req.user?.email || '',
        },
      },
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event',
      });
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        userId: userId || null,
        eventId: id,
        name: name || req.user?.fullName || '',
        email: email || req.user?.email || '',
        phone: phone || req.user?.phone || '',
      },
      include: {
        event: true,
        user: userId
          ? {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            }
          : false,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Registered for event successfully',
      data: registration,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event registrations (Admin only)
 */
export const getEventRegistrations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const event = await prisma.event.findUnique({
      where: { id },
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
        where: { eventId: id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profileImage: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.eventRegistration.count({ where: { eventId: id } }),
    ]);

    res.json({
      success: true,
      data: registrations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark event attendance (Admin only)
 */
export const markEventAttendance = async (req, res, next) => {
  try {
    const { id, registrationId } = req.params;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration || registration.eventId !== id) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    const updatedRegistration = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        attended: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        event: true,
      },
    });

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: updatedRegistration,
    });
  } catch (error) {
    next(error);
  }
};

