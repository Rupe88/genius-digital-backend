import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { sanitizeSearch } from '../utils/sanitize.js';
import { generateSlug } from '../utils/helpers.js';

const prisma = new PrismaClient();

/**
 * Get all blogs with filtering
 */
export const getAllBlogs = async (req, res, next) => {
  try {
    const {
      status,
      featured,
      categoryId,
      authorId,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;
    const where = {};

    // Only show published blogs to public, admins can see all
    if (req.user?.role !== 'ADMIN') {
      where.status = 'PUBLISHED';
    } else if (status) {
      where.status = status;
    }

    if (featured === 'true') where.featured = true;
    if (categoryId) where.categoryId = categoryId;
    if (authorId) where.authorId = authorId;

    // Search filter
    if (search) {
      const sanitizedSearch = sanitizeSearch(search);
      if (sanitizedSearch) {
        where.OR = [
          { title: { contains: sanitizedSearch, mode: 'insensitive' } },
          { excerpt: { contains: sanitizedSearch, mode: 'insensitive' } },
          { content: { contains: sanitizedSearch, mode: 'insensitive' } },
        ];
      }
    }

    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
          category: true,
          _count: {
            select: {
              comments: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: {
          publishedAt: 'desc',
        },
      }),
      prisma.blog.count({ where }),
    ]);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blog by ID or slug
 */
export const getBlogById = async (req, res, next) => {
  try {
    const id = (req.params.id || '').trim();
    const normalizedSlug = generateSlug(id);
    const orConditions = [{ id }, { slug: id }];
    if (normalizedSlug) orConditions.push({ slug: { equals: normalizedSlug, mode: 'insensitive' } });

    const blog = await prisma.blog.findFirst({
      where: {
        OR: orConditions,
        // Only show published blogs to public
        ...(req.user?.role !== 'ADMIN' ? { status: 'PUBLISHED' } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        category: true,
        comments: {
          where: {
            isApproved: true,
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            },
            replies: {
              where: {
                isApproved: true,
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
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Increment view count
    await prisma.blog.update({
      where: { id: blog.id },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      data: {
        ...blog,
        views: blog.views + 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create blog (Admin/Author)
 */
export const createBlog = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    // Handle Image Upload
    if (req.cloudinary && req.cloudinary.url) {
      req.body.featuredImage = req.cloudinary.url;
    }

    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      categoryId,
      status,
      featured,
      tags,
      seoTitle,
      seoDescription,
    } = req.body;

    const authorId = req.user.id;

    // Check if slug already exists
    const existing = await prisma.blog.findUnique({
      where: { slug },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Blog with this slug already exists',
      });
    }

    const blogData = {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      authorId,
      categoryId: categoryId || null,
      status: status || 'DRAFT',
      featured: featured === true || featured === 'true',
      tags: tags || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    };

    const blog = await prisma.blog.create({
      data: blogData,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            fullName: true,
          },
        },
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update blog
 */
export const updateBlog = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    // Handle Image Upload
    if (req.cloudinary && req.cloudinary.url) {
      req.body.featuredImage = req.cloudinary.url;
    }

    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      categoryId,
      status,
      featured,
      tags,
      seoTitle,
      seoDescription,
    } = req.body;

    const blog = await prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Check authorization - author or admin
    if (blog.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this blog',
      });
    }

    // Check if slug already exists (excluding current blog)
    if (slug && slug !== blog.slug) {
      const existing = await prisma.blog.findUnique({
        where: { slug },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Blog with this slug already exists',
        });
      }
    }

    const updateData = {
      ...(title && { title }),
      ...(slug && { slug }),
      ...(excerpt !== undefined && { excerpt }),
      ...(content !== undefined && { content }),
      ...(featuredImage !== undefined && { featuredImage }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(status && { status }),
      ...(featured !== undefined && { featured: featured === true || featured === 'true' }),
      ...(tags !== undefined && { tags }),
      ...(seoTitle !== undefined && { seoTitle }),
      ...(seoDescription !== undefined && { seoDescription }),
    };

    // Set publishedAt if status changed to PUBLISHED
    if (status === 'PUBLISHED' && blog.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    const updatedBlog = await prisma.blog.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        category: true,
      },
    });

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: updatedBlog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete blog
 */
export const deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const blog = await prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Check authorization - author or admin
    if (blog.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this blog',
      });
    }

    await prisma.blog.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
