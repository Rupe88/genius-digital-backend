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
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreateCourseData) => {
    try {
      setSubmitting(true);
      await courseApi.createCourse(data);
      showSuccess('Course created successfully!');
      router.push('/admin/courses');
    } catch (error: any) {
      console.error('Error creating course:', error);
      showError(error.message || 'Failed to create course');
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

