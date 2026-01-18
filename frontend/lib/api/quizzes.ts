import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';

export interface QuizQuestion {
  id?: string;
  question: string;
  questionType: 'multiple_choice' | 'single_choice' | 'true_false' | 'open_ended' | 'short_answer' | 'matching';
  description?: string;
  options?: any;
  correctAnswer: string | string[];
  points: number;
  order: number;
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  timeLimit?: number;
  passingScore: number;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

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
    const response = await apiClient.get(`${API_ENDPOINTS.QUIZZES.LIST}/lesson/${lessonId}`);
    const responseData = response.data as any;
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
    const response = await apiClient.post(API_ENDPOINTS.QUIZZES.LIST, data);
    const responseData = response.data as any;
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
    const response = await apiClient.put(API_ENDPOINTS.QUIZZES.BY_ID(id), data);
    const responseData = response.data as any;
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
    const response = await apiClient.delete(API_ENDPOINTS.QUIZZES.BY_ID(id));
    const responseData = response.data as any;
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to delete quiz');
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

