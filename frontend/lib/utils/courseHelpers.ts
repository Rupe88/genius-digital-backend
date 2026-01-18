import { Course } from '@/lib/types/course';

/**
 * Get course URL using slug for SEO, fallback to ID
 */
export const getCourseUrl = (course: Course): string => {
  return `/courses/${course.slug || course.id}`;
};

/**
 * Get admin course URL (always uses ID for admin operations)
 */
export const getAdminCourseUrl = (courseId: string): string => {
  return `/admin/courses/${courseId}`;
};

