import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


/**
 * Get all published testimonials (Public)
 */
export const getTestimonials = async (req, res, next) => {
  try {
    const { featured, courseId, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isPublished: true,
    };
    if (featured === 'true') where.featured = true;
    if (courseId) where.courseId = courseId;

    const [testimonials, total] = await Promise.all([
      prisma.testimonial.findMany({
        where,
        include: {
          course: {
            include: {
              instructor: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: [
          { featured: 'desc' },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.testimonial.count({ where }),
    ]);

    res.json({
      success: true,
      data: testimonials,
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
 * Get testimonial by ID (Public)
 */
export const getTestimonialById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const testimonial = await prisma.testimonial.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            instructor: true,
          },
        },
      },
    });

    if (!testimonial || !testimonial.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
    }

    res.json({
      success: true,
      data: testimonial,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create testimonial (Admin only)
 */
export const createTestimonial = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstMsg = errors.array()[0]?.msg || 'Validation failed';
      return res.status(400).json({
        success: false,
        message: firstMsg,
        errors: errors.array(),
      });
    }

    const {
      name,
      image,
      designation,
      company,
      rating,
      comment,
      courseId,
      isPublished,
      featured,
      order,
    } = req.body;

    // Multipart sends all fields as strings; coerce for Prisma
    const ratingNum = rating != null && rating !== '' ? parseInt(rating, 10) : 5;
    const orderNum = order != null && order !== '' ? parseInt(order, 10) : 0;
    const isPublishedBool = isPublished === true || isPublished === 'true' || isPublished === '1';
    const featuredBool = featured === true || featured === 'true' || featured === '1';
    const courseIdVal = courseId && String(courseId).trim() ? String(courseId).trim() : null;

    const testimonial = await prisma.testimonial.create({
      data: {
        name: String(name).trim(),
        image: req.cloudinary?.url || (image && String(image).trim()) || null,
        designation: designation ? String(designation).trim() : null,
        company: company ? String(company).trim() : null,
        rating: Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : 5,
        comment: String(comment).trim(),
        courseId: courseIdVal,
        isPublished: isPublishedBool,
        featured: featuredBool,
        order: Number.isInteger(orderNum) && orderNum >= 0 ? orderNum : 0,
      },
      include: {
        course: true,
      },
    });

    res.status(201).json({
      success: true,
      data: testimonial,
      message: 'Testimonial created successfully',
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid course. Please select a valid course or leave empty for general testimonial.',
      });
    }
    next(error);
  }
};

/**
 * Update testimonial (Admin only)
 */
export const updateTestimonial = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstMsg = errors.array()[0]?.msg || 'Validation failed';
      return res.status(400).json({
        success: false,
        message: firstMsg,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const {
      name,
      image,
      designation,
      company,
      rating,
      comment,
      courseId,
      isPublished,
      featured,
      order,
    } = req.body;

    const updateData = {};
    if (name != null) updateData.name = String(name).trim();
    if (req.cloudinary?.url || (image && String(image).trim())) {
      updateData.image = req.cloudinary?.url || (image && String(image).trim()) || null;
    }
    if (designation !== undefined) updateData.designation = designation ? String(designation).trim() : null;
    if (company !== undefined) updateData.company = company ? String(company).trim() : null;
    if (rating !== undefined) {
      const ratingNum = parseInt(rating, 10);
      updateData.rating = Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : 5;
    }
    if (comment != null) updateData.comment = String(comment).trim();
    if (courseId !== undefined) updateData.courseId = courseId && String(courseId).trim() ? String(courseId).trim() : null;
    if (isPublished !== undefined) updateData.isPublished = isPublished === true || isPublished === 'true' || isPublished === '1';
    if (featured !== undefined) updateData.featured = featured === true || featured === 'true' || featured === '1';
    if (order !== undefined) {
      const orderNum = parseInt(order, 10);
      updateData.order = Number.isInteger(orderNum) && orderNum >= 0 ? orderNum : 0;
    }

    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
      },
    });

    res.json({
      success: true,
      data: testimonial,
      message: 'Testimonial updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
    }
    next(error);
  }
};

/**
 * Delete testimonial (Admin only)
 */
export const deleteTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.testimonial.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Testimonial deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
    }
    next(error);
  }
};


