import { prisma } from '../config/database.js';
import { validationResult } from 'express-validator';
import { generateSlug } from '../utils/helpers.js';
import { isS3Configured, isOurS3Url, getSignedUrlForMediaUrl } from '../services/s3Service.js';

/** Replace S3 thumbnail with signed S3 URL so browser loads image directly from S3 (no backend proxy). Mutates course(s). */
async function maskCourseThumbnail(req, course) {
  if (!isS3Configured() || !course?.thumbnail || !isOurS3Url(course.thumbnail)) return;
  try {
    course.thumbnail = await getSignedUrlForMediaUrl(course.thumbnail, 3600);
  } catch (err) {
    console.warn('[course] Signed thumbnail URL failed:', course.id, err?.message);
  }
}
async function maskCoursesThumbnails(req, courses) {
  if (Array.isArray(courses)) {
    await Promise.all(courses.map((c) => maskCourseThumbnail(req, c)));
  } else if (courses) {
    await maskCourseThumbnail(req, courses);
  }
}

/**
 * Get all courses with filtering
 */
export const getAllCourses = async (req, res, next) => {
  try {
    const {
      status,
      featured,
      isOngoing,
      instructorId,
      categoryId,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (featured === 'true') where.featured = true;
    if (isOngoing === 'true') where.isOngoing = true;
    if (instructorId) where.instructorId = instructorId;
    if (categoryId) where.categoryId = categoryId;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          instructor: true,
          category: true,
          _count: {
            select: {
              enrollments: true,
              lessons: true,
              reviews: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.course.count({ where }),
    ]);

    await maskCoursesThumbnails(req, courses);
    res.json({
      success: true,
      data: courses,
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
 * Filter courses with advanced options
 */
export const filterCourses = async (req, res, next) => {
  try {
    const {
      category,
      level,
      minPrice,
      maxPrice,
      minRating,
      tags,
      isOngoing,
      featured,
      instructor,
      search,
      searchRegex,
      sortBy = 'newest',
      order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const where = {
      status: 'PUBLISHED',
    };

    // Category filter
    if (category) {
      const categoryRecord = await prisma.category.findFirst({
        where: {
          OR: [
            { id: category },
            { slug: category },
          ],
        },
      });
      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      }
    }

    // Level filter
    if (level) {
      where.level = level;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (minRating) {
      where.rating = {
        gte: parseFloat(minRating),
      };
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      where.tags = {
        contains: tagArray.join(','),
      };
    }

    // Ongoing filter
    if (isOngoing === 'true') {
      where.isOngoing = true;
    }

    // Featured filter
    if (featured === 'true') {
      where.featured = true;
    }

    // Instructor filter
    if (instructor) {
      where.instructorId = instructor;
    }

    // Search filter (simple case-insensitive contains).
    // If searchRegex is provided, we handle it separately below.
    if (search && !searchRegex) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Sort options
    let orderBy = {};
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: order };
        break;
      case 'oldest':
        orderBy = { createdAt: order === 'desc' ? 'asc' : 'desc' };
        break;
      case 'price':
        orderBy = { price: order };
        break;
      case 'rating':
        orderBy = { rating: order };
        break;
      case 'popularity':
      case 'enrollments':
        orderBy = { totalEnrollments: order };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // If regex-based search is requested, apply it in-memory after fetching
    // all matching courses for the other filters, then paginate manually.
    if (searchRegex) {
      let regex;
      try {
        regex = new RegExp(searchRegex, 'i');
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid searchRegex pattern',
        });
      }

      const allCourses = await prisma.course.findMany({
        where,
        include: {
          instructor: true,
          category: true,
          _count: {
            select: {
              enrollments: true,
              lessons: true,
              reviews: true,
            },
          },
        },
        orderBy,
      });

      const filtered = allCourses.filter((course) => {
        const { title, description, shortDescription } = course;
        return (
          (title && regex.test(title)) ||
          (description && regex.test(description)) ||
          (shortDescription && regex.test(shortDescription))
        );
      });

      const total = filtered.length;
      const pages = Math.ceil(total / limitNumber) || 1;
      const start = skip;
      const end = skip + limitNumber;
      const pagedCourses = filtered.slice(start, end);

      return res.json({
        success: true,
        data: pagedCourses,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages,
        },
      });
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          instructor: true,
          category: true,
          _count: {
            select: {
              enrollments: true,
              lessons: true,
              reviews: true,
            },
          },
        },
        skip,
        take: limitNumber,
        orderBy,
      }),
      prisma.course.count({ where }),
    ]);

    await maskCoursesThumbnails(req, courses);
    res.json({
      success: true,
      data: courses,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get featured (popular) courses for homepage.
 * Returns courses marked as popular (featured) that are PUBLISHED or ONGOING.
 */
export const getFeaturedCourses = async (req, res, next) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const whereFeatured = {
      status: { in: ['PUBLISHED', 'ONGOING'] },
      featured: true,
    };
    const courses = await prisma.course.findMany({
      where: whereFeatured,
      include: {
        instructor: true,
        category: true,
        _count: {
          select: {
            enrollments: true,
            lessons: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    await maskCoursesThumbnails(req, courses || []);
    res.json({
      success: true,
      data: courses || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ongoing courses
 */
export const getOngoingCourses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const whereOngoing = {
      status: { in: ['PUBLISHED', 'ONGOING'] },
      isOngoing: true,
    };
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where: whereOngoing,
        include: {
          instructor: true,
          category: true,
          _count: {
            select: {
              enrollments: true,
              lessons: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          startDate: 'desc',
        },
      }),
      prisma.course.count({
        where: whereOngoing,
      }),
    ]);

    await maskCoursesThumbnails(req, courses);
    res.json({
      success: true,
      data: courses,
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
 * Get course by ID or slug
 */
export const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
      include: {
        instructor: true,
        category: true,
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
        _count: {
          select: {
            enrollments: true,
            lessons: true,
            reviews: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check enrollment if user is logged in
    let enrollment = null;
    if (req.user) {
      enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: req.user.id,
            courseId: course.id,
          },
        },
        select: {
          id: true,
          status: true,
          progress: true,
          completedAt: true,
        },
      });
    }

    // S3 promo: return signed URL in course so frontend can use it immediately (faster initial load, no extra video-token call).
    if (isS3Configured()) {
      if (course.videoUrl && isOurS3Url(course.videoUrl)) {
        try {
          course.videoUrl = await getSignedUrlForMediaUrl(course.videoUrl, 3600);
        } catch (err) {
          console.warn('[course] Signed promo URL failed:', course.id, err?.message);
          course.videoUrl = `/api/media/stream/course/${course.id}/promo`;
        }
      }
      if (course.lessons?.length) {
        for (const lesson of course.lessons) {
          if (lesson.videoUrl && isOurS3Url(lesson.videoUrl)) {
            lesson.videoUrl = `/api/media/stream/lesson/${lesson.id}`;
          }
        }
      }
      await maskCourseThumbnail(req, course);
    }

    res.json({
      success: true,
      data: {
        ...course,
        isEnrolled: !!enrollment,
        enrollment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create course (Admin only)
 */
export const createCourse = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errList = errors.array();
      console.warn('[Course create] Validation failed:', errList.map((e) => ({ param: e.param, msg: e.msg })));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errList.map((e) => ({ param: e.param, path: e.param, msg: e.msg, message: e.msg })),
      });
    }

    const {
      title,
      slug,
      description,
      shortDescription,
      thumbnail,
      price,
      originalPrice,
      isFree,
      status,
      level,
      duration,
      language,
      featured,
      isOngoing,
      startDate,
      endDate,
      tags,
      learningOutcomes,
      skills,
      instructorId,
      categoryId,
      videoUrl: bodyVideoUrl,
    } = req.body;

    // Video: use uploaded file URL (S3) or YouTube link from body (optional)
    const videoUrl = req.cloudinary?.videoUrl ?? ((bodyVideoUrl && String(bodyVideoUrl).trim()) || null);
    if (req.cloudinary?.videoUrl) {
      console.log('[Course create] Using uploaded video URL:', req.cloudinary.videoUrl);
    }

    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug && title) {
      finalSlug = generateSlug(title);

      // Ensure slug is unique with timeout (prevent infinite loops)
      let uniqueSlug = finalSlug;
      let counter = 1;
      const maxAttempts = 10;

      for (let attempts = 0; attempts < maxAttempts; attempts++) {
        const slugExists = await prisma.course.findUnique({
          where: { slug: uniqueSlug },
        });

        if (!slugExists) break;

        uniqueSlug = `${finalSlug}-${counter}`;
        counter++;
      }

      if (counter > maxAttempts) {
        throw new Error('Unable to generate unique slug. Please provide a custom slug.');
      }

      finalSlug = uniqueSlug;
    }

    // Validate instructor exists
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
    });

    if (!instructor) {
      throw new Error('Instructor not found');
    }

    // Validate category if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Parse JSON fields if they're strings
    let parsedLearningOutcomes = learningOutcomes;
    if (learningOutcomes) {
      if (typeof learningOutcomes === 'string') {
        try {
          parsedLearningOutcomes = JSON.parse(learningOutcomes);
        } catch (e) {
          // If not valid JSON, treat as newline-separated string
          parsedLearningOutcomes = learningOutcomes ? learningOutcomes.split('\n').map(s => s.trim()).filter(Boolean) : null;
        }
      }
    } else {
      parsedLearningOutcomes = null;
    }

    let parsedSkills = skills;
    if (skills) {
      if (typeof skills === 'string') {
        try {
          parsedSkills = JSON.parse(skills);
        } catch (e) {
          // If not valid JSON, treat as comma-separated string
          parsedSkills = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : null;
        }
      }
    } else {
      parsedSkills = null;
    }

    // Create course with transaction
    const course = await prisma.$transaction(async (tx) => {
      const createdCourse = await tx.course.create({
        data: {
          title,
          slug: finalSlug,
          description,
          shortDescription,
          thumbnail: req.cloudinary?.url ?? thumbnail ?? null,
          price: price ? parseFloat(price) : 0,
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          isFree: isFree === true || isFree === 'true',
          status: status || 'PUBLISHED',
          level,
          duration: duration ? parseInt(duration) : null,
          language: language || 'en',
          featured: featured === true || featured === 'true',
          isOngoing: isOngoing === true || isOngoing === 'true',
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          tags,
          learningOutcomes: parsedLearningOutcomes,
          skills: parsedSkills,
          videoUrl: videoUrl || null,
          instructorId,
          categoryId: categoryId || null,
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return createdCourse;
    });

    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully',
    });
  } catch (error) {
    if (error.message?.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: validationResult(req).array(),
      });
    }
    if (error.message?.includes('slug already exists') || error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Course with this slug already exists. Please use a different slug.',
      });
    }
    if (error.message?.includes('Invalid instructor') || error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid instructor or category ID',
      });
    }
    if (error.message?.includes('Instructor not found')) {
      return res.status(400).json({
        success: false,
        message: 'Instructor not found',
      });
    }
    if (error.message?.includes('Category not found')) {
      return res.status(400).json({
        success: false,
        message: 'Category not found',
      });
    }
    if (error.message?.includes('unique slug')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error creating course:', error);
    next(error);
  }
};
export const updateCourse = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errList = errors.array();
      console.warn('[Course update] Validation failed:', errList.map((e) => ({ param: e.param, msg: e.msg })));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errList.map((e) => ({ param: e.param, path: e.param, msg: e.msg, message: e.msg })),
      });
    }

    const { id } = req.params;
    const {
      title,
      slug,
      description,
      shortDescription,
      thumbnail,
      price,
      originalPrice,
      isFree,
      status,
      level,
      duration,
      language,
      featured,
      isOngoing,
      startDate,
      endDate,
      tags,
      learningOutcomes,
      skills,
      instructorId,
      categoryId,
      videoUrl,
    } = req.body;

    // Check if course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const updateData = {};
    if (title) updateData.title = title;

    // Handle slug: if title changed and slug not provided, auto-generate
    // If slug provided, use it; if not provided but title changed, generate from title
    if (slug) {
      updateData.slug = slug;
    } else if (title && title !== existingCourse.title) {
      // Title changed, auto-generate slug
      let finalSlug = generateSlug(title);

      // Ensure slug is unique (excluding current course)
      let uniqueSlug = finalSlug;
      let counter = 1;
      let slugExists = await prisma.course.findFirst({
        where: {
          slug: uniqueSlug,
          NOT: { id },
        },
      });

      while (slugExists) {
        uniqueSlug = `${finalSlug}-${counter}`;
        slugExists = await prisma.course.findFirst({
          where: {
            slug: uniqueSlug,
            NOT: { id },
          },
        });
        counter++;
      }
      updateData.slug = uniqueSlug;
    }

    if (description !== undefined) updateData.description = description;
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription;
    if (req.cloudinary?.url || thumbnail) {
      updateData.thumbnail = req.cloudinary?.url || thumbnail;
    }
    if (price !== undefined) updateData.price = parseFloat(price);
    if (isFree !== undefined) updateData.isFree = isFree === true || isFree === 'true';
    if (status) updateData.status = status;
    if (level !== undefined) updateData.level = level;
    if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
    if (language !== undefined) updateData.language = language || 'en';
    if (featured !== undefined) updateData.featured = featured === true || featured === 'true';
    if (isOngoing !== undefined) updateData.isOngoing = isOngoing === true || isOngoing === 'true';
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (tags !== undefined) updateData.tags = tags;

    // Handle learningOutcomes
    if (learningOutcomes !== undefined) {
      let parsedLearningOutcomes = learningOutcomes;
      if (learningOutcomes) {
        if (typeof learningOutcomes === 'string') {
          try {
            parsedLearningOutcomes = JSON.parse(learningOutcomes);
          } catch (e) {
            // If not valid JSON, treat as newline-separated string
            parsedLearningOutcomes = learningOutcomes ? learningOutcomes.split('\n').map(s => s.trim()).filter(Boolean) : null;
          }
        }
      } else {
        parsedLearningOutcomes = null;
      }
      updateData.learningOutcomes = parsedLearningOutcomes;
    }

    // Handle skills
    if (skills !== undefined) {
      let parsedSkills = skills;
      if (skills) {
        if (typeof skills === 'string') {
          try {
            parsedSkills = JSON.parse(skills);
          } catch (e) {
            // If not valid JSON, treat as comma-separated string
            parsedSkills = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : null;
          }
        }
      } else {
        parsedSkills = null;
      }
      updateData.skills = parsedSkills;
    }

    if (originalPrice !== undefined) {
      updateData.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    }

    // Validate instructor if provided
    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({
        where: { id: instructorId },
      });
      if (!instructor) {
        return res.status(400).json({
          success: false,
          message: 'Instructor not found',
        });
      }
      updateData.instructorId = instructorId;
    }

    // Validate category if provided
    if (categoryId !== undefined) {
      if (categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          return res.status(400).json({
            success: false,
            message: 'Category not found',
          });
        }
      }
      updateData.categoryId = categoryId || null;
    }

    // Video: uploaded file URL (S3) or YouTube link from body, or clear
    if (req.cloudinary?.videoUrl) {
      updateData.videoUrl = req.cloudinary.videoUrl;
      console.log('[Course update] Using uploaded video URL:', req.cloudinary.videoUrl);
    } else if (videoUrl !== undefined) {
      updateData.videoUrl = (String(videoUrl).trim() || null);
    }

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        instructor: true,
        category: true,
      },
    });

    res.json({
      success: true,
      data: course,
      message: 'Course updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Course with this slug already exists. Please use a different slug.',
      });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid instructor or category ID',
      });
    }
    console.error('Error updating course:', error);
    next(error);
  }
};

const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ONGOING', 'ARCHIVED'];

/**
 * Update course status only (Admin only) - for quick status toggle from list.
 * Syncs isOngoing: true when status is ONGOING so homepage "Ongoing Courses" stays in sync.
 */
export const updateCourseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: DRAFT, PUBLISHED, ONGOING, ARCHIVED',
      });
    }
    const isOngoing = status === 'ONGOING';
    const course = await prisma.course.update({
      where: { id },
      data: { status, isOngoing },
      include: {
        instructor: true,
        category: true,
      },
    });
    res.json({
      success: true,
      data: course,
      message: 'Course status updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }
    next(error);
  }
};

/**
 * Update course featured (Popular) flag only (Admin only)
 */
export const updateCourseFeatured = async (req, res, next) => {
  try {
    const { id } = req.params;
    const featured = req.body.featured === true || req.body.featured === 'true';
    const course = await prisma.course.update({
      where: { id },
      data: { featured },
      include: {
        instructor: true,
        category: true,
      },
    });
    res.json({
      success: true,
      data: course,
      message: course.featured ? 'Course marked as popular' : 'Course unmarked as popular',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }
    next(error);
  }
};

/**
 * Delete course (Admin only)
 */
export const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.course.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }
    next(error);
  }
};


