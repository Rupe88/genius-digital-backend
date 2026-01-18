export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  type?: 'COURSE' | 'BLOG' | 'PRODUCT';
  parentId?: string;
  parent?: Category;
  children?: Category[];
  _count?: {
    courses: number;
    blogs: number;
    products: number;
    children: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Instructor {
  id: string;
  name: string;
  slug: string;
  image?: string;
  bio?: string;
  designation?: string;
  specialization?: string;
  email?: string;
  phone?: string;
  socialLinks?: any;
  featured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  thumbnail?: string;
  price: number;
  originalPrice?: number;
  isFree: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'ONGOING';
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  duration?: number;
  language: string;
  featured: boolean;
  isOngoing: boolean;
  startDate?: string;
  endDate?: string;
  tags?: string;
  learningOutcomes?: string[];
  skills?: string[];
  instructorId: string;
  categoryId?: string;
  instructor?: Instructor;
  category?: Category;
  rating?: number;
  totalRatings?: number;
  totalEnrollments?: number;
  chapters?: any[];
  lessons?: Lesson[];
  reviews?: Review[];
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  progress: number;
  enrolledAt: string;
  completedAt?: string;
  course?: Course;
}

export interface Lesson {
  id: string;
  courseId: string;
  chapterId?: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  videoDuration?: number;
  attachmentUrl?: string;
  lessonType: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'ASSIGNMENT';
  order: number;
  isPreview: boolean;
  isLocked?: boolean;
  unlockRequirement?: string[] | any;
  createdAt: string;
  updatedAt: string;
  chapter?: any;
  progress?: { isCompleted: boolean; watchTime: number }[];
  quiz?: any;
}

export interface Quiz {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  description: string;
  dueDate?: string;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  courseId: string;
  userId: string;
  user?: {
    id: string;
    fullName: string;
    profileImage?: string;
  };
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

