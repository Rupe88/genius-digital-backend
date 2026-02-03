import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


/**
 * Update user's preferred payment method
 */
export const updatePaymentPreference = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { preferredPaymentMethod } = req.body;
    const userId = req.user.id;

    const validMethods = ['ESEWA', 'MOBILE_BANKING', 'VISA_CARD', 'MASTERCARD'];
    if (!validMethods.includes(preferredPaymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method',
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        preferredPaymentMethod,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        preferredPaymentMethod: true,
      },
    });

    res.json({
      success: true,
      data: user,
      message: 'Payment preference updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        preferredPaymentMethod: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

