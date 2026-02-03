import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


/**
 * Get user's cart
 */
export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Create cart if it doesn't exist
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
        },
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
        },
      });
    }

    // Calculate totals
    let subtotal = 0;
    cart.items.forEach((item) => {
      subtotal += parseFloat(item.product.price) * item.quantity;
    });

    res.json({
      success: true,
      data: {
        ...cart,
        subtotal: subtotal.toFixed(2),
        itemCount: cart.items.length,
        totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add item to cart
 */
export const addToCart = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        status: true,
        stock: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (product.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Product is not available',
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.stock} available`,
      });
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      if (product.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Only ${product.stock} available`,
        });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cartItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Get cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        product: true,
      },
    });

    if (!cartItem || cartItem.cartId !== cart.id) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      await prisma.cartItem.delete({
        where: { id: itemId },
      });

      return res.json({
        success: true,
        message: 'Item removed from cart',
        data: null,
      });
    }

    // Check stock availability
    if (cartItem.product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${cartItem.product.stock} available`,
      });
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Get cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!cartItem || cartItem.cartId !== cart.id) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear cart
 */
export const clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    res.json({
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};

