
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InstructorForm } from '@/components/admin/InstructorForm';
import { CreateInstructorData } from '@/lib/api/instructors';
import * as instructorApi from '@/lib/api/instructors';
import { showSuccess, showError } from '@/lib/utils/toast';

export default function CreateInstructorPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: CreateInstructorData) => {
    try {
      setSubmitting(true);
      await instructorApi.createInstructor(data);
      showSuccess('Instructor created successfully!');
      router.push('/admin/instructors');
    } catch (error) {
      console.error('Error creating instructor:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to create instructor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/instructors');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Create New Instructor</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Fill in the instructor details below</p>
      </div>

      <InstructorForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={submitting}
      />
    </div>
  );
}

