import { prisma } from '../config/database.js';

/**
 * Store correct answer in DB: arrays/objects as JSON string, primitives as string.
 */
export function serializeQuizCorrectAnswer(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Normalize submitted answer to sorted comparable string list */
function normalizeUserQuizAnswer(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((s) => s.length > 0).sort();
  }
  const s = String(value).trim();
  return s ? [s].sort() : [];
}

/**
 * Parse correctAnswer from DB: JSON array, plain string, or legacy String(array) → "a,b".
 */
function normalizeCommaSpaces(s) {
  // For option text like "2, 4, 6" vs "2,4,6"
  return String(s)
    .trim()
    .replace(/\s*,\s*/g, ',');
}

function coerceOptionsToStringArray(options) {
  if (options === undefined || options === null) return [];
  if (Array.isArray(options)) return options.map((o) => String(o).trim()).filter(Boolean);
  if (typeof options === 'string') {
    const raw = options.trim();
    if (!raw) return [];
    // options might be JSON encoded
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((o) => String(o).trim()).filter(Boolean);
      } catch {
        // ignore
      }
    }
    // Otherwise treat as single value
    return [raw];
  }
  return [];
}

function parseStoredCorrectAnswer(stored, questionType, questionOptions = []) {
  if (stored === undefined || stored === null || stored === '') return [];
  const raw = String(stored).trim();
  if (!raw) return [];

  if (raw.startsWith('[') || (raw.startsWith('"') && raw.endsWith('"'))) {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) {
        return p.map((v) => String(v).trim()).filter(Boolean).sort();
      }
      const one = String(p).trim();
      return one ? [one].sort() : [];
    } catch {
      /* fall through */
    }
  }

  if (questionType !== 'multiple_choice') {
    return [raw].sort();
  }

  // If the stored correctAnswer matches an option (allowing comma-space differences),
  // treat it as a single option value.
  const optionsArr = coerceOptionsToStringArray(questionOptions);
  const rawNorm = normalizeCommaSpaces(raw);
  const exactOptionMatch = optionsArr.find((o) => normalizeCommaSpaces(o) === rawNorm);
  if (exactOptionMatch) return [exactOptionMatch].sort();

  if (!raw.includes(',')) {
    return [raw].sort();
  }

  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .sort();
}

function normalizedAnswersMatch(userNorm, correctNorm) {
  if (userNorm.length !== correctNorm.length) return false;
  for (let i = 0; i < userNorm.length; i += 1) {
    if (userNorm[i] !== correctNorm[i]) return false;
  }
  return true;
}

export function quizAnswersMatch(userAnswer, storedCorrect, questionType, questionOptions = []) {
  const userNorm = normalizeUserQuizAnswer(userAnswer);
  const correctNorm = parseStoredCorrectAnswer(storedCorrect, questionType, questionOptions);
  return normalizedAnswersMatch(userNorm, correctNorm);
}

/** Shape correctAnswer for API/UI: string if single, string[] if multiple */
function correctAnswerForResponse(stored, questionType, questionOptions = []) {
  const norm = parseStoredCorrectAnswer(stored, questionType, questionOptions);
  if (norm.length === 0) return '';
  if (norm.length === 1) return norm[0];
  return norm;
}

/**
 * For admin/editor APIs: turn DB value back into string or string[] for the form.
 */
export function deserializeQuizCorrectAnswerForEditor(stored) {
  if (stored === undefined || stored === null || stored === '') return '';
  const raw = String(stored).trim();
  if (!raw) return '';
  if (raw.startsWith('[')) {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p.map((v) => String(v));
      if (p != null) return String(p);
    } catch {
      return raw;
    }
  }
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * Calculate quiz score
 */
export const calculateQuizScore = async (quizId, answers) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  let totalScore = 0;
  let maxScore = 0;
  const results = [];

  for (const question of quiz.questions) {
    maxScore += question.points;
    const userAnswer = answers[question.id];
    const qType = question.questionType || 'single_choice';
    const isCorrect = quizAnswersMatch(userAnswer, question.correctAnswer, qType, question.options);

    if (isCorrect) {
      totalScore += question.points;
    }

    results.push({
      questionId: question.id,
      question: question.question,
      userAnswer,
      correctAnswer: correctAnswerForResponse(question.correctAnswer, qType, question.options),
      isCorrect,
      points: isCorrect ? question.points : 0,
    });
  }

  const percentage = (totalScore / maxScore) * 100;
  const isPassed = percentage >= quiz.passingScore;

  return {
    totalScore,
    maxScore,
    percentage: parseFloat(percentage.toFixed(2)),
    isPassed,
    passingScore: quiz.passingScore,
    results,
  };
};

/**
 * Get quiz with questions
 */
export const getQuizByLessonId = async (lessonId) => {
  return prisma.quiz.findUnique({
    where: { lessonId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
      lesson: {
        include: {
          course: true,
        },
      },
    },
  });
};

/**
 * Get user's quiz attempts
 */
export const getUserQuizAttempts = async (userId, quizId) => {
  return prisma.quizAttempt.findMany({
    where: {
      userId,
      quizId,
    },
    orderBy: {
      completedAt: 'desc',
    },
  });
};

/**
 * Get user's consultation quiz attempts with visible feedback.
 * Used to show admin replies in user dashboard.
 */
export const getUserConsultationAttemptsWithFeedback = async (userId, { skip = 0, take = 50 } = {}) => {
  return prisma.quizAttempt.findMany({
    where: {
      userId,
      adminVisible: true,
      adminNotes: { not: null },
      quiz: {
        isConsultation: true,
      },
    },
    include: {
      quiz: {
        include: {
          lesson: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
    skip,
    take,
  });
};

/**
 * Get quiz attempts for admin with optional filters
 */
export const getQuizAttemptsForAdmin = async ({ quizId, userId, courseId, isPassed, skip = 0, take = 50 }) => {
  return prisma.quizAttempt.findMany({
    where: {
      ...(quizId ? { quizId } : {}),
      ...(userId ? { userId } : {}),
      ...(typeof isPassed === 'boolean' ? { isPassed } : {}),
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
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      quiz: {
        include: {
          lesson: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
    skip,
    take,
  });
};

export default {
  calculateQuizScore,
  getQuizByLessonId,
  getUserQuizAttempts,
  getUserConsultationAttemptsWithFeedback,
  getQuizAttemptsForAdmin,
};
