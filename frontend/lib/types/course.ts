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

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  instagram?: string;
  whatsapp?: string;
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
  socialLinks?: SocialLinks;
  featured: boolean;
  order: number;
  commissionRate?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  totalEarnings?: number;
  paidEarnings?: number;
  pendingEarnings?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description?: string;
  order: number;
  isLocked: boolean;
  isPreview: boolean;
  lessons?: Lesson[];
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
  videoUrl?: string;
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
  chapters?: Chapter[];
  lessons?: Lesson[];
  reviews?: Review[];
  isEnrolled?: boolean;
  enrollment?: {
    id: string;
    status: string;
    progress: number;
    completedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
  progress: number;
  enrolledAt: string;
  completedAt?: string;
  course?: Course;
  user?: {
    id: string;
    fullName: string;
    email: string;
    profileImage?: string;
  };
  pricePaid: number;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string;
  createdAt?: string;
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
  unlockRequirement?: string[];
  createdAt: string;
  updatedAt: string;
  chapter?: Chapter;
  progress?: { isCompleted: boolean; watchTime: number }[];
  quiz?: Quiz;
}

export type QuestionType = 'multiple_choice' | 'single_choice' | 'true_false' | 'open_ended' | 'short_answer' | 'matching';

export interface QuizQuestion {
  id?: string;
  quizId?: string;
  question: string;
  questionType: QuestionType;
  description?: string;
  options?: string[] | unknown;
  correctAnswer: string | string[];
  points: number;
  order: number;
  createdAt?: string;
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

