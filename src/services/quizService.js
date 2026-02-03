import { prisma } from '../config/database.js';



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
    const isCorrect = userAnswer === question.correctAnswer;

    if (isCorrect) {
      totalScore += question.points;
    }

    results.push({
      questionId: question.id,
      question: question.question,
      userAnswer,
      correctAnswer: question.correctAnswer,
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

export default {
  calculateQuizScore,
  getQuizByLessonId,
  getUserQuizAttempts,
};
