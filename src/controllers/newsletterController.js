import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


/**
 * Subscribe to newsletter (Public)
 */
export const subscribe = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, name } = req.body;

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Email is already subscribed',
        });
      } else {
        // Reactivate subscription
        const subscriber = await prisma.newsletterSubscriber.update({
          where: { email },
          data: {
            isActive: true,
            name,
            unsubscribedAt: null,
          },
        });

        return res.json({
          success: true,
          data: subscriber,
          message: 'Successfully resubscribed to newsletter',
        });
      }
    }

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email,
        name,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: subscriber,
      message: 'Successfully subscribed to newsletter',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Email is already subscribed',
      });
    }
    next(error);
  }
};

/**
 * Unsubscribe from newsletter (Public)
 */
export const unsubscribe = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in newsletter subscribers',
      });
    }

    if (!subscriber.isActive) {
      return res.json({
        success: true,
        message: 'Email is already unsubscribed',
      });
    }

    await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all subscribers (Admin only)
 */
export const getAllSubscribers = async (req, res, next) => {
  try {
    const { isActive, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: {
          subscribedAt: 'desc',
        },
      }),
      prisma.newsletterSubscriber.count({ where }),
    ]);

    res.json({
      success: true,
      data: subscribers,
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
 * Delete subscriber (Admin only)
 */
export const deleteSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.newsletterSubscriber.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Subscriber deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found',
      });
    }
    next(error);
  }
};

