
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CourseForm } from '@/components/admin/CourseForm';
import { Course } from '@/lib/types/course';
import { Category } from '@/lib/types/course';
import { Instructor } from '@/lib/api/instructors';
import { CreateCourseData } from '@/lib/api/courses';
import * as courseApi from '@/lib/api/courses';
import * as categoryApi from '@/lib/api/categories';
import * as instructorApi from '@/lib/api/instructors';
import { showSuccess, showError } from '@/lib/utils/toast';

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  const fetchData = async (retryCount = 0) => {
    try {
      setLoading(true);
      const [courseData, categoriesData, instructorsResponse] = await Promise.all([
        courseApi.getCourseById(courseId),
        categoryApi.getAllCategories(),
        instructorApi.getAllInstructors(),
      ]);
      setCourse(courseData);
      setCategories(categoriesData || []);
      setInstructors(instructorsResponse.data || []);
    } catch (error) {
      console.error(`Error fetching data (attempt ${retryCount + 1}):`, error);

      // Retry up to 3 times for potential race conditions
      if (retryCount < 3) {
        setTimeout(() => fetchData(retryCount + 1), 1000);
        return;
      }

      showError(Object(error).message || 'An error occurred' || 'Failed to load course data');
      router.push('/admin/courses');
    } finally {
      if (retryCount === 0 || !loading) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (data: CreateCourseData) => {
    try {
      setSubmitting(true);
      await courseApi.updateCourse(courseId, data);
      showSuccess('Course updated successfully!');
      // router.push('/admin/courses'); - Stay on page for consistent behavior
    } catch (error) {
      console.error('Error updating course:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to update course');
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

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Course not found</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Edit Course</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Update course details below</p>
      </div>

      <CourseForm
        course={course}
        categories={categories}
        instructors={instructors}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={submitting}
      />
    </div>
  );
}

