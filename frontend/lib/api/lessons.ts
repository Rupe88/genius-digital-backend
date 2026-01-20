import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Lesson, Chapter } from '@/lib/types/course';
export type { Lesson, Chapter };
import { ApiResponse } from '@/lib/types/api';


export const getCourseLessons = async (courseId: string): Promise<Lesson[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ lessons: Lesson[] }>>(`${API_ENDPOINTS.LESSONS.LIST}/course/${courseId}`);
    const responseData = response.data;
    if (responseData.success && responseData.data?.lessons) {
      return responseData.data.lessons;
    }
    return handleApiResponse<Lesson[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getLessonById = async (id: string): Promise<Lesson> => {
  try {
    const response = await apiClient.get<ApiResponse<Lesson>>(API_ENDPOINTS.LESSONS.BY_ID(id));
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    return handleApiResponse<Lesson>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export interface QuizQuestionData {
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

export interface QuizData {
  title: string;
  description?: string;
  timeLimit?: number;
  passingScore?: number;
  questions: QuizQuestionData[];
}

export interface CreateLessonData {
  courseId: string;
  chapterId?: string;
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  videoDuration?: number;
  attachmentUrl?: string;
  lessonType?: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'ASSIGNMENT';
  order?: number;
  isPreview?: boolean;
  isLocked?: boolean;
  unlockRequirement?: string[];
  videoFile?: File | null;
  attachmentFile?: File | null;
  quizData?: QuizData;
}

export const createLesson = async (data: CreateLessonData): Promise<Lesson> => {
  try {
    const formData = new FormData();
    formData.append('courseId', data.courseId);
    if (data.chapterId) formData.append('chapterId', data.chapterId);
    formData.append('title', data.title);
    if (data.slug) formData.append('slug', data.slug);
    if (data.description) formData.append('description', data.description);
    if (data.content) formData.append('content', data.content);
    if (data.videoUrl) formData.append('videoUrl', data.videoUrl);
    if (data.videoDuration) formData.append('videoDuration', data.videoDuration.toString());
    if (data.attachmentUrl) formData.append('attachmentUrl', data.attachmentUrl);
    if (data.lessonType) formData.append('lessonType', data.lessonType);
    if (data.order !== undefined) formData.append('order', data.order.toString());
    if (data.isPreview !== undefined) formData.append('isPreview', data.isPreview.toString());
    if (data.isLocked !== undefined) formData.append('isLocked', data.isLocked.toString());
    if (data.unlockRequirement) {
      formData.append('unlockRequirement', JSON.stringify(data.unlockRequirement));
    }
    if (data.quizData) {
      formData.append('quizData', JSON.stringify(data.quizData));
    }
    if (data.videoFile) formData.append('video', data.videoFile);
    if (data.attachmentFile) formData.append('attachment', data.attachmentFile);

    const response = await apiClient.post<ApiResponse<Lesson>>(API_ENDPOINTS.LESSONS.LIST, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }

    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to create lesson');
    }

    return handleApiResponse<Lesson>(response);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(handleApiError(error));
  }
};

export const updateLesson = async (id: string, data: Partial<CreateLessonData>): Promise<Lesson> => {
  try {
    const formData = new FormData();
    if (data.courseId) formData.append('courseId', data.courseId);
    if (data.chapterId !== undefined) formData.append('chapterId', data.chapterId || '');
    if (data.title) formData.append('title', data.title);
    if (data.slug) formData.append('slug', data.slug);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.content !== undefined) formData.append('content', data.content);
    if (data.videoUrl !== undefined) formData.append('videoUrl', data.videoUrl);
    if (data.videoDuration !== undefined) formData.append('videoDuration', data.videoDuration.toString());
    if (data.attachmentUrl !== undefined) formData.append('attachmentUrl', data.attachmentUrl);
    if (data.lessonType) formData.append('lessonType', data.lessonType);
    if (data.order !== undefined) formData.append('order', data.order.toString());
    if (data.isPreview !== undefined) formData.append('isPreview', data.isPreview.toString());
    if (data.isLocked !== undefined) formData.append('isLocked', data.isLocked.toString());
    if (data.unlockRequirement !== undefined) {
      formData.append('unlockRequirement', JSON.stringify(data.unlockRequirement));
    }
    if (data.quizData !== undefined) {
      formData.append('quizData', data.quizData ? JSON.stringify(data.quizData) : '');
    }
    if (data.videoFile) formData.append('video', data.videoFile);
    if (data.attachmentFile) formData.append('attachment', data.attachmentFile);

    const response = await apiClient.put<ApiResponse<Lesson>>(API_ENDPOINTS.LESSONS.BY_ID(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }

    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to update lesson');
    }

    return handleApiResponse<Lesson>(response);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(handleApiError(error));
  }
};

export const deleteLesson = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.LESSONS.BY_ID(id));
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

