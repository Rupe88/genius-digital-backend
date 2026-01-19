
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

  const handleSubmit = async (data: CreateCourseData) => {
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

      showSuccess('Course created successfully!');
      router.push('/admin/courses');
    } catch (error) {
      console.error('Error creating course:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to create course';
      if (error.message?.includes('timed out')) {
        errorMessage = 'Course creation timed out. Please check your connection and try again.';
      } else if (error.message?.includes('upload')) {
        errorMessage = 'File upload failed. Please try with a smaller image or check your internet connection.';
      } else if (error.message?.includes('network') || error.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
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

