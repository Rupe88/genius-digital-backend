import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import * as orderService from '../services/orderService.js';

const prisma = new PrismaClient();

/**
 * Get all orders (User sees own orders, Admin sees all)
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      userId,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const currentUser = req.user;

    const where = {};

    // Users can only see their own orders, admins can see all
    if (currentUser.role !== 'ADMIN') {
      where.userId = currentUser.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
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
 * Get order by ID
 */
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await orderService.getOrderById(id, userId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create order from cart
 */
export const createOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { shippingAddress, billingAddress, couponCode } = req.body;
    const userId = req.user.id;

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required',
      });
    }

    const order = await orderService.createOrderFromCart(userId, {
      shippingAddress,
      billingAddress,
      couponCode,
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (Admin only)
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const updates = {};
    if (trackingNumber) {
      updates.trackingNumber = trackingNumber;
    }

    const order = await orderService.updateOrderStatus(id, status, updates);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    if (order.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order',
      });
    }

    // Only allow cancellation if order is pending or confirmed
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    const cancelledOrder = await orderService.updateOrderStatus(id, 'CANCELLED');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: cancelledOrder,
    });
  } catch (error) {
    next(error);
  }
};

