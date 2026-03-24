import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { validationResult } from 'express-validator';
import * as zoomService from '../services/zoomService.js';
import { isS3Configured, isOurS3Url, getSignedUrlForMediaUrl } from '../services/s3Service.js';

const SERIES_MARKER_PREFIX = '[[series:';
const SERIES_MARKER_REGEX = /\[\[series:([a-f0-9-]{8,})\]\]/i;

const extractSeriesId = (description) => {
  const text = String(description || '');
  const match = text.match(SERIES_MARKER_REGEX);
  return match?.[1] || null;
};

const stripSeriesMarker = (description) => {
  return String(description || '').replace(SERIES_MARKER_REGEX, '').trim();
};

const withSeriesMarker = (description, seriesId) => {
  const clean = stripSeriesMarker(description);
  if (!seriesId) return clean;
  return clean ? `${clean}\n${SERIES_MARKER_PREFIX}${seriesId}]]` : `${SERIES_MARKER_PREFIX}${seriesId}]]`;
};

async function maskLiveClassCourseThumbnail(liveClass) {
  const thumb = liveClass?.course?.thumbnail;
  if (!isS3Configured() || !thumb || !isOurS3Url(thumb)) return;
  try {
    liveClass.course.thumbnail = await getSignedUrlForMediaUrl(thumb, 3600);
  } catch (err) {
    console.warn('[live-class] Signed course thumbnail failed:', liveClass?.id, err?.message);
  }
}

async function maskLiveClassesCourseThumbnails(liveClasses) {
  if (!Array.isArray(liveClasses)) return;
  await Promise.all(liveClasses.map((lc) => maskLiveClassCourseThumbnail(lc)));
}

async function enrichLiveClassesWithAdminNotes(liveClasses) {
  if (!Array.isArray(liveClasses) || liveClasses.length === 0) return;
  const missing = liveClasses.filter((lc) => lc && lc.adminNotes === undefined).map((lc) => lc.id);
  if (!missing.length) return;
  try {
    const rows = await prisma.$queryRaw(
      Prisma.sql`SELECT id, "adminNotes" FROM "live_classes" WHERE id IN (${Prisma.join(missing)})`
    );
    const notesMap = new Map(rows.map((r) => [r.id, r.adminNotes ?? null]));
    liveClasses.forEach((lc) => {
      if (lc && lc.adminNotes === undefined) {
        lc.adminNotes = notesMap.get(lc.id) ?? null;
      }
    });
  } catch {
    // Ignore fallback failure; API should still return base live class data.
  }
}

function dedupeSeriesRows(liveClasses) {
  if (!Array.isArray(liveClasses) || liveClasses.length === 0) return [];
  const seen = new Set();
  const out = [];
  for (const lc of liveClasses) {
    const sid = extractSeriesId(lc?.description);
    const key = sid ? `series:${sid}` : `class:${lc.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lc);
  }
  return out;
}

const buildWeeklyScheduleFromSessions = (sessions) => {
  const weeklySchedule = {};
  for (const session of sessions || []) {
    const scheduled = new Date(session.scheduledAt);
    if (Number.isNaN(scheduled.getTime())) continue;
    const weekday = scheduled.getDay();
    if (weeklySchedule[weekday]) continue;
    weeklySchedule[weekday] = scheduled.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  return weeklySchedule;
};

const attachSeriesScheduleMetadata = async (liveClasses) => {
  if (!Array.isArray(liveClasses) || liveClasses.length === 0) return;
  const seriesIds = [...new Set(liveClasses.map((lc) => extractSeriesId(lc?.description)).filter(Boolean))];
  const seriesMetaMap = new Map();

  await Promise.all(
    seriesIds.map(async (seriesId) => {
      const marker = `${SERIES_MARKER_PREFIX}${seriesId}]]`;
      const sessions = await prisma.liveClass.findMany({
        where: {
          description: { contains: marker },
        },
        select: {
          scheduledAt: true,
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });
      if (!sessions.length) return;
      const first = sessions[0].scheduledAt;
      const last = sessions[sessions.length - 1].scheduledAt;
      seriesMetaMap.set(seriesId, {
        weeklySchedule: buildWeeklyScheduleFromSessions(sessions),
        startDate: first.toISOString().slice(0, 10),
        endDate: last.toISOString().slice(0, 10),
      });
    })
  );

  for (const liveClass of liveClasses) {
    const seriesId = extractSeriesId(liveClass?.description);
    if (seriesId) {
      const meta = seriesMetaMap.get(seriesId);
      if (meta) {
        liveClass.weeklySchedule = meta.weeklySchedule;
        liveClass.startDate = meta.startDate;
        liveClass.endDate = meta.endDate;
      }
      continue;
    }
    const d = new Date(liveClass.scheduledAt);
    if (!Number.isNaN(d.getTime())) {
      const day = d.toISOString().slice(0, 10);
      liveClass.startDate = day;
      liveClass.endDate = day;
    }
  }
};

const parseTimeToHoursMinutes = (timeStr) => {
  const [h, m] = String(timeStr || '')
    .split(':')
    .map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hours: h, minutes: m };
};

const buildDateWithTime = (dateInput, timeStr) => {
  const t = parseTimeToHoursMinutes(timeStr);
  if (!t) return null;
  const d = new Date(dateInput);
  d.setHours(t.hours, t.minutes, 0, 0);
  return d;
};

const isUnknownAdminNotesArgError = (error) => {
  const msg = String(error?.message || '');
  return msg.includes('Unknown argument `adminNotes`');
};

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
      search,
      q,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (instructorId) where.instructorId = instructorId;
    if (courseId) where.courseId = courseId;

    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Filter upcoming classes
    if (upcoming === 'true') {
      where.scheduledAt = {
        gte: new Date(),
      };
      where.status = {
        in: ['SCHEDULED', 'LIVE'],
      };
    }

    const [rows, total] = await Promise.all([
      prisma.liveClass.findMany({
        where,
        include: {
          instructor: true,
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
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
          createdAt: 'desc', // Latest created classes first
        },
      }),
      prisma.liveClass.count({ where }),
    ]);

    const liveClasses = dedupeSeriesRows(rows);

    await attachSeriesScheduleMetadata(liveClasses);

    await maskLiveClassesCourseThumbnails(liveClasses);
    await enrichLiveClassesWithAdminNotes(liveClasses);

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
            thumbnail: true,
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

    await maskLiveClassCourseThumbnail(liveClass);
    await enrichLiveClassesWithAdminNotes([liveClass]);

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
    // Validation is now handled by the route middleware

    const {
      title,
      description,
      adminNotes,
      courseId,
      instructorId,
      duration,
      meetingUrl,
      meetingId,
      meetingPassword,
      meetingProvider,
      autoGenerateMeeting,
      hostEmail,
      recurrenceType,
      startDate,
      endDate,
      startTime,
      daysOfWeek,
      dayTimes,
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

    // Zoom-only provider in admin panel
    if (meetingProvider && meetingProvider !== 'ZOOM') {
      return res.status(400).json({
        success: false,
        message: 'Only Zoom is supported as meeting provider.',
      });
    }

    // Handle Zoom meeting generation
    let zoomMeetingData = {};
    let finalMeetingProvider = 'ZOOM';
    let finalMeetingUrl = meetingUrl || null;
    let finalMeetingId = meetingId || null;
    let finalMeetingPassword = meetingPassword || null;

    if (autoGenerateMeeting) {
      try {
        if (!zoomService.isZoomConfigured()) {
          return res.status(400).json({
            success: false,
            message: 'Zoom is not configured. Please configure Zoom credentials or use manual meeting URL.',
          });
        }

        const zoomData = await zoomService.createMeeting({
          title,
          scheduledAt: buildDateWithTime(startDate, startTime) || new Date(startDate),
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
      if (!/zoom/i.test(meetingUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Only Zoom meeting URLs are allowed (example: https://zoom.us/j/123456789).',
        });
      }
      // Keep provider fixed to ZOOM; do not auto-switch.
      finalMeetingProvider = 'ZOOM';
    }

    const durationMins = parseInt(duration, 10);
    if (!recurrenceType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'recurrenceType, startDate and endDate are required.',
      });
    }

    if (recurrenceType !== 'WEEKLY') {
      return res.status(400).json({
        success: false,
        message: 'Only weekly recurrence is supported.',
      });
    }

    const selectedWeekdays =
      Array.isArray(daysOfWeek) && daysOfWeek.length > 0
        ? [...new Set(daysOfWeek.map((v) => parseInt(v, 10)).filter((v) => v >= 0 && v <= 6))]
        : [new Date(startDate).getDay()];

    if (!selectedWeekdays.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid weekly day selection.',
      });
    }

    const startBoundary = new Date(startDate);
    const endBoundary = new Date(endDate);
    if (Number.isNaN(startBoundary.getTime()) || Number.isNaN(endBoundary.getTime()) || endBoundary < startBoundary) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startDate/endDate range.',
      });
    }

    const normalizedDayTimes = dayTimes && typeof dayTimes === 'object' ? dayTimes : {};
    const scheduleEntries = [];
    const cursor = new Date(startBoundary);
    while (cursor <= endBoundary) {
      const weekday = cursor.getDay();
      if (selectedWeekdays.includes(weekday)) {
        const timeForDay = normalizedDayTimes[weekday] || normalizedDayTimes[String(weekday)] || startTime;
        const scheduledAt = buildDateWithTime(new Date(cursor), timeForDay);
        if (scheduledAt) {
          scheduleEntries.push({ weekday, scheduledAt });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (!scheduleEntries.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date/time. Please set valid time for selected weekdays.',
      });
    }

    const seriesId = randomUUID();
    const descriptionWithSeriesMarker = withSeriesMarker(description, seriesId);
    const createRows = scheduleEntries.map((entry) => ({
      title,
      description: descriptionWithSeriesMarker || null,
      ...(adminNotes !== undefined ? { adminNotes: adminNotes || null } : {}),
      courseId: courseId || null,
      instructorId,
      scheduledAt: entry.scheduledAt,
      duration: durationMins,
      meetingUrl: finalMeetingUrl,
      meetingId: finalMeetingId,
      meetingPassword: finalMeetingPassword,
      meetingProvider: finalMeetingProvider,
      autoGenerateMeeting: autoGenerateMeeting || false,
      ...zoomMeetingData,
      status: 'SCHEDULED',
    }));

    let created;
    try {
      created = await prisma.$transaction(
        createRows.map((row) =>
          prisma.liveClass.create({
            data: row,
            include: {
              instructor: true,
              course: true,
            },
          })
        )
      );
    } catch (error) {
      if (!isUnknownAdminNotesArgError(error)) throw error;
      const fallbackRows = createRows.map((row) => {
        const nextRow = { ...row };
        delete nextRow.adminNotes;
        return nextRow;
      });
      created = await prisma.$transaction(
        fallbackRows.map((row) =>
          prisma.liveClass.create({
            data: row,
            include: {
              instructor: true,
              course: true,
            },
          })
        )
      );
    }

    await maskLiveClassesCourseThumbnails(created);
    await enrichLiveClassesWithAdminNotes(created);

    res.status(201).json({
      success: true,
      message: `Live classes created successfully (${created.length}).`,
      data: created[0],
      meta: {
        createdCount: created.length,
      },
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
    // Validation is now handled by the route middleware

    const { id } = req.params;
    const {
      title,
      description,
      adminNotes,
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

    if (meetingProvider && meetingProvider !== 'ZOOM') {
      return res.status(400).json({
        success: false,
        message: 'Only Zoom is supported as meeting provider.',
      });
    }

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
    const existingSeriesId = extractSeriesId(liveClass.description);
    const nextDescription =
      description !== undefined
        ? withSeriesMarker(description, existingSeriesId)
        : undefined;

    let updateData = {
      ...(title && { title }),
      ...(nextDescription !== undefined && { description: nextDescription }),
      ...(adminNotes !== undefined && { adminNotes }),
      ...(courseId !== undefined && { courseId: courseId || null }),
      ...(instructorId && { instructorId }),
      ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
      ...(duration !== undefined && { duration: parseInt(duration) }),
      ...(recordingUrl !== undefined && { recordingUrl }),
      ...(status && { status }),
    };

    // Handle meeting provider changes
    if (meetingProvider !== undefined) {
      updateData.meetingProvider = 'ZOOM';
    }

    if (autoGenerateMeeting !== undefined) {
      updateData.autoGenerateMeeting = autoGenerateMeeting;
    }

    // If auto-generating Zoom meeting and it's not already created or needs update
    if (autoGenerateMeeting) {
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

      updateData.meetingProvider = 'ZOOM';
    }

    let updatedLiveClass;
    try {
      updatedLiveClass = await prisma.liveClass.update({
        where: { id },
        data: updateData,
        include: {
          instructor: true,
          course: true,
        },
      });
    } catch (error) {
      if (!isUnknownAdminNotesArgError(error)) throw error;
      delete updateData.adminNotes;
      updatedLiveClass = await prisma.liveClass.update({
        where: { id },
        data: updateData,
        include: {
          instructor: true,
          course: true,
        },
      });
    }

    await maskLiveClassCourseThumbnail(updatedLiveClass);
    await enrichLiveClassesWithAdminNotes([updatedLiveClass]);

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
 * Cancel all sessions in a recurring series (Admin only)
 */
export const cancelLiveClassSeries = async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    const marker = `${SERIES_MARKER_PREFIX}${seriesId}]]`;

    const affected = await prisma.liveClass.updateMany({
      where: {
        description: { contains: marker },
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    if (!affected.count) {
      return res.status(404).json({
        success: false,
        message: 'No active sessions found for this series',
      });
    }

    res.json({
      success: true,
      message: `Series cancelled successfully (${affected.count} sessions).`,
      data: {
        seriesId,
        cancelledCount: affected.count,
      },
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

    const seriesId = extractSeriesId(liveClass.description);
    if (seriesId) {
      const marker = `${SERIES_MARKER_PREFIX}${seriesId}]]`;
      const seriesClasses = await prisma.liveClass.findMany({
        where: {
          description: { contains: marker },
        },
        select: {
          id: true,
          zoomMeetingId: true,
        },
      });

      // Best effort: delete associated Zoom meetings before DB rows.
      if (zoomService.isZoomConfigured()) {
        for (const row of seriesClasses) {
          if (!row.zoomMeetingId) continue;
          try {
            await zoomService.deleteMeeting(row.zoomMeetingId);
          } catch (error) {
            console.error('Failed to delete Zoom meeting:', error);
          }
        }
      }

      const deleted = await prisma.liveClass.deleteMany({
        where: {
          description: { contains: marker },
        },
      });

      return res.json({
        success: true,
        message: `Live class series deleted successfully (${deleted.count} sessions).`,
        data: {
          deletedCount: deleted.count,
          seriesId,
        },
      });
    }

    // Non-series class delete
    if (liveClass.zoomMeetingId && zoomService.isZoomConfigured()) {
      try {
        await zoomService.deleteMeeting(liveClass.zoomMeetingId);
      } catch (error) {
        console.error('Failed to delete Zoom meeting:', error);
        // Continue with deletion even if Zoom deletion fails
      }
    }

    await prisma.liveClass.delete({ where: { id } });

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
                  thumbnail: true,
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

    const enrollmentLiveClasses = enrollments.map((e) => e.liveClass).filter(Boolean);
    await maskLiveClassesCourseThumbnails(enrollmentLiveClasses);
    await enrichLiveClassesWithAdminNotes(enrollmentLiveClasses);

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

/**
 * Get available live classes for authenticated user
 * Filters by enrolled courses and time window (visible until 5 hours after start)
 */
export const getMyAvailableLiveClasses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user's enrolled course IDs
    // Note: Only ACTIVE enrollments are considered (paid courses after payment, free courses after enrollment)
    // PENDING enrollments are not included as enrollment only happens after payment verification
    const enrollments = await prisma.enrollment.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { courseId: true },
    });
    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    // Calculate visibility window: classes visible until 5 hours after scheduled start time
    // So we show classes where scheduledAt >= (now - 5 hours)
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

    // Build where clause
    const where = {
      OR: [
        { courseId: { in: enrolledCourseIds } },
        { courseId: null }, // Standalone classes available to all
      ],
      scheduledAt: { gte: fiveHoursAgo },
      status: { in: ['SCHEDULED', 'LIVE'] },
    };

    const [rows, total] = await Promise.all([
      prisma.liveClass.findMany({
        where,
        include: {
          instructor: true,
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
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

    const liveClasses = dedupeSeriesRows(rows);
    await attachSeriesScheduleMetadata(liveClasses);
    await maskLiveClassesCourseThumbnails(liveClasses);
    await enrichLiveClassesWithAdminNotes(liveClasses);

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
