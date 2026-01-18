'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FileUpload } from '@/components/ui/FileUpload';
import { Category, CreateCategoryData } from '@/lib/api/categories';
import { generateSlug } from '@/lib/utils/helpers';
import * as categoryApi from '@/lib/api/categories';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  slug: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['COURSE', 'BLOG', 'PRODUCT']),
  parentId: z.string().optional().or(z.literal('')),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  category?: Category;
  onSubmit: (data: CreateCategoryData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    category?.image || null
  );
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      description: category?.description || '',
      type: category?.type || 'COURSE',
      parentId: category?.parentId || '',
    },
  });

  const watchedName = watch('name');
  const watchedType = watch('type');

  // Auto-generate slug from name
  useEffect(() => {
    if (!category && watchedName && !watch('slug')) {
      const autoSlug = generateSlug(watchedName);
      setValue('slug', autoSlug);
    }
  }, [watchedName, category, setValue, watch]);

  // Fetch parent categories when type changes
  useEffect(() => {
    const fetchParents = async () => {
      if (watchedType) {
        setLoadingParents(true);
        try {
          const categories = await categoryApi.getAllCategories({ type: watchedType });
          // Filter out current category and its children to prevent circular references
          const filtered = categories.filter(
            (cat) => cat.id !== category?.id && cat.parentId !== category?.id
          );
          setParentCategories(filtered);
        } catch (error) {
          console.error('Error fetching parent categories:', error);
        } finally {
          setLoadingParents(false);
        }
      }
    };
    fetchParents();
  }, [watchedType, category?.id]);

  const handleFileSelect = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(category?.image || null);
    }
  };

  const handleFileRemove = () => {
    setImageFile(null);
    setImagePreview(category?.image || null);
  };

  const onFormSubmit = async (data: CategoryFormData) => {
    const submitData: CreateCategoryData = {
      name: data.name,
      slug: data.slug || undefined,
      description: data.description || undefined,
      type: data.type,
      parentId: data.parentId || undefined,
      imageFile: imageFile || undefined,
      image: imagePreview && !imageFile ? imagePreview : undefined,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="lg">
            <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Basic Information</h2>
            
            <div className="space-y-4">
              <Input
                label="Name *"
                {...register('name')}
                error={errors.name?.message}
                placeholder="Enter category name"
              />

              <Input
                label="Slug"
                {...register('slug')}
                error={errors.slug?.message}
                placeholder="Auto-generated from name"
                helperText="Leave empty to auto-generate from name"
              />

              <Textarea
                label="Description"
                {...register('description')}
                error={errors.description?.message}
                placeholder="Enter category description"
                rows={4}
              />

              <Select
                label="Type *"
                {...register('type')}
                error={errors.type?.message}
                options={[
                  { value: 'COURSE', label: 'Course' },
                  { value: 'BLOG', label: 'Blog' },
                  { value: 'PRODUCT', label: 'Product' },
                ]}
              />

              <Select
                label="Parent Category"
                {...register('parentId')}
                error={errors.parentId?.message}
                options={[
                  { value: '', label: 'None (Root Category)' },
                  ...parentCategories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                  })),
                ]}
                disabled={loadingParents}
                helperText={loadingParents ? 'Loading parent categories...' : 'Select a parent category if this is a subcategory'}
              />
            </div>
          </Card>
        </div>

        {/* Right Column - Image */}
        <div className="space-y-6">
          <Card padding="lg">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Category Image</h2>
            <FileUpload
              accept="image/*"
              onChange={handleFileSelect}
              onRemove={handleFileRemove}
              value={imagePreview}
              label="Upload Image"
              helperText="Recommended: 800x600px, max 5MB"
            />
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border)]">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
};

