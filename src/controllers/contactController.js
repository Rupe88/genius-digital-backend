import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Submit contact form (Public)
 */
export const submitContact = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, email, phone, subject, message } = req.body;

    const contact = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      data: contact,
      message: 'Contact form submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all contact submissions (Admin only)
 */
export const getAllContacts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const [contacts, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    res.json({
      success: true,
      data: contacts,
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
 * Get contact by ID (Admin only)
 */
export const getContactById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contactSubmission.findUnique({
      where: { id },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found',
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update contact status (Admin only)
 */
export const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const contact = await prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });

    res.json({
      success: true,
      data: contact,
      message: 'Contact status updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found',
      });
    }
    next(error);
  }
};

/**
 * Delete contact (Admin only)
 */
export const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.contactSubmission.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Contact submission deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found',
      });
    }
    next(error);
  }
};

