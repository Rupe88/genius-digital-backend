import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';

/** Fallback when Prisma client was generated before ConsultationCategory existed (restart backend to use DB) */
const FALLBACK_CATEGORIES = [
  { id: 'fallback-business', name: 'Business', slug: 'business', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600', order: 1, isActive: true },
  { id: 'fallback-career', name: 'Career', slug: 'career', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600', order: 2, isActive: true },
  { id: 'fallback-vastu', name: 'Vastu', slug: 'vastu', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600', order: 3, isActive: true },
  { id: 'fallback-numerology', name: 'Numerology', slug: 'numerology', image: 'https://images.unsplash.com/photo-1518495978642-83e6f612a6ad?w=600', order: 4, isActive: true },
  { id: 'fallback-astrology', name: 'Astrology', slug: 'astrology', image: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=600', order: 5, isActive: true },
  { id: 'fallback-relationship', name: 'Relationship', slug: 'relationship', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600', order: 6, isActive: true },
  { id: 'fallback-health', name: 'Health & Wellness', slug: 'health-wellness', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600', order: 7, isActive: true },
  { id: 'fallback-other', name: 'Other', slug: 'other', image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600', order: 8, isActive: true },
];

/**
 * Get all active consultation categories (Public)
 */
export const getConsultationCategories = async (req, res, next) => {
  try {
    const delegate = prisma.consultationCategory;
    if (!delegate || typeof delegate.findMany !== 'function') {
      return res.json({ success: true, data: FALLBACK_CATEGORIES });
    }
    const categories = await delegate.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit consultation form (Public)
 */
export const submitConsultation = async (req, res, next) => {
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
      email, 
      phone, 
      categoryId,
      eventId, 
      consultationType,
      referralSource,
      referralSourceOther,
      source, 
      message 
    } = req.body;

    const consultation = await prisma.consultation.create({
      data: {
        name,
        email,
        phone,
        categoryId: categoryId || null,
        eventId,
        consultationType,
        referralSource,
        referralSourceOther: referralSource === 'OTHER' ? referralSourceOther : null,
        source, // Keep for backward compatibility
        message,
        status: 'PENDING',
      },
      include: {
        event: true,
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      data: consultation,
      message: 'Consultation submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all consultations (Admin only)
 */
export const getAllConsultations = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: {
          event: true,
          category: true,
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.consultation.count({ where }),
    ]);

    res.json({
      success: true,
      data: consultations,
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
 * Get consultation by ID (Admin only)
 */
export const getConsultationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        event: true,
        category: true,
      },
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found',
      });
    }

    res.json({
      success: true,
      data: consultation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update consultation status (Admin only)
 */
export const updateConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status !== 'PENDING') {
        updateData.respondedAt = new Date();
        updateData.respondedBy = req.user.id;
      }
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const consultation = await prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        event: true,
        category: true,
      },
    });

    res.json({
      success: true,
      data: consultation,
      message: 'Consultation updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found',
      });
    }
    next(error);
  }
};

/**
 * Delete consultation (Admin only)
 */
export const deleteConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.consultation.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Consultation deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found',
      });
    }
    next(error);
  }
};


