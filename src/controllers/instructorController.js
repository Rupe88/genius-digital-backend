import { prisma } from '../config/database.js';
import { validationResult } from 'express-validator';
import { generateSlug } from '../utils/helpers.js';
import { isS3Configured, isOurS3Url, getSignedUrlForMediaUrl, resolveStorageUrl } from '../services/storageService.js';

const maskInstructorImage = async (instructor) => {
  if (!instructor?.image) return instructor;
  instructor.image = resolveStorageUrl(instructor.image);
  if (isS3Configured() && isOurS3Url(instructor.image)) {
    try {
      instructor.image = await getSignedUrlForMediaUrl(instructor.image, 3600);
    } catch (err) {
      console.warn('[instructor] Signed image URL failed:', instructor.id, err?.message);
    }
  }
  return instructor;
};

/**
 * Get all instructors
 */
export const getAllInstructors = async (req, res, next) => {
  try {
    const { featured } = req.query;
    
    const where = {};
    if (featured === 'true') {
      where.featured = true;
    }

    const instructors = await prisma.instructor.findMany({
      where,
      include: {
        _count: {
          select: {
            courses: true,
            liveClasses: true,
          },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Ensure numeric fields are properly parsed
    const processedInstructors = instructors.map(instructor => ({
      ...instructor,
      commissionRate: instructor.commissionRate ? parseFloat(instructor.commissionRate) : null,
      totalEarnings: instructor.totalEarnings ? parseFloat(instructor.totalEarnings) : 0,
      paidEarnings: instructor.paidEarnings ? parseFloat(instructor.paidEarnings) : 0,
      pendingEarnings: instructor.pendingEarnings ? parseFloat(instructor.pendingEarnings) : 0,
      order: parseInt(instructor.order) || 0,
    }));

    await Promise.all(processedInstructors.map((instructor) => maskInstructorImage(instructor)));

    res.json({
      success: true,
      data: processedInstructors,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get courses assigned to logged-in instructor
 */
export const getMyInstructorCourses = async (req, res, next) => {
  try {
    const email = String(req.user?.email || '').trim();
    const fullName = String(req.user?.fullName || '').trim();

    const instructor = await prisma.instructor.findFirst({
      where: {
        OR: [
          ...(email ? [{ email: { equals: email, mode: 'insensitive' } }] : []),
          ...(fullName ? [{ name: { equals: fullName, mode: 'insensitive' } }] : []),
        ],
      },
      select: { id: true, name: true, email: true },
    });

    if (!instructor) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const courses = await prisma.course.findMany({
      where: { instructorId: instructor.id },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
        status: true,
        _count: {
          select: {
            chapters: true,
            lessons: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (isS3Configured()) {
      await Promise.all(
        courses.map(async (course) => {
          if (course.thumbnail) {
            course.thumbnail = resolveStorageUrl(course.thumbnail);
          }
          if (course.thumbnail && isOurS3Url(course.thumbnail)) {
            try {
              course.thumbnail = await getSignedUrlForMediaUrl(course.thumbnail, 3600);
            } catch (err) {
              console.warn('[instructor] Signed thumbnail URL failed:', course.id, err?.message);
            }
          }
        })
      );
    }

    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get instructor by ID or slug
 */
export const getInstructorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const instructor = await prisma.instructor.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
      include: {
        courses: {
          where: {
            status: 'PUBLISHED',
          },
          take: 10,
        },
        liveClasses: {
          where: {
            status: {
              in: ['SCHEDULED', 'LIVE'],
            },
          },
          take: 10,
        },
      },
    });

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found',
      });
    }

    // Ensure numeric fields are properly parsed
    const processedInstructor = {
      ...instructor,
      commissionRate: instructor.commissionRate ? parseFloat(instructor.commissionRate) : null,
      totalEarnings: instructor.totalEarnings ? parseFloat(instructor.totalEarnings) : 0,
      paidEarnings: instructor.paidEarnings ? parseFloat(instructor.paidEarnings) : 0,
      pendingEarnings: instructor.pendingEarnings ? parseFloat(instructor.pendingEarnings) : 0,
      order: parseInt(instructor.order) || 0,
    };

    await maskInstructorImage(processedInstructor);

    res.json({
      success: true,
      data: processedInstructor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create instructor (Admin only)
 */
export const createInstructor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      name,
      slug,
      image,
      bio,
      designation,
      specialization,
      email,
      phone,
      socialLinks,
      featured,
      order,
      commissionRate,
      bankName,
      accountNumber,
      ifscCode,
      panNumber,
    } = req.body;

    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug && name) {
      finalSlug = generateSlug(name);
      
      // Ensure slug is unique
      let uniqueSlug = finalSlug;
      let counter = 1;
      let slugExists = await prisma.instructor.findUnique({
        where: { slug: uniqueSlug },
      });
      
      while (slugExists) {
        uniqueSlug = `${finalSlug}-${counter}`;
        slugExists = await prisma.instructor.findUnique({
          where: { slug: uniqueSlug },
        });
        counter++;
      }
      finalSlug = uniqueSlug;
    }

    // Parse FormData values to correct types
    const parsedFeatured = featured === 'true' || featured === true || featured === '1';
    const parsedOrder = order ? parseInt(order, 10) : 0;
    const parsedCommissionRate = commissionRate ? parseFloat(commissionRate) : 30.0;

    const instructor = await prisma.instructor.create({
      data: {
        name,
        slug: finalSlug,
        image: req.cloudinary?.url || image,
        bio: bio || null,
        designation: designation || null,
        specialization: specialization || null,
        email: email || null,
        phone: phone || null,
        socialLinks: socialLinks ? (typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks) : null,
        featured: parsedFeatured,
        order: parsedOrder,
        commissionRate: parsedCommissionRate,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        panNumber: panNumber || null,
      },
    });

    await maskInstructorImage(instructor);

    res.status(201).json({
      success: true,
      data: instructor,
      message: 'Instructor created successfully',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Instructor with this slug already exists',
      });
    }
    next(error);
  }
};

/**
 * Update instructor (Admin only)
 */
export const updateInstructor = async (req, res, next) => {
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
      name,
      slug,
      image,
      bio,
      designation,
      specialization,
      email,
      phone,
      socialLinks,
      featured,
      order,
      commissionRate,
      bankName,
      accountNumber,
      ifscCode,
      panNumber,
    } = req.body;

    const existingInstructor = await prisma.instructor.findUnique({
      where: { id },
    });

    if (!existingInstructor) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found',
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    
    // Handle slug: if name changed and slug not provided, auto-generate
    if (slug) {
      updateData.slug = slug;
    } else if (name && name !== existingInstructor.name) {
      // Name changed, auto-generate slug
      let finalSlug = generateSlug(name);
      
      // Ensure slug is unique (excluding current instructor)
      let uniqueSlug = finalSlug;
      let counter = 1;
      let slugExists = await prisma.instructor.findFirst({
        where: {
          slug: uniqueSlug,
          NOT: { id },
        },
      });
      
      while (slugExists) {
        uniqueSlug = `${finalSlug}-${counter}`;
        slugExists = await prisma.instructor.findFirst({
          where: {
            slug: uniqueSlug,
            NOT: { id },
          },
        });
        counter++;
      }
      updateData.slug = uniqueSlug;
    }
    if (req.cloudinary?.url || image) {
      updateData.image = req.cloudinary?.url || image;
    }
    if (bio !== undefined) updateData.bio = bio;
    if (designation !== undefined) updateData.designation = designation;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (socialLinks !== undefined) {
      updateData.socialLinks = typeof socialLinks === 'string' 
        ? JSON.parse(socialLinks) 
        : socialLinks;
    }
    // Parse FormData boolean and integer values
    if (featured !== undefined) {
      updateData.featured = featured === 'true' || featured === true || featured === '1';
    }
    if (order !== undefined) {
      updateData.order = order ? parseInt(order, 10) : 0;
    }
    if (commissionRate !== undefined) {
      updateData.commissionRate = commissionRate ? parseFloat(commissionRate) : 30.0;
    }
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (ifscCode !== undefined) updateData.ifscCode = ifscCode;
    if (panNumber !== undefined) updateData.panNumber = panNumber;

    const instructor = await prisma.instructor.update({
      where: { id },
      data: updateData,
    });

    await maskInstructorImage(instructor);

    res.json({
      success: true,
      data: instructor,
      message: 'Instructor updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found',
      });
    }
    next(error);
  }
};

/**
 * Delete instructor (Admin only)
 */
export const deleteInstructor = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if instructor has courses
    const courseCount = await prisma.course.count({
      where: { instructorId: id },
    });

    if (courseCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete instructor with associated courses',
      });
    }

    await prisma.instructor.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Instructor deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found',
      });
    }
    next(error);
  }
};


