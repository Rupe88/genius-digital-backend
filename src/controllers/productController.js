import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { sanitizeSearch } from '../utils/sanitize.js';

const prisma = new PrismaClient();

/**
 * Get all products with filtering
 */
export const getAllProducts = async (req, res, next) => {
  try {
    const {
      status,
      featured,
      categoryId,
      search,
      minPrice,
      maxPrice,
      inStock,
      page = 1,
      limit = 10,
      sortBy = 'newest',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (featured === 'true') where.featured = true;
    if (categoryId) where.categoryId = categoryId;

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Stock filter
    if (inStock === 'true') {
      where.stock = { gt: 0 };
    } else if (inStock === 'false') {
      where.stock = { lte: 0 };
    }

    // Search filter
    if (search) {
      const sanitizedSearch = sanitizeSearch(search);
      if (sanitizedSearch) {
        where.OR = [
          { name: { contains: sanitizedSearch, mode: 'insensitive' } },
          { description: { contains: sanitizedSearch, mode: 'insensitive' } },
          { shortDescription: { contains: sanitizedSearch, mode: 'insensitive' } },
          { sku: { contains: sanitizedSearch, mode: 'insensitive' } },
        ];
      }
    }

    // Sort options
    let orderBy = {};
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'price-low':
        orderBy = { price: 'asc' };
        break;
      case 'price-high':
        orderBy = { price: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: {
              reviews: true,
              cartItems: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
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
 * Get product by ID or slug
 */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
      include: {
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Calculate average rating
    const reviews = await prisma.productReview.findMany({
      where: { productId: product.id },
      select: { rating: true },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;

    res.json({
      success: true,
      data: {
        ...product,
        averageRating: avgRating,
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create product (Admin only)
 */
export const createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      name,
      slug,
      description,
      shortDescription,
      images,
      price,
      comparePrice,
      sku,
      stock,
      status,
      featured,
      categoryId,
      // Vastu specific fields
      productType,
      vastuPurpose,
      energyType,
      material,
      dimensions,
    } = req.body;

    // Check if slug or SKU already exists
    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, sku ? { sku } : {}],
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Product with this slug or SKU already exists',
      });
    }

    // Validate images format
    let imagesArray = [];
    if (images) {
      if (Array.isArray(images)) {
        imagesArray = images;
      } else if (typeof images === 'string') {
        try {
          imagesArray = JSON.parse(images);
        } catch {
          imagesArray = [images];
        }
      }
    }

    // Handle dimensions
    let dimensionsData = null;
    if (dimensions && (dimensions.length || dimensions.width || dimensions.height)) {
      dimensionsData = {
        length: dimensions.length ? parseFloat(dimensions.length) : null,
        width: dimensions.width ? parseFloat(dimensions.width) : null,
        height: dimensions.height ? parseFloat(dimensions.height) : null,
      };
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        shortDescription,
        images: imagesArray,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        sku,
        stock: parseInt(stock) || 0,
        status: status || 'ACTIVE',
        featured: typeof featured === 'boolean' ? featured : featured === 'true' || featured === true,
        categoryId: categoryId && categoryId.trim() !== '' ? categoryId : null,
        // Vastu specific fields
        productType: productType || null,
        vastuPurpose: vastuPurpose || null,
        energyType: energyType || null,
        material: material || null,
        dimensions: dimensionsData,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (Admin only)
 */
export const updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const {
      name,
      slug,
      description,
      shortDescription,
      images,
      price,
      comparePrice,
      sku,
      stock,
      status,
      featured,
      categoryId,
      // Vastu specific fields
      productType,
      vastuPurpose,
      energyType,
      material,
      dimensions,
    } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if slug or SKU already exists (excluding current product)
    if (slug || sku) {
      const existing = await prisma.product.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                slug ? { slug } : {},
                sku ? { sku } : {},
              ],
            },
          ],
        },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Product with this slug or SKU already exists',
        });
      }
    }

    // Handle images
    let imagesArray = product.images;
    if (images !== undefined) {
      if (Array.isArray(images)) {
        imagesArray = images;
      } else if (typeof images === 'string') {
        try {
          imagesArray = JSON.parse(images);
        } catch {
          imagesArray = [images];
        }
      }
    }

    // Handle dimensions
    let dimensionsData = product.dimensions;
    if (dimensions !== undefined) {
      if (dimensions && (dimensions.length || dimensions.width || dimensions.height)) {
        dimensionsData = {
          length: dimensions.length ? parseFloat(dimensions.length) : null,
          width: dimensions.width ? parseFloat(dimensions.width) : null,
          height: dimensions.height ? parseFloat(dimensions.height) : null,
        };
      } else {
        dimensionsData = null;
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(images !== undefined && { images: imagesArray }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(comparePrice !== undefined && {
          comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        }),
        ...(sku !== undefined && { sku }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(status && { status }),
        ...(featured !== undefined && { featured: featured === true || featured === 'true' }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        // Vastu specific fields
        ...(productType !== undefined && { productType }),
        ...(vastuPurpose !== undefined && { vastuPurpose }),
        ...(energyType !== undefined && { energyType }),
        ...(material !== undefined && { material }),
        ...(dimensions !== undefined && { dimensions: dimensionsData }),
      },
      include: {
        category: true,
      },
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (Admin only)
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orderItems: true,
            cartItems: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if product is in any orders
    if (product._count.orderItems > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product that has been ordered',
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product reviews
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId: id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.productReview.count({ where: { productId: id } }),
    ]);

    res.json({
      success: true,
      data: reviews,
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
 * Create product review
 */
export const createProductReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.productReview.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: id,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    const review = await prisma.productReview.create({
      data: {
        userId,
        productId: id,
        rating: parseInt(rating),
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product review
 */
export const updateProductReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id, reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (review.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review',
      });
    }

    if (review.productId !== id) {
      return res.status(400).json({
        success: false,
        message: 'Review does not belong to this product',
      });
    }

    const updatedReview = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined && { rating: parseInt(rating) }),
        ...(comment !== undefined && { comment }),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product review
 */
export const deleteProductReview = async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;
    const userId = req.user.id;

    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (review.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review',
      });
    }

    if (review.productId !== id) {
      return res.status(400).json({
        success: false,
        message: 'Review does not belong to this product',
      });
    }

    await prisma.productReview.delete({
      where: { id: reviewId },
    });

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

