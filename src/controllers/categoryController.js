import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';
import { generateSlug } from '../utils/helpers.js';


/**
 * Get all categories
 */
export const getAllCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    
    const where = {};
    if (type) {
      where.type = type;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            courses: true,
            blogs: true,
            products: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID or slug
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
      include: {
        parent: true,
        children: true,
        courses: {
          where: {
            status: 'PUBLISHED',
          },
          take: 10,
        },
        blogs: {
          where: {
            status: 'PUBLISHED',
          },
          take: 10,
        },
        products: {
          where: {
            status: 'ACTIVE',
          },
          take: 10,
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create category (Admin only)
 */
export const createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, slug, description, image, type, parentId } = req.body;

    // Auto-generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug && name) {
      finalSlug = generateSlug(name);
      
      // Ensure slug is unique
      let slugExists = await prisma.category.findUnique({ where: { slug: finalSlug } });
      let counter = 1;
      while (slugExists) {
        finalSlug = `${generateSlug(name)}-${counter}`;
        slugExists = await prisma.category.findUnique({ where: { slug: finalSlug } });
        counter++;
      }
    }

    // Validate parent category if provided
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
        });
      }
      // Ensure parent has same type
      if (type && parent.type !== type) {
        return res.status(400).json({
          success: false,
          message: 'Parent category must have the same type',
        });
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: finalSlug,
        description: description || null,
        image: req.cloudinary?.url || image || null,
        type: type || 'COURSE',
        parentId: parentId || null,
      },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            courses: true,
            blogs: true,
            products: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Category with this slug already exists. Please use a different slug.',
      });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid parent category ID',
      });
    }
    console.error('Error creating category:', error);
    next(error);
  }
};

/**
 * Update category (Admin only)
 */
export const updateCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, slug, description, image, type, parentId } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Handle slug: if name changed and slug not provided, auto-generate
    let finalSlug = slug;
    if (!finalSlug && name && name !== existingCategory.name) {
      finalSlug = generateSlug(name);
      
      // Ensure slug is unique (excluding current category)
      let slugExists = await prisma.category.findFirst({
        where: {
          slug: finalSlug,
          NOT: { id },
        },
      });
      
      let counter = 1;
      while (slugExists) {
        finalSlug = `${generateSlug(name)}-${counter}`;
        slugExists = await prisma.category.findFirst({
          where: {
            slug: finalSlug,
            NOT: { id },
          },
        });
        counter++;
      }
    }

    // Validate parent category if provided
    if (parentId) {
      // Prevent setting itself as parent
      if (parentId === id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent',
        });
      }
      
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
        });
      }
      
      // Ensure parent has same type
      const categoryType = type || existingCategory.type;
      if (parent.type !== categoryType) {
        return res.status(400).json({
          success: false,
          message: 'Parent category must have the same type',
        });
      }
      
      // Prevent circular references (check if parent is a child)
      const isChild = await prisma.category.findFirst({
        where: {
          id: parentId,
          parentId: id,
        },
      });
      if (isChild) {
        return res.status(400).json({
          success: false,
          message: 'Cannot set a child category as parent (circular reference)',
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (finalSlug) updateData.slug = finalSlug;
    if (description !== undefined) updateData.description = description || null;
    if (req.cloudinary?.url || image !== undefined) {
      updateData.image = req.cloudinary?.url || image || null;
    }
    if (type !== undefined) updateData.type = type;
    if (parentId !== undefined) updateData.parentId = parentId || null;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            courses: true,
            blogs: true,
            products: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Category with this slug already exists. Please use a different slug.',
      });
    }
    console.error('Error updating category:', error);
    next(error);
  }
};

/**
 * Delete category (Admin only)
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            courses: true,
            blogs: true,
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if category has children
    if (category._count.children > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with child categories. Please delete or reassign child categories first.',
      });
    }

    // Check if category has associated items
    const totalItems = category._count.courses + category._count.blogs + category._count.products;
    if (totalItems > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${totalItems} associated items. Please reassign or remove items first.`,
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    console.error('Error deleting category:', error);
    next(error);
  }
};


