import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';
import * as notificationService from '../services/notificationService.js';


/**
 * Get user's notifications
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      isRead,
      type,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { userId };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.notification.count({ where }),
      notificationService.getUnreadCount(userId),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
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
 * Get unread notifications count
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await notificationService.markAsRead(id, userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Not authorized')) {
      return res.status(error.message.includes('Not authorized') ? 403 : 404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        count: result.count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await notificationService.deleteNotification(id, userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Not authorized')) {
      return res.status(error.message.includes('Not authorized') ? 403 : 404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Create notification (Admin only)
 */
export const createNotification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { userId, title, message, type, link } = req.body;

    const notification = await notificationService.createNotification(userId, {
      title,
      message,
      type,
      link,
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create bulk notifications (Admin only)
 */
export const createBulkNotifications = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { userIds, title, message, type, link } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required',
      });
    }

    const result = await notificationService.createBulkNotifications(userIds, {
      title,
      message,
      type,
      link,
    });

    res.status(201).json({
      success: true,
      message: `Notifications created for ${result.count} users`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

