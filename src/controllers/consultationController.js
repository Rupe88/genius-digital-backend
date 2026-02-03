import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


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


