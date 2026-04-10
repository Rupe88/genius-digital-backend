import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { validationResult } from 'express-validator';
import * as zoomService from '../services/zoomService.js';
import { isS3Configured, isOurS3Url, getSignedUrlForMediaUrl } from '../services/storageService.js';

const SERIES_MARKER_PREFIX = '[[series:';
const SERIES_MARKER_REGEX = /\[\[series:([a-f0-9-]{8,})\]\]/i;
const SERIES_RANGE_MARKER_REGEX = /\[\[series-range:(\d{4}-\d{2}-\d{2})\|(\d{4}-\d{2}-\d{2})\]\]/i;

// Admin selects date/time in Nepal time; server timezone may differ.
// Nepal has a fixed UTC offset of +05:45 (no DST).
const KATHMANDU_OFFSET_MINUTES = 5 * 60 + 45;
const KATHMANDU_OFFSET_MS = KATHMANDU_OFFSET_MINUTES * 60 * 1000;

function parseYMD(dateInput) {
  const text = String(dateInput || '');
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    monthIndex: parseInt(m[2], 10) - 1,
    day: parseInt(m[3], 10),
  };
}

function kathmanduDay(dateObj) {
  const shifted = new Date(dateObj.getTime() + KATHMANDU_OFFSET_MS);
  return shifted.getUTCDay();
}

function kathmanduTimeString(dateObj) {
  const shifted = new Date(dateObj.getTime() + KATHMANDU_OFFSET_MS);
  let h = shifted.getUTCHours();
  const m = shifted.getUTCMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = String(m).padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${mm} ${suffix}`;
}

function toKathmanduYMD(dateObj) {
  const shifted = new Date(dateObj.getTime() + KATHMANDU_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const extractSeriesId = (description) => {
  const text = String(description || '');
  const match = text.match(SERIES_MARKER_REGEX);
  return match?.[1] || null;
};

const extractSeriesRange = (description) => {
  const text = String(description || '');
  const match = text.match(SERIES_RANGE_MARKER_REGEX);
  if (!match) return null;
  return { startDate: match[1], endDate: match[2] };
};

const stripSeriesMetadata = (description) => {
  return String(description || '').replace(SERIES_MARKER_REGEX, '').replace(SERIES_RANGE_MARKER_REGEX, '').trim();
};

const withSeriesMarker = (description, seriesId, startDate, endDate) => {
  const clean = stripSeriesMetadata(description);
  if (!seriesId) return clean;
  const markers = [`${SERIES_MARKER_PREFIX}${seriesId}]]`];
  if (startDate && endDate) {
    markers.push(`[[series-range:${startDate}|${endDate}]]`);
  }
  return clean ? `${clean}\n${markers.join('\n')}` : markers.join('\n');
};

const stripSeriesMetadataForResponse = (liveClass) => {
  if (!liveClass || typeof liveClass !== 'object') return liveClass;
  if (typeof liveClass.description === 'string') {
    liveClass.description = stripSeriesMetadata(liveClass.description);
  }
  return liveClass;
};

const stripSeriesMetadataForResponseList = (liveClasses) => {
  if (!Array.isArray(liveClasses)) return;
  liveClasses.forEach((lc) => stripSeriesMetadataForResponse(lc));
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
  const grouped = new Map();

  for (const lc of liveClasses) {
    const sid = extractSeriesId(lc?.description);
    const key = sid ? `series:${sid}` : `class:${lc.id}`;
    const prev = grouped.get(key);
    if (!prev) {
      grouped.set(key, lc);
      continue;
    }

    const prevCancelled = prev?.status === 'CANCELLED';
    const curCancelled = lc?.status === 'CANCELLED';
    if (prevCancelled && !curCancelled) {
      grouped.set(key, lc);
      continue;
    }
    if (!prevCancelled && curCancelled) continue;

    const prevTs = new Date(prev?.scheduledAt).getTime();
    const curTs = new Date(lc?.scheduledAt).getTime();
    if (!Number.isNaN(curTs) && (Number.isNaN(prevTs) || curTs < prevTs)) {
      grouped.set(key, lc);
    }
  }

  return Array.from(grouped.values());
}

const buildWeeklyScheduleFromSessions = (sessions) => {
  const weeklySchedule = {};
  for (const session of sessions || []) {
    // When admin removes a weekday from a series, we cancel those sessions
    // but we keep their scheduledAt values in the DB. Do not count cancelled sessions.
    if (session?.status === 'CANCELLED') continue;
    const scheduled = new Date(session.scheduledAt);
    if (Number.isNaN(scheduled.getTime())) continue;
    const weekday = kathmanduDay(scheduled);
    if (weeklySchedule[weekday]) continue;
    weeklySchedule[weekday] = kathmanduTimeString(scheduled);
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
          status: true,
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });
      if (!sessions.length) return;

      const activeSessions = sessions.filter((s) => s.status !== 'CANCELLED');
      const sessionsForRange = activeSessions.length > 0 ? activeSessions : sessions;
      const first = sessionsForRange[0].scheduledAt;
      const last = sessionsForRange[sessionsForRange.length - 1].scheduledAt;
      const rangeFromMarker = extractSeriesRange(liveClasses.find((lc) => extractSeriesId(lc?.description) === seriesId)?.description);
      seriesMetaMap.set(seriesId, {
        weeklySchedule: buildWeeklyScheduleFromSessions(activeSessions),
        startDate: rangeFromMarker?.startDate || toDateInputLocal(first),
        endDate: rangeFromMarker?.endDate || toDateInputLocal(last),
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
      const day = toKathmanduYMD(d);
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
  // Treat dateInput + timeStr as Kathmandu local time and convert to an instant (UTC stored in DB).
  const t = parseTimeToHoursMinutes(timeStr);
  if (!t) return null;

  const ymd = parseYMD(dateInput);
  if (ymd) {
    const utcMs = Date.UTC(ymd.year, ymd.monthIndex, ymd.day, t.hours, t.minutes, 0, 0) - KATHMANDU_OFFSET_MS;
    return new Date(utcMs);
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  // Read Kathmandu calendar parts from the shifted date, independent of server timezone.
  const shifted = new Date(d.getTime() + KATHMANDU_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const monthIndex = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const utcMs = Date.UTC(y, monthIndex, day, t.hours, t.minutes, 0, 0) - KATHMANDU_OFFSET_MS;
  return new Date(utcMs);
};

// Parse YYYY-MM-DD as a timezone-agnostic calendar date
const parseDateInputLocal = (dateInput) => {
  const ymd = parseYMD(dateInput);
  if (!ymd) return new Date(String(dateInput || ''));
  // UTC midnight for the calendar date.
  return new Date(Date.UTC(ymd.year, ymd.monthIndex, ymd.day, 0, 0, 0, 0));
};

const toDateInputLocal = (dateObj) => {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (Number.isNaN(d.getTime())) return '';
  return toKathmanduYMD(d);
};

const toDayKey = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return toDateInputLocal(dt);
};

const isUnknownAdminNotesArgError = (error) => {
  const msg = String(error?.message || '');
  return msg.includes('Unknown argument `adminNotes`');
};

const getRequestInstructorProfile = async (req) => {
  if (req.user?.role !== 'INSTRUCTOR') return null;
  const email = String(req.user?.email || '').trim();
  if (!email) return null;
  return prisma.instructor.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true, name: true },
  });
};

const ensureInstructorCanManageCourse = async (courseId, instructorId) => {
  if (!courseId) return true;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true },
  });
  if (!course) return false;
  return course.instructorId === instructorId;
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
    stripSeriesMetadataForResponseList(liveClasses);

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
 * Get live classes managed by current user.
 * - Admin: all live classes
 * - Instructor: only classes assigned to that instructor profile
 */
export const getMyManagedLiveClasses = async (req, res, next) => {
  try {
    const { status, courseId, search, q, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (courseId) where.courseId = courseId;

    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (req.user?.role === 'INSTRUCTOR') {
      const instructor = await getRequestInstructorProfile(req);
      if (!instructor) {
        return res.status(403).json({
          success: false,
          message: 'Instructor profile not found for current user',
        });
      }
      where.instructorId = instructor.id;
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
          createdAt: 'desc',
        },
      }),
      prisma.liveClass.count({ where }),
    ]);

    const liveClasses = dedupeSeriesRows(rows);
    await attachSeriesScheduleMetadata(liveClasses);
    await maskLiveClassesCourseThumbnails(liveClasses);
    await enrichLiveClassesWithAdminNotes(liveClasses);
    stripSeriesMetadataForResponseList(liveClasses);

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
    stripSeriesMetadataForResponse(liveClass);

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

    const requestInstructor = await getRequestInstructorProfile(req);
    const effectiveInstructorId =
      req.user?.role === 'INSTRUCTOR' ? requestInstructor?.id : instructorId;
    const effectiveAdminNotes =
      req.user?.role === 'ADMIN' ? adminNotes : undefined;

    if (req.user?.role === 'INSTRUCTOR') {
      if (!requestInstructor?.id) {
        return res.status(403).json({
          success: false,
          message: 'Instructor profile not found for current user',
        });
      }
      if (instructorId && instructorId !== requestInstructor.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only create live classes for your own instructor profile',
        });
      }
    }

    if (!effectiveInstructorId) {
      return res.status(400).json({
        success: false,
        message: 'Valid instructor ID is required',
      });
    }

    // Validate instructor exists
    const instructor = await prisma.instructor.findUnique({
      where: { id: effectiveInstructorId },
    });

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found',
      });
    }

    // Validate course if provided
    if (courseId) {
      const allowed = await ensureInstructorCanManageCourse(
        courseId,
        effectiveInstructorId
      );
      if (!allowed) {
        return res.status(404).json({
          success: false,
          message:
            req.user?.role === 'INSTRUCTOR'
              ? 'Course not found or not assigned to you'
              : 'Course not found',
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
        : [parseDateInputLocal(startDate).getUTCDay()];

    if (!selectedWeekdays.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid weekly day selection.',
      });
    }

    const startBoundary = parseDateInputLocal(startDate);
    const endBoundary = parseDateInputLocal(endDate);
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
      const weekday = cursor.getUTCDay();
      if (selectedWeekdays.includes(weekday)) {
        const timeForDay = normalizedDayTimes[weekday] || normalizedDayTimes[String(weekday)] || startTime;
        const scheduledAt = buildDateWithTime(new Date(cursor), timeForDay);
        if (scheduledAt) {
          scheduleEntries.push({ weekday, scheduledAt });
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (!scheduleEntries.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date/time. Please set valid time for selected weekdays.',
      });
    }

    const seriesId = randomUUID();
    const descriptionWithSeriesMarker = withSeriesMarker(description, seriesId, startDate, endDate);
    const createRows = scheduleEntries.map((entry) => ({
      title,
      description: descriptionWithSeriesMarker || null,
      ...(effectiveAdminNotes !== undefined
        ? { adminNotes: effectiveAdminNotes || null }
        : {}),
      courseId: courseId || null,
      instructorId: effectiveInstructorId,
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
    stripSeriesMetadataForResponseList(created);

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
      recurrenceType,
      startDate,
      endDate,
      startTime,
      daysOfWeek,
      dayTimes,
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

    const requestInstructor = await getRequestInstructorProfile(req);
    const effectiveInstructorId =
      req.user?.role === 'INSTRUCTOR' ? requestInstructor?.id : instructorId;
    const effectiveAdminNotes =
      req.user?.role === 'ADMIN' ? adminNotes : undefined;

    if (req.user?.role === 'INSTRUCTOR') {
      if (!requestInstructor?.id) {
        return res.status(403).json({
          success: false,
          message: 'Instructor profile not found for current user',
        });
      }
      if (liveClass.instructorId !== requestInstructor.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only manage your own live classes',
        });
      }
      if (instructorId && instructorId !== requestInstructor.id) {
        return res.status(403).json({
          success: false,
          message: 'You cannot reassign live classes to another instructor',
        });
      }
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
        const allowed = await ensureInstructorCanManageCourse(
          courseId,
          req.user?.role === 'INSTRUCTOR' ? requestInstructor.id : (effectiveInstructorId || liveClass.instructorId)
        );
        if (!allowed) {
          return res.status(404).json({
            success: false,
            message:
              req.user?.role === 'INSTRUCTOR'
                ? 'Course not found or not assigned to you'
                : 'Course not found',
          });
        }
      }
    }

    // Handle Zoom meeting updates
    const existingSeriesId = extractSeriesId(liveClass.description);
    const existingSeriesRange = extractSeriesRange(liveClass.description);
    const nextDescription =
      description !== undefined
        ? withSeriesMarker(
            description,
            existingSeriesId,
            existingSeriesRange?.startDate,
            existingSeriesRange?.endDate
          )
        : undefined;

    // ===== Recurring series edit (weekly) =====
    const wantsSeriesUpdate =
      recurrenceType === 'WEEKLY' ||
      startDate !== undefined ||
      endDate !== undefined ||
      daysOfWeek !== undefined ||
      dayTimes !== undefined;

    if (wantsSeriesUpdate) {
      if (!existingSeriesId) {
        return res.status(400).json({
          success: false,
          message: 'This live class is not part of a recurring series.',
        });
      }
      if (recurrenceType && recurrenceType !== 'WEEKLY') {
        return res.status(400).json({
          success: false,
          message: 'Only weekly recurrence is supported.',
        });
      }
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required for weekly series update.',
        });
      }
      const selectedWeekdays =
        Array.isArray(daysOfWeek) && daysOfWeek.length > 0
          ? [...new Set(daysOfWeek.map((v) => parseInt(v, 10)).filter((v) => v >= 0 && v <= 6))]
          : [];
      if (!selectedWeekdays.length) {
        return res.status(400).json({
          success: false,
          message: 'Please select at least one weekday.',
        });
      }

      const startBoundary = parseDateInputLocal(startDate);
      const endBoundary = parseDateInputLocal(endDate);
      if (Number.isNaN(startBoundary.getTime()) || Number.isNaN(endBoundary.getTime()) || endBoundary < startBoundary) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate/endDate range.',
        });
      }

      const marker = `${SERIES_MARKER_PREFIX}${existingSeriesId}]]`;
      const sessions = await prisma.liveClass.findMany({
        where: { description: { contains: marker } },
        orderBy: { scheduledAt: 'asc' },
      });

      const normalizedDayTimes = dayTimes && typeof dayTimes === 'object' ? dayTimes : {};
      const fallbackTime = startTime || '21:00';
      const selectedWeekdaySet = new Set(selectedWeekdays);

      const timeForWeekday = (weekday) =>
        normalizedDayTimes[weekday] || normalizedDayTimes[String(weekday)] || fallbackTime;

      // Desired sessions keyed by local date (YYYY-MM-DD)
      const desiredByDateKey = new Map();
      const desiredCursor = new Date(startBoundary);
      while (desiredCursor <= endBoundary) {
        const weekday = desiredCursor.getUTCDay();
        if (selectedWeekdaySet.has(weekday)) {
          const dateKey = toDayKey(desiredCursor);
          const desiredTime = timeForWeekday(weekday);
          const dt = buildDateWithTime(new Date(desiredCursor), desiredTime);
          if (dateKey && dt) {
            desiredByDateKey.set(dateKey, { dateKey, scheduledAt: dt, weekday });
          }
        }
        desiredCursor.setUTCDate(desiredCursor.getUTCDate() + 1);
      }

      if (!desiredByDateKey.size) {
        return res.status(400).json({
          success: false,
          message: 'Invalid weekly schedule. Please set valid time for selected weekdays.',
        });
      }

      const existingByDateKey = new Map();
      for (const s of sessions) {
        const key = toDayKey(s.scheduledAt);
        if (!key) continue;
        const list = existingByDateKey.get(key) || [];
        list.push(s);
        existingByDateKey.set(key, list);
      }

      const nextSeriesDescription = withSeriesMarker(
        description !== undefined ? description : liveClass.description,
        existingSeriesId,
        startDate,
        endDate
      );
      const finalDescription = nextSeriesDescription;
      const nextMeetingUrl = meetingUrl !== undefined ? meetingUrl : liveClass.meetingUrl;
      const nextMeetingId = meetingId !== undefined ? meetingId : liveClass.meetingId;
      const nextMeetingPassword = meetingPassword !== undefined ? meetingPassword : liveClass.meetingPassword;
      const nextMeetingProvider = 'ZOOM';
      const nextDuration = duration !== undefined ? parseInt(duration, 10) : liveClass.duration;

      const commonUpdates = {
        ...(title && { title }),
        ...(finalDescription !== undefined && { description: finalDescription }),
        ...(effectiveAdminNotes !== undefined && { adminNotes: effectiveAdminNotes }),
        ...(courseId !== undefined && { courseId: courseId || null }),
        ...((effectiveInstructorId || instructorId) && {
          instructorId: effectiveInstructorId || instructorId,
        }),
        ...(duration !== undefined && { duration: nextDuration }),
        ...(recordingUrl !== undefined && { recordingUrl }),
        ...(status && { status }),
        meetingProvider: nextMeetingProvider,
        meetingUrl: nextMeetingUrl,
        meetingId: nextMeetingId,
        meetingPassword: nextMeetingPassword,
      };

      const tx = [];
      // Update desired sessions (activate or create)
      for (const [, desired] of desiredByDateKey.entries()) {
        const existingSessions = existingByDateKey.get(desired.dateKey) || [];
        if (existingSessions.length > 0) {
          const [keep, ...rest] = existingSessions;
          tx.push(
            prisma.liveClass.update({
              where: { id: keep.id },
              data: {
                ...commonUpdates,
                scheduledAt: desired.scheduledAt,
                status: 'SCHEDULED',
              },
            })
          );
          // If duplicates exist for same day, cancel the extras
          for (const extra of rest) {
            tx.push(
              prisma.liveClass.update({
                where: { id: extra.id },
                data: { status: 'CANCELLED' },
              })
            );
          }
        } else {
          tx.push(
            prisma.liveClass.create({
              data: {
                title: title || liveClass.title,
                description: finalDescription || null,
                ...(effectiveAdminNotes !== undefined
                  ? { adminNotes: effectiveAdminNotes || null }
                  : {}),
                courseId: courseId !== undefined ? (courseId || null) : liveClass.courseId,
                instructorId: effectiveInstructorId || instructorId || liveClass.instructorId,
                scheduledAt: desired.scheduledAt,
                duration: nextDuration,
                meetingUrl: nextMeetingUrl,
                meetingId: nextMeetingId,
                meetingPassword: nextMeetingPassword,
                meetingProvider: nextMeetingProvider,
                autoGenerateMeeting: liveClass.autoGenerateMeeting || false,
                zoomMeetingId: liveClass.zoomMeetingId || null,
                zoomJoinUrl: liveClass.zoomJoinUrl || null,
                zoomStartUrl: liveClass.zoomStartUrl || null,
                status: 'SCHEDULED',
              },
            })
          );
        }
      }

      // Cancel sessions not in desired range/day selection
      for (const [dateKey, existingSessions] of existingByDateKey.entries()) {
        if (desiredByDateKey.has(dateKey)) continue;
        for (const s of existingSessions) {
          tx.push(
            prisma.liveClass.update({
              where: { id: s.id },
              data: { status: 'CANCELLED' },
            })
          );
        }
      }

      await prisma.$transaction(tx);

      const updatedRow = await prisma.liveClass.findFirst({
        where: { description: { contains: marker } },
        include: { instructor: true, course: true },
        orderBy: { scheduledAt: 'asc' },
      });

      await maskLiveClassCourseThumbnail(updatedRow);
      await enrichLiveClassesWithAdminNotes([updatedRow]);
      stripSeriesMetadataForResponse(updatedRow);

      return res.json({
        success: true,
        message: 'Live class series updated successfully',
        data: updatedRow,
      });
    }

    let updateData = {
      ...(title && { title }),
      ...(nextDescription !== undefined && { description: nextDescription }),
      ...(effectiveAdminNotes !== undefined && { adminNotes: effectiveAdminNotes }),
      ...(courseId !== undefined && { courseId: courseId || null }),
      ...((effectiveInstructorId || instructorId) && {
        instructorId: effectiveInstructorId || instructorId,
      }),
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

    if (req.user?.role === 'INSTRUCTOR') {
      const requestInstructor = await getRequestInstructorProfile(req);
      if (!requestInstructor?.id) {
        return res.status(403).json({
          success: false,
          message: 'Instructor profile not found for current user',
        });
      }
      const ownsAny = await prisma.liveClass.findFirst({
        where: {
          description: { contains: marker },
          instructorId: requestInstructor.id,
        },
        select: { id: true },
      });
      if (!ownsAny) {
        return res.status(403).json({
          success: false,
          message: 'You can only cancel your own live class series',
        });
      }
    }

    const affected = await prisma.liveClass.updateMany({
      where: {
        description: { contains: marker },
        ...(req.user?.role === 'INSTRUCTOR'
          ? { instructorId: (await getRequestInstructorProfile(req))?.id || '__invalid__' }
          : {}),
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

    if (req.user?.role === 'INSTRUCTOR') {
      const requestInstructor = await getRequestInstructorProfile(req);
      if (!requestInstructor?.id) {
        return res.status(403).json({
          success: false,
          message: 'Instructor profile not found for current user',
        });
      }
      if (liveClass.instructorId !== requestInstructor.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own live classes',
        });
      }
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
    stripSeriesMetadataForResponseList(liveClasses);

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
