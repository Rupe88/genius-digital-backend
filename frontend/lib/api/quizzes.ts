import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Quiz, QuizQuestion } from '@/lib/types/course';
import { ApiResponse } from '@/lib/types/api';

export interface CreateQuizData {
  lessonId: string;
  title: string;
  description?: string;
  timeLimit?: number;
  passingScore?: number;
  questions: QuizQuestion[];
}

export interface UpdateQuizData {
  title?: string;
  description?: string;
  timeLimit?: number;
  passingScore?: number;
}

export const getQuizByLesson = async (lessonId: string): Promise<Quiz> => {
  try {
    const response = await apiClient.get<ApiResponse<Quiz>>(`${API_ENDPOINTS.QUIZZES.LIST}/lesson/${lessonId}`);
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    return handleApiResponse<Quiz>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const createQuiz = async (data: CreateQuizData): Promise<Quiz> => {
  try {
    const response = await apiClient.post<ApiResponse<Quiz>>(API_ENDPOINTS.QUIZZES.LIST, data);
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    throw new Error(responseData.message || 'Failed to create quiz');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateQuiz = async (id: string, data: UpdateQuizData): Promise<Quiz> => {
  try {
    const response = await apiClient.put<ApiResponse<Quiz>>(API_ENDPOINTS.QUIZZES.BY_ID(id), data);
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    throw new Error(responseData.message || 'Failed to update quiz');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteQuiz = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(API_ENDPOINTS.QUIZZES.BY_ID(id));
    const responseData = response.data;
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to delete quiz');
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export interface QuizSubmissionData {
  quizId: string;
  answers: {
    questionId: string;
    answer: string | string[];
  }[];
}

export interface QuizResult {
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  results: {
    questionId: string;
    isCorrect: boolean;
    correctAnswer: string | string[];
    userAnswer: string | string[];
    points: number;
  }[];
}

export const submitQuiz = async (id: string, answers: QuizSubmissionData['answers']): Promise<QuizResult> => {
  try {
    const response = await apiClient.post<ApiResponse<QuizResult>>(API_ENDPOINTS.QUIZZES.SUBMIT(id), { answers });
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    throw new Error(responseData.message || 'Failed to submit quiz');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

