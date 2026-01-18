
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { CreateCategoryData } from '@/lib/api/categories';
import * as categoryApi from '@/lib/api/categories';
import { showSuccess, showError } from '@/lib/utils/toast';

export default function CreateCategoryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: CreateCategoryData) => {
    try {
      setSubmitting(true);
      await categoryApi.createCategory(data);
      showSuccess('Category created successfully!');
      router.push('/admin/categories');
    } catch (error) {
      console.error('Error creating category:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/categories');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Create New Category</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Fill in the category details below</p>
      </div>

      <CategoryForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={submitting}
      />
    </div>
  );
}

