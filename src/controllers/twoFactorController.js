import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';
import { generateTwoFactorSecret, generateBackupCodes, verifyTwoFactorToken, verifyBackupCode } from '../services/twoFactorService.js';


/**
 * Setup 2FA (generate secret and QR code)
 */
export const setup2FA = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate secret and backup codes
    const { secret, otpAuthUrl } = generateTwoFactorSecret(user.email);
    const backupCodes = generateBackupCodes();

    // Update user with secret and backup codes (but don't enable yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
      },
    });

    res.json({
      success: true,
      data: {
        secret,
        qrCodeUrl: otpAuthUrl, // Frontend can use this to generate QR code
        backupCodes, // Show to user once, they should save these
      },
      message: 'Scan the QR code with your authenticator app and verify to enable 2FA',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify and enable 2FA
 */
export const enable2FA = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { token } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA not set up. Please set up 2FA first.',
      });
    }

    // Verify token
    const isValid = verifyTwoFactorToken(user.twoFactorSecret, token);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable 2FA
 */
export const disable2FA = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { password, token } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify password
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password',
      });
    }

    // If 2FA is enabled, verify token
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const isValidToken = verifyToken(token, user.twoFactorSecret);
      if (!isValidToken) {
        // Try backup code
        if (!token || !verifyBackupCode(token, user.twoFactorBackupCodes)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid verification code',
          });
        }
      }
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 2FA token (for login)
 */
export const verify2FAToken = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { userId, token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA not enabled for this user',
      });
    }

    // Try TOTP token first
    const isValidToken = verifyToken(token, user.twoFactorSecret);

    // If not valid, try backup code
    let usedBackupCode = false;
    if (!isValidToken) {
      const isValidBackup = verifyBackupCode(token, user.twoFactorBackupCodes);
      if (isValidBackup) {
        usedBackupCode = true;
        // Remove used backup code
        const updatedCodes = user.twoFactorBackupCodes.filter(
          code => code !== token.toUpperCase()
        );
        await prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorBackupCodes: updatedCodes,
          },
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
        });
      }
    }

    res.json({
      success: true,
      message: '2FA verification successful',
      usedBackupCode,
      remainingBackupCodes: usedBackupCode 
        ? (await prisma.user.findUnique({ where: { id: userId } })).twoFactorBackupCodes.length
        : user.twoFactorBackupCodes.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get 2FA status
 */
export const get2FAStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled,
        hasBackupCodes: user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0,
        backupCodesCount: user.twoFactorBackupCodes?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

