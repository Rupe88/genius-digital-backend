import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';
import * as zoomService from '../services/zoomService.js';


/**
 * Get all live classes with filtering
 */
export const getAllLiveClasses = async (req, res, next) => {
  try {
    const {
      status,
      instructorId,
      courseId,
      upcoming,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (instructorId) where.instructorId = instructorId;
    if (courseId) where.courseId = courseId;

    // Filter upcoming classes
    if (upcoming === 'true') {
      where.scheduledAt = {
        gte: new Date(),
      };
      where.status = {
        in: ['SCHEDULED', 'LIVE'],
      };
    }

    const [liveClasses, total] = await Promise.all([
      prisma.liveClass.findMany({
        where,
        include: {
          instructor: true,
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          scheduledAt: 'asc',
        },
      }),
      prisma.liveClass.count({ where }),
    ]);

    res.json({
      success: true,
      data: liveClasses,
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
 * Get live class by ID
 */
export const getLiveClassById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const liveClass = await prisma.liveClass.findUnique({
      where: { id },
      include: {
        instructor: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        enrollments: {
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
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found',
      });
    }

    res.json({
      success: true,
      data: liveClass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create live class (Admin only)
 */
export const createLiveClass = async (req, res, next) => {
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
      description,
      courseId,
      instructorId,
      scheduledAt,
      duration,
      meetingUrl,
      meetingId,
      meetingPassword,
      meetingProvider,
      autoGenerateMeeting,
      hostEmail,
    } = req.body;

    // Validate instructor exists
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
    });

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found',
      });
    }

    // Validate course if provided
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
    }

    // Handle Zoom meeting generation
    let zoomMeetingData = {};
    let finalMeetingProvider = meetingProvider || 'OTHER';
    let finalMeetingUrl = meetingUrl || null;
    let finalMeetingId = meetingId || null;
    let finalMeetingPassword = meetingPassword || null;

    if (autoGenerateMeeting && meetingProvider === 'ZOOM') {
      try {
        if (!zoomService.isZoomConfigured()) {
          return res.status(400).json({
            success: false,
            message: 'Zoom is not configured. Please configure Zoom credentials or use manual meeting URL.',
          });
        }

        const zoomData = await zoomService.createMeeting({
          title,
          scheduledAt,
          duration: parseInt(duration),
          hostEmail: hostEmail || instructor.email,
        });

        zoomMeetingData = {
          zoomMeetingId: zoomData.zoomMeetingId,
          zoomJoinUrl: zoomData.zoomJoinUrl,
          zoomStartUrl: zoomData.zoomStartUrl,
        };

        finalMeetingUrl = zoomData.meetingUrl;
        finalMeetingId = zoomData.meetingId;
        finalMeetingPassword = zoomData.meetingPassword || null;
        finalMeetingProvider = 'ZOOM';
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: `Failed to create Zoom meeting: ${error.message}`,
        });
      }
    } else if (meetingUrl) {
      // Validate manual meeting URL if provided
      if (meetingProvider && zoomService.validateMeetingUrl(meetingUrl, meetingProvider)) {
        finalMeetingProvider = meetingProvider;
      } else if (!meetingProvider) {
        // Auto-detect provider from URL
        finalMeetingProvider = zoomService.parseMeetingProvider(meetingUrl) || 'OTHER';
      }
    }

    const liveClass = await prisma.liveClass.create({
      data: {
        title,
        description,
        courseId: courseId || null,
        instructorId,
        scheduledAt: new Date(scheduledAt),
        duration: parseInt(duration),
        meetingUrl: finalMeetingUrl,
        meetingId: finalMeetingId,
        meetingPassword: finalMeetingPassword,
        meetingProvider: finalMeetingProvider,
        autoGenerateMeeting: autoGenerateMeeting || false,
        ...zoomMeetingData,
        status: 'SCHEDULED',
      },
      include: {
        instructor: true,
        course: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Live class created successfully',
      data: liveClass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update live class (Admin only)
 */
export const updateLiveClass = async (req, res, next) => {
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
      description,
      courseId,
      instructorId,
      scheduledAt,
      duration,
      meetingUrl,
      meetingId,
      meetingPassword,
      meetingProvider,
      autoGenerateMeeting,
      recordingUrl,
      status,
      hostEmail,
    } = req.body;

    const liveClass = await prisma.liveClass.findUnique({
      where: { id },
    });

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found',
      });
    }

    // Validate instructor if updating
    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({
        where: { id: instructorId },
      });

      if (!instructor) {
        return res.status(404).json({
          success: false,
          message: 'Instructor not found',
        });
      }
    }

    // Validate course if updating
    if (courseId !== undefined) {
      if (courseId) {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
        });

        if (!course) {
          return res.status(404).json({
            success: false,
            message: 'Course not found',
          });
        }
      }
    }

    // Handle Zoom meeting updates
    let updateData = {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(courseId !== undefined && { courseId: courseId || null }),
      ...(instructorId && { instructorId }),
      ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
      ...(duration !== undefined && { duration: parseInt(duration) }),
      ...(recordingUrl !== undefined && { recordingUrl }),
      ...(status && { status }),
    };

    // Handle meeting provider changes
    if (meetingProvider !== undefined) {
      updateData.meetingProvider = meetingProvider;
    }

    if (autoGenerateMeeting !== undefined) {
      updateData.autoGenerateMeeting = autoGenerateMeeting;
    }

    // If auto-generating Zoom meeting and it's not already created or needs update
    if (autoGenerateMeeting && meetingProvider === 'ZOOM') {
      try {
        if (!zoomService.isZoomConfigured()) {
          return res.status(400).json({
            success: false,
            message: 'Zoom is not configured. Please configure Zoom credentials or use manual meeting URL.',
          });
        }

        // If Zoom meeting already exists, update it
        if (liveClass.zoomMeetingId) {
          const zoomData = await zoomService.updateMeeting(liveClass.zoomMeetingId, {
            title: title || liveClass.title,
            scheduledAt: scheduledAt || liveClass.scheduledAt,
            duration: duration || liveClass.duration,
            hostEmail: hostEmail || liveClass.instructor?.email,
          });

          updateData.zoomJoinUrl = zoomData.zoomJoinUrl;
          updateData.zoomStartUrl = zoomData.zoomStartUrl;
          updateData.meetingUrl = zoomData.meetingUrl;
          updateData.meetingId = zoomData.meetingId;
          updateData.meetingPassword = zoomData.meetingPassword || liveClass.meetingPassword;
        } else {
          // Create new Zoom meeting
          const instructor = await prisma.instructor.findUnique({
            where: { id: instructorId || liveClass.instructorId },
            select: { email: true },
          });

          const zoomData = await zoomService.createMeeting({
            title: title || liveClass.title,
            scheduledAt: scheduledAt || liveClass.scheduledAt,
            duration: duration || liveClass.duration,
            hostEmail: hostEmail || instructor?.email,
          });

          updateData.zoomMeetingId = zoomData.zoomMeetingId;
          updateData.zoomJoinUrl = zoomData.zoomJoinUrl;
          updateData.zoomStartUrl = zoomData.zoomStartUrl;
          updateData.meetingUrl = zoomData.meetingUrl;
          updateData.meetingId = zoomData.meetingId;
          updateData.meetingPassword = zoomData.meetingPassword || null;
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: `Failed to manage Zoom meeting: ${error.message}`,
        });
      }
    } else if (meetingUrl !== undefined) {
      // Manual meeting URL provided
      updateData.meetingUrl = meetingUrl;
      if (meetingId !== undefined) {
        updateData.meetingId = meetingId;
      }
      if (meetingPassword !== undefined) {
        updateData.meetingPassword = meetingPassword;
      }

      // Validate and detect provider
      if (meetingProvider && zoomService.validateMeetingUrl(meetingUrl, meetingProvider)) {
        updateData.meetingProvider = meetingProvider;
      } else if (meetingUrl) {
        updateData.meetingProvider = zoomService.parseMeetingProvider(meetingUrl) || 'OTHER';
      }
    }

    const updatedLiveClass = await prisma.liveClass.update({
      where: { id },
      data: updateData,
      include: {
        instructor: true,
        course: true,
      },
    });

    res.json({
      success: true,
      message: 'Live class updated successfully',
      data: updatedLiveClass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete live class (Admin only)
 */
export const deleteLiveClass = async (req, res, next) => {
  try {
    const { id } = req.params;

    const liveClass = await prisma.liveClass.findUnique({
      where: { id },
    });

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found',
      });
    }

    // Delete Zoom meeting if it exists
    if (liveClass.zoomMeetingId && zoomService.isZoomConfigured()) {
      try {
        await zoomService.deleteMeeting(liveClass.zoomMeetingId);
      } catch (error) {
        console.error('Failed to delete Zoom meeting:', error);
        // Continue with deletion even if Zoom deletion fails
      }
    }

    await prisma.liveClass.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Live class deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enroll in live class
 */
export const enrollInLiveClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const liveClass = await prisma.liveClass.findUnique({
      where: { id },
    });

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found',
      });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.liveClassEnrollment.findUnique({
      where: {
        userId_liveClassId: {
          userId,
          liveClassId: id,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this live class',
      });
    }

    const enrollment = await prisma.liveClassEnrollment.create({
      data: {
        userId,
        liveClassId: id,
      },
      include: {
        liveClass: {
          include: {
            instructor: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Enrolled in live class successfully',
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark attendance for live class
 */
export const markAttendance = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    // Only admin or the user themselves can mark attendance
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark attendance',
      });
    }

    const enrollment = await prisma.liveClassEnrollment.findUnique({
      where: {
        userId_liveClassId: {
          userId,
          liveClassId: id,
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    const updatedEnrollment = await prisma.liveClassEnrollment.update({
      where: {
        userId_liveClassId: {
          userId,
          liveClassId: id,
        },
      },
      data: {
        attended: true,
        joinedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        liveClass: true,
      },
    });

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: updatedEnrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's live class enrollments
 */
export const getMyLiveClasses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [enrollments, total] = await Promise.all([
      prisma.liveClassEnrollment.findMany({
        where: { userId },
        include: {
          liveClass: {
            include: {
              instructor: true,
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.liveClassEnrollment.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: enrollments,
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

