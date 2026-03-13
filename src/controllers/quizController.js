import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';
import * as quizService from '../services/quizService.js';


/**
 * Get quiz by lesson ID
 */
export const getQuizByLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    // Check if user is enrolled in the course
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          include: {
            enrollments: {
              where: {
                userId,
                status: { in: ['ACTIVE', 'COMPLETED'] },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    if (lesson.course.enrollments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to access the quiz',
      });
    }

    const quiz = await quizService.getQuizByLessonId(lessonId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found for this lesson',
      });
    }

    // Don't expose correct answers until quiz is submitted
    const quizData = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        question: q.question,
        questionType: q.questionType,
        options: q.options,
        points: q.points,
        order: q.order,
      })),
    };

    res.json({
      success: true,
      data: quizData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit quiz attempt
 */
export const submitQuiz = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    // Get quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: {
                    userId,
                    status: { in: ['ACTIVE', 'COMPLETED'] },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    // Check enrollment
    if (quiz.lesson.course.enrollments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course',
      });
    }

    // Calculate score
    const scoreResult = await quizService.calculateQuizScore(quizId, answers);

    // Create quiz attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        answers: answers,
        score: scoreResult.totalScore,
        isPassed: scoreResult.isPassed,
      },
      include: {
        quiz: {
          include: {
            lesson: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        attempt,
        score: scoreResult.totalScore,
        maxScore: scoreResult.maxScore,
        percentage: scoreResult.percentage,
        isPassed: scoreResult.isPassed,
        results: scoreResult.results,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's quiz attempts
 */
export const getUserAttempts = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const attempts = await quizService.getUserQuizAttempts(userId, quizId);

    res.json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get quiz attempts for admin (all users)
 */
export const getAdminQuizAttempts = async (req, res, next) => {
  try {
    const { quizId, userId, courseId, isPassed, page = 1, limit = 50 } = req.query;

    const pageNumber = Number(page) || 1;
    const pageSize = Math.min(Number(limit) || 50, 200);
    const skip = (pageNumber - 1) * pageSize;

    const [attempts, total] = await Promise.all([
      quizService.getQuizAttemptsForAdmin({
        quizId: quizId || undefined,
        userId: userId || undefined,
        courseId: courseId || undefined,
        isPassed: typeof isPassed === 'string' ? isPassed === 'true' : undefined,
        skip,
        take: pageSize,
      }),
      // Total count for pagination (without skip/take)
      prisma.quizAttempt.count({
        where: {
          ...(quizId ? { quizId } : {}),
          ...(userId ? { userId } : {}),
          ...(typeof isPassed === 'string'
            ? { isPassed: isPassed === 'true' }
            : {}),
          ...(courseId
            ? {
                quiz: {
                  lesson: {
                    courseId,
                  },
                },
              }
            : {}),
        },
      }),
    ]);

    res.json({
      success: true,
      data: attempts,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create quiz (Admin)
 */
export const createQuiz = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { lessonId, title, description, timeLimit, passingScore, questions } = req.body;

    // Check if lesson exists and doesn't already have a quiz
    const existingQuiz = await prisma.quiz.findUnique({
      where: { lessonId },
    });

    if (existingQuiz) {
      return res.status(400).json({
        success: false,
        message: 'Quiz already exists for this lesson',
      });
    }

    // Create quiz with questions
    const quiz = await prisma.quiz.create({
      data: {
        lessonId,
        title,
        description,
        timeLimit: timeLimit || null,
        passingScore: passingScore || 70,
        questions: {
          create: questions.map((q, index) => ({
            question: q.question,
            questionType: q.questionType || 'multiple_choice',
            description: q.description || null,
            options: q.options || null,
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
            order: q.order || index,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    res.status(201).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update quiz (Admin)
 */
export const updateQuiz = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { title, description, timeLimit, passingScore } = req.body;

    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(timeLimit !== undefined && { timeLimit }),
        ...(passingScore !== undefined && { passingScore }),
      },
      include: {
        questions: true,
      },
    });

    res.json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete quiz (Admin)
 */
export const deleteQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.quiz.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
