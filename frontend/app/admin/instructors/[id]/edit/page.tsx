
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { InstructorForm } from '@/components/admin/InstructorForm';
import { Instructor, CreateInstructorData } from '@/lib/api/instructors';
import * as instructorApi from '@/lib/api/instructors';
import { showSuccess, showError } from '@/lib/utils/toast';

export default function EditInstructorPage() {
  const router = useRouter();
  const params = useParams();
  const instructorId = params.id as string;

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (instructorId) {
      fetchInstructor();
    }
  }, [instructorId]);

  const fetchInstructor = async () => {
    try {
      setLoading(true);
      const data = await instructorApi.getInstructorById(instructorId);
      setInstructor(data);
    } catch (error) {
      console.error('Error fetching instructor:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to load instructor data');
      router.push('/admin/instructors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreateInstructorData) => {
    try {
      setSubmitting(true);
      await instructorApi.updateInstructor(instructorId, data);
      showSuccess('Instructor updated successfully!');
      router.push('/admin/instructors');
    } catch (error) {
      console.error('Error updating instructor:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to update instructor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/instructors');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Loading...</div>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Instructor not found</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Edit Instructor</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Update instructor details below</p>
      </div>

      <InstructorForm
        instructor={instructor}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={submitting}
      />
    </div>
  );
}

