import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Get course assignments
 */
export const getCourseAssignments = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      include: {
        submissions: userId
          ? {
              where: { userId },
              take: 1,
              orderBy: { submittedAt: 'desc' },
            }
          : false,
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get assignment by ID
 */
export const getAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            enrollments: {
              where: {
                userId,
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Check enrollment
    if (assignment.course.enrollments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course',
      });
    }

    // Get user's submission if exists
    const submission = await prisma.assignmentSubmission.findUnique({
      where: {
        userId_assignmentId: {
          userId,
          assignmentId: id,
        },
      },
    });

    res.json({
      success: true,
      data: {
        ...assignment,
        mySubmission: submission || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit assignment
 */
export const submitAssignment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { content, fileUrl } = req.body;
    const userId = req.user.id;

    // Get assignment
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            enrollments: {
              where: {
                userId,
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Check enrollment
    if (assignment.course.enrollments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course',
      });
    }

    // Check if due date passed
    if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Assignment due date has passed',
      });
    }

    // Create or update submission
    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        userId_assignmentId: {
          userId,
          assignmentId: id,
        },
      },
      create: {
        userId,
        assignmentId: id,
        content,
        fileUrl: fileUrl || null,
      },
      update: {
        content,
        fileUrl: fileUrl || null,
        submittedAt: new Date(),
        gradedAt: null, // Reset grading if resubmitting
        score: null,
        feedback: null,
      },
      include: {
        assignment: true,
      },
    });

    res.status(201).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get assignment submissions (Admin/Instructor)
 */
export const getSubmissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: { assignmentId: id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assignmentSubmission.count({
        where: { assignmentId: id },
      }),
    ]);

    res.json({
      success: true,
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Grade assignment submission (Admin)
 */
export const gradeSubmission = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { submissionId } = req.params;
    const { score, feedback } = req.body;

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
      },
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    // Validate score
    if (score < 0 || score > submission.assignment.maxScore) {
      return res.status(400).json({
        success: false,
        message: `Score must be between 0 and ${submission.assignment.maxScore}`,
      });
    }

    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback: feedback || null,
        gradedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        assignment: true,
      },
    });

    res.json({
      success: true,
      data: updatedSubmission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create assignment (Admin)
 */
export const createAssignment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { courseId, title, description, dueDate, maxScore } = req.body;

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        maxScore: maxScore || 100,
      },
      include: {
        course: true,
      },
    });

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update assignment (Admin)
 */
export const updateAssignment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { title, description, dueDate, maxScore } = req.body;

    const assignment = await prisma.assignment.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(maxScore !== undefined && { maxScore }),
      },
    });

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete assignment (Admin)
 */
export const deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.assignment.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
