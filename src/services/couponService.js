import { prisma } from '../config/database.js';



/**
 * Validate coupon code
 */
export const validateCoupon = async (code, userId, amount, courseId = null, productIds = []) => {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon) {
    return {
      valid: false,
      message: 'Invalid coupon code',
    };
  }

  // Check status
  if (coupon.status !== 'ACTIVE') {
    return {
      valid: false,
      message: 'Coupon is not active',
    };
  }

  // Check validity dates
  const now = new Date();
  if (now < coupon.validFrom || now > coupon.validUntil) {
    return {
      valid: false,
      message: 'Coupon has expired',
    };
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return {
      valid: false,
      message: 'Coupon usage limit reached',
    };
  }

  // Check user limit
  if (coupon.userLimit && userId) {
    const userUsageCount = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId,
      },
    });

    if (userUsageCount >= coupon.userLimit) {
      return {
        valid: false,
        message: 'You have already used this coupon',
      };
    }
  }

  // Check minimum purchase
  if (coupon.minPurchase && amount < coupon.minPurchase) {
    return {
      valid: false,
      message: `Minimum purchase of ${coupon.minPurchase} required`,
    };
  }

  // Check applicability
  if (coupon.applicableCourses && courseId) {
    const applicableCourses = typeof coupon.applicableCourses === 'string' 
      ? JSON.parse(coupon.applicableCourses) 
      : coupon.applicableCourses;
    if (Array.isArray(applicableCourses) && !applicableCourses.includes(courseId)) {
      return {
        valid: false,
        message: 'Coupon not applicable to this course',
      };
    }
  }

  if (coupon.applicableProducts && productIds.length > 0) {
    const applicableProducts = typeof coupon.applicableProducts === 'string'
      ? JSON.parse(coupon.applicableProducts)
      : coupon.applicableProducts;
    if (Array.isArray(applicableProducts)) {
      const hasApplicableProduct = productIds.some(id => applicableProducts.includes(id));
      if (!hasApplicableProduct) {
        return {
          valid: false,
          message: 'Coupon not applicable to selected products',
        };
      }
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.couponType === 'PERCENTAGE') {
    discountAmount = (amount * parseFloat(coupon.discountValue)) / 100;
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = parseFloat(coupon.maxDiscount);
    }
  } else {
    discountAmount = parseFloat(coupon.discountValue);
    if (discountAmount > amount) {
      discountAmount = amount;
    }
  }

  return {
    valid: true,
    coupon,
    discountAmount,
    finalAmount: amount - discountAmount,
  };
};

/**
 * Apply coupon
 */
export const applyCoupon = async (couponId, userId, orderId, paymentId, discountAmount) => {
  // Create coupon usage record
  const couponUsage = await prisma.couponUsage.create({
    data: {
      couponId,
      userId,
      orderId,
      paymentId,
      discountAmount,
    },
  });

  // Update coupon usage count
  await prisma.coupon.update({
    where: { id: couponId },
    data: {
      usedCount: {
        increment: 1,
      },
    },
  });

  return couponUsage;
};

export default {
  validateCoupon,
  applyCoupon,
};


