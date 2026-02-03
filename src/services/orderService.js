import { prisma } from '../config/database.js';

import { validateCoupon, applyCoupon } from './couponService.js';


/**
 * Generate unique order number
 */
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${timestamp}${random}`.toUpperCase();
};

/**
 * Create order from cart
 */
export const createOrderFromCart = async (userId, orderData) => {
  const { shippingAddress, billingAddress, couponCode } = orderData;

  // Use transaction for atomicity
  return await prisma.$transaction(async (tx) => {
    // Get user's cart
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate products and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      // Re-check product status and stock (important - stock may have changed)
      const currentProduct = await tx.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          price: true,
          status: true,
          stock: true,
        },
      });

      if (!currentProduct) {
        throw new Error(`Product "${item.product.name}" no longer exists`);
      }

      // Check if product is still available
      if (currentProduct.status !== 'ACTIVE') {
        throw new Error(`Product "${currentProduct.name}" is no longer available`);
      }

      // Re-check stock availability
      if (currentProduct.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${currentProduct.name}". Only ${currentProduct.stock} available`
        );
      }

      const itemTotal = parseFloat(currentProduct.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: currentProduct.id,
        quantity: item.quantity,
        price: parseFloat(currentProduct.price),
      });
    }

  // Apply coupon if provided
  let discount = 0;
  let couponId = null;
  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, subtotal, userId);
    if (!couponResult.valid) {
      throw new Error(couponResult.message);
    }

    const appliedCoupon = await applyCoupon(couponCode, subtotal, userId);
    discount = appliedCoupon.discountAmount;
    couponId = appliedCoupon.couponId;
  }

    // Calculate totals
    const tax = 0; // Can be calculated based on location
    const shipping = 0; // Can be calculated based on shipping method
    const total = subtotal - discount + tax + shipping;

    // Create order
    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        subtotal,
        discount,
        tax,
        shipping,
        total,
        couponId,
        shippingAddress: shippingAddress || {},
        billingAddress: billingAddress || shippingAddress || {},
        paymentMethod: 'OTHER', // Will be updated when payment is processed
        status: 'PENDING',
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        coupon: true,
      },
    });

    // DO NOT decrement stock here - wait for payment confirmation
    // Stock will be decremented in confirmOrderPayment function

    // Clear cart
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return order;
  });
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId, status, updates = {}) => {
  const validStatuses = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ];

  if (!validStatuses.includes(status)) {
    throw new Error('Invalid order status');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // If cancelling or refunding, restore stock
  if ((status === 'CANCELLED' || status === 'REFUNDED') && order.status !== 'CANCELLED' && order.status !== 'REFUNDED') {
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }
  }

  const updateData = {
    status,
    ...updates,
  };

  if (status === 'SHIPPED' && updates.trackingNumber) {
    updateData.trackingNumber = updates.trackingNumber;
    updateData.shippedAt = new Date();
  }

  if (status === 'DELIVERED') {
    updateData.deliveredAt = new Date();
  }

  return await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      items: {
        include: {
          product: true,
        },
      },
      coupon: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
};

/**
 * Confirm order payment and decrement stock (called after payment verification)
 */
export const confirmOrderPayment = async (orderId) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Order is already ${order.status}`);
    }

    // Decrement stock only after payment is confirmed
    for (const item of order.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true },
      });

      if (!product || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product?.name || item.productId}`);
      }

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Update order status
    return await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  });
};

/**
 * Get order by ID
 */
export const getOrderById = async (orderId, userId = null) => {
  const where = { id: orderId };
  
  // If userId provided, ensure user can only access their own orders (unless admin)
  if (userId) {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      where.userId = userId;
    }
  }

  return await prisma.order.findUnique({
    where,
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
      coupon: true,
      payments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });
};

