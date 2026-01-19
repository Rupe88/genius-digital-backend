
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { Category, CreateCategoryData } from '@/lib/api/categories';
import * as categoryApi from '@/lib/api/categories';
import { showSuccess, showError } from '@/lib/utils/toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchCategory = async () => {
      try {
        setLoading(true);
        const data = await categoryApi.getCategoryById(id);
        setCategory(data);
      } catch (error) {
        console.error('Error fetching category:', error);
        showError(Object(error).message || 'An error occurred' || 'Failed to load category');
        router.push('/admin/categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id, router]);

  const handleSubmit = async (data: CreateCategoryData) => {
    try {
      setSubmitting(true);
      await categoryApi.updateCategory(id, data);
      showSuccess('Category updated successfully!');
      router.push('/admin/categories');
    } catch (error) {
      console.error('Error updating category:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/categories');
  };

  if (loading) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Loading category...</p>
        </div>
      </Card>
    );
  }

  if (!category) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)] mb-4">Category not found</p>
          <Button onClick={() => router.push('/admin/categories')}>
            Back to Categories
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Edit Category</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Update the category details below</p>
      </div>

      <CategoryForm
        category={category}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={submitting}
      />
    </div>
  );
}

