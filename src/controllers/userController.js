import { prisma } from '../config/database.js';
import { comparePassword, hashPassword } from '../utils/hashPassword.js';
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
        phone: true,
        profileImage: true,
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

/**
 * Update user profile (fullName, phone)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { fullName, phone } = req.body;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = String(fullName).trim();
    if (phone !== undefined) updateData.phone = phone === '' || phone == null ? null : String(phone).trim();

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        profileImage: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        preferredPaymentMethod: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password (authenticated user)
 */
export const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

