import { prisma } from '../config/database.js';



/**
 * Create notification
 */
export const createNotification = async (userId, notificationData) => {
  const { title, message, type = 'INFO', link = null } = notificationData;

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
      isRead: false,
    },
  });

  return notification;
};

/**
 * Create notifications for multiple users
 */
export const createBulkNotifications = async (userIds, notificationData) => {
  const notifications = userIds.map((userId) => ({
    userId,
    title: notificationData.title,
    message: notificationData.message,
    type: notificationData.type || 'INFO',
    link: notificationData.link || null,
    isRead: false,
  }));

  const created = await prisma.notification.createMany({
    data: notifications,
  });

  return created;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  // Check authorization
  if (notification.userId !== userId) {
    throw new Error('Not authorized to update this notification');
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (userId) => {
  return await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  // Check authorization
  if (notification.userId !== userId) {
    throw new Error('Not authorized to delete this notification');
  }

  return await prisma.notification.delete({
    where: { id: notificationId },
  });
};

/**
 * Get unread count
 */
export const getUnreadCount = async (userId) => {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
};

