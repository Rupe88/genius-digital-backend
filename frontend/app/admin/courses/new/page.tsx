
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseForm } from '@/components/admin/CourseForm';
import { Category } from '@/lib/types/course';
import { Instructor } from '@/lib/api/instructors';
import { CreateCourseData } from '@/lib/api/courses';
import * as courseApi from '@/lib/api/courses';
import * as categoryApi from '@/lib/api/categories';
import * as instructorApi from '@/lib/api/instructors';
import * as chapterApi from '@/lib/api/chapters';
import * as lessonApi from '@/lib/api/lessons';
import { showSuccess, showError } from '@/lib/utils/toast';

export default function CreateCoursePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesData, instructorsResponse] = await Promise.all([
        categoryApi.getAllCategories(),
        instructorApi.getAllInstructors(),
      ]);
      setCategories(categoriesData || []);
      setInstructors(instructorsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreateCourseData & { curriculumData?: { chapters: any[], lessons: any[] } }) => {
    try {
      setSubmitting(true);
      console.log('Starting course creation...');

      // Add timeout for course creation (2 minutes)
      const createCoursePromise = courseApi.createCourse(data);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Course creation timed out. Please try again.'));
        }, 120000); // 2 minutes
      });

      const result = await Promise.race([createCoursePromise, timeoutPromise]);
      console.log('Course created successfully:', result);

      // If there's curriculum data, create chapters and lessons
      if (data.curriculumData && (result as any).id) {
        try {
          console.log('Creating curriculum data...');

          // Create chapters
          for (const chapter of data.curriculumData.chapters) {
            const chapterData = {
              courseId: (result as any).id,
              title: chapter.title,
              description: chapter.description || undefined,
              isLocked: chapter.isLocked || false,
              isPreview: chapter.isPreview || false,
              order: chapter.order,
            };

            const createdChapter = await chapterApi.createChapter(chapterData);

            if (createdChapter) {
              console.log('Chapter created:', createdChapter);

              // Create lessons for this chapter (nested structure)
              const lessons = chapter.lessons || [];
              for (const lesson of lessons) {
                const lessonData = {
                  courseId: (result as any).id,
                  chapterId: createdChapter.id,
                  title: lesson.title,
                  description: lesson.description || undefined,
                  content: lesson.content || undefined,
                  lessonType: lesson.lessonType || 'VIDEO',
                  videoUrl: lesson.videoUrl || undefined,
                  videoDuration: lesson.videoDuration || undefined,
                  isPreview: lesson.isPreview || false,
                  isLocked: lesson.isLocked || false,
                  order: lesson.order,
                };

                await lessonApi.createLesson(lessonData);
              }
            }
          }

          showSuccess('Course and curriculum created successfully!');
        } catch (curriculumError) {
          console.error('Error creating curriculum:', curriculumError);
          showSuccess('Course created successfully! Some curriculum items may need to be added manually.');
        }
      } else {
        showSuccess('Course created successfully!');
      }

      router.push(`/admin/courses/${(result as any).id}/edit?step=3`);
    } catch (error) {
      console.error('Error creating course:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to create course';
      const errorObj = error as any;
      if (errorObj?.message?.includes('timed out')) {
        errorMessage = 'Course creation timed out. Please check your connection and try again.';
      } else if (errorObj?.message?.includes('upload')) {
        errorMessage = 'File upload failed. Please try with a smaller image or check your internet connection.';
      } else if (errorObj?.message?.includes('network') || errorObj?.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorObj?.message) {
        errorMessage = errorObj.message;
      }

      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/courses');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Create New Course</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Fill in the course details below</p>
      </div>

      <CourseForm
        categories={categories}
        instructors={instructors}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={submitting}
      />
    </div>
  );
}

