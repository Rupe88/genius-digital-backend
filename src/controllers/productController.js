import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** GET /api/products - list products */
export const getAllProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.featured === 'true') where.featured = true;
    if (req.query.categoryId) where.categoryId = req.query.categoryId;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/products/:id - get one product by id or slug */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { category: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/** POST /api/products - create product (admin, JSON body) */
export const createProduct = async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = body.name != null ? String(body.name).trim() : '';
    const slug = body.slug != null ? String(body.slug).trim() : '';
    const price = body.price != null ? Number(body.price) : NaN;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Product slug is required' });
    }
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a positive number' });
    }

    const orSlugSku = [{ slug }];
    if (body.sku && String(body.sku).trim()) orSlugSku.push({ sku: String(body.sku).trim() });
    const existing = await prisma.product.findFirst({
      where: { OR: orSlugSku },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Product with this slug or SKU already exists' });
    }

    let images = req.cloudinary?.imageUrls && req.cloudinary.imageUrls.length > 0 ? [...req.cloudinary.imageUrls] : [];
    if (body.images) {
      const fromBody = Array.isArray(body.images) ? body.images : (typeof body.images === 'string' ? (() => { try { const p = JSON.parse(body.images); return Array.isArray(p) ? p : [p]; } catch { return [body.images]; } })() : [body.images]);
      images = [...images, ...fromBody];
    }
    const dimensions = body.dimensions && typeof body.dimensions === 'object'
      ? body.dimensions
      : (typeof body.dimensions === 'string' && body.dimensions.trim() ? (() => { try { return JSON.parse(body.dimensions); } catch { return null; } })() : null);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: body.description ? String(body.description).trim() : null,
        shortDescription: body.shortDescription ? String(body.shortDescription).trim() : null,
        images: images.length ? images : [],
        price,
        comparePrice: body.comparePrice != null && body.comparePrice !== '' ? Number(body.comparePrice) : null,
        sku: body.sku ? String(body.sku).trim() : null,
        stock: Number.isInteger(Number(body.stock)) && Number(body.stock) >= 0 ? Number(body.stock) : 0,
        status: ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'].includes(body.status) ? body.status : 'ACTIVE',
        featured: body.featured === true || body.featured === 'true' || body.featured === '1',
        categoryId: body.categoryId && String(body.categoryId).trim() ? String(body.categoryId).trim() : null,
        productType: body.productType || null,
        vastuPurpose: body.vastuPurpose || null,
        energyType: body.energyType || null,
        material: body.material || null,
        dimensions,
      },
      include: { category: true },
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'A product with this slug or SKU already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }
    next(error);
  }
};

/** PUT /api/products/:id - update product (admin, JSON body) */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const slug = body.slug != null ? String(body.slug).trim() : product.slug;
    const sku = body.sku != null ? String(body.sku).trim() : product.sku;
    const orSlugSku = [{ slug }];
    if (sku) orSlugSku.push({ sku });
    if (slug !== product.slug || (sku && sku !== product.sku)) {
      const existing = await prisma.product.findFirst({
        where: { id: { not: id }, OR: orSlugSku },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Product with this slug or SKU already exists' });
      }
    }

    let imagesArray = product.images || [];
    const existingFromBody = body.existingImages ?? body.images;
    if (existingFromBody !== undefined) {
      const b = existingFromBody;
      imagesArray = Array.isArray(b) ? b : (typeof b === 'string' && b.trim() ? (() => { try { const p = JSON.parse(b); return Array.isArray(p) ? p : [p]; } catch { return [b]; } })() : []);
    }
    if (req.cloudinary?.imageUrls?.length) {
      imagesArray = [...imagesArray, ...req.cloudinary.imageUrls];
    }

    const data = {};
    if (body.name != null) data.name = String(body.name).trim();
    if (body.slug != null) data.slug = String(body.slug).trim();
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
    if (body.shortDescription !== undefined) data.shortDescription = body.shortDescription ? String(body.shortDescription).trim() : null;
    data.images = imagesArray;
    if (body.price != null) data.price = Number(body.price);
    if (body.comparePrice !== undefined) data.comparePrice = body.comparePrice != null && body.comparePrice !== '' ? Number(body.comparePrice) : null;
    if (body.sku !== undefined) data.sku = body.sku ? String(body.sku).trim() : null;
    if (body.stock !== undefined) data.stock = Math.max(0, parseInt(body.stock, 10) || 0);
    if (body.status != null && ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'].includes(body.status)) data.status = body.status;
    if (body.featured !== undefined) data.featured = body.featured === true || body.featured === 'true' || body.featured === '1';
    if (body.categoryId !== undefined) data.categoryId = body.categoryId && String(body.categoryId).trim() ? String(body.categoryId).trim() : null;
    if (body.productType !== undefined) data.productType = body.productType || null;
    if (body.vastuPurpose !== undefined) data.vastuPurpose = body.vastuPurpose || null;
    if (body.energyType !== undefined) data.energyType = body.energyType || null;
    if (body.material !== undefined) data.material = body.material || null;
    if (body.dimensions !== undefined) data.dimensions = body.dimensions && typeof body.dimensions === 'object' ? body.dimensions : null;

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });

    res.json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'A product with this slug or SKU already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }
    next(error);
  }
};

/** DELETE /api/products/:id - delete product (admin) */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (product._count.orderItems > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete product that has been ordered' });
    }
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/** GET /api/products/:id/reviews */
export const getProductReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId: id },
        include: { user: { select: { id: true, fullName: true, profileImage: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.productReview.count({ where: { productId: id } }),
    ]);
    res.json({
      success: true,
      data: reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/products/:id/reviews - create review (auth) */
export const createProductReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rating = parseInt(req.body.rating, 10);
    const comment = req.body.comment ? String(req.body.comment).trim() : null;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const userId = req.user.id;
    const existing = await prisma.productReview.findUnique({
      where: { userId_productId: { userId, productId: id } },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }
    const review = await prisma.productReview.create({
      data: { userId, productId: id, rating, comment },
      include: { user: { select: { id: true, fullName: true, profileImage: true } } },
    });
    res.status(201).json({ success: true, message: 'Review created successfully', data: review });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/products/:id/reviews/:reviewId */
export const updateProductReview = async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;
    const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    if (review.productId !== id) {
      return res.status(400).json({ success: false, message: 'Review does not belong to this product' });
    }
    if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this review' });
    }
    const data = {};
    if (req.body.rating != null) {
      const r = parseInt(req.body.rating, 10);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
      data.rating = r;
    }
    if (req.body.comment !== undefined) data.comment = req.body.comment ? String(req.body.comment).trim() : null;
    const updated = await prisma.productReview.update({
      where: { id: reviewId },
      data,
      include: { user: { select: { id: true, fullName: true, profileImage: true } } },
    });
    res.json({ success: true, message: 'Review updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/products/:id/reviews/:reviewId */
export const deleteProductReview = async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;
    const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    if (review.productId !== id) {
      return res.status(400).json({ success: false, message: 'Review does not belong to this product' });
    }
    if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
    }
    await prisma.productReview.delete({ where: { id: reviewId } });
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
};
