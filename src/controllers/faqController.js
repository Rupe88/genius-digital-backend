import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


/**
 * Get all FAQs (Public)
 */
export const getAllFAQs = async (req, res, next) => {
  try {
    const { category, search, isActive } = req.query;

    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: faqs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get FAQ by ID (Public)
 */
export const getFAQById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const faq = await prisma.fAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
      });
    }

    res.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create FAQ (Admin only)
 */
export const createFAQ = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { question, answer, category, order, isActive } = req.body;

    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        category,
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({
      success: true,
      data: faq,
      message: 'FAQ created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update FAQ (Admin only)
 */
export const updateFAQ = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { question, answer, category, order, isActive } = req.body;

    const updateData = {};
    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (category !== undefined) updateData.category = category;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const faq = await prisma.fAQ.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: faq,
      message: 'FAQ updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
      });
    }
    next(error);
  }
};

/**
 * Delete FAQ (Admin only)
 */
export const deleteFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.fAQ.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
      });
    }
    next(error);
  }
};

