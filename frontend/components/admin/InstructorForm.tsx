'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FileUpload } from '@/components/ui/FileUpload';
import { Instructor, CreateInstructorData } from '@/lib/api/instructors';
import { generateSlug } from '@/lib/utils/helpers';

const instructorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  slug: z.string().optional(),
  bio: z.string().optional(),
  designation: z.string().max(255, 'Designation must be less than 255 characters').optional(),
  specialization: z.string().max(500, 'Specialization must be less than 500 characters').optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  featured: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  commissionRate: z.number().min(0).max(100, 'Commission rate must be between 0 and 100').optional(),
  bankName: z.string().max(255).optional(),
  accountNumber: z.string().max(100).optional(),
  ifscCode: z.string().max(50).optional(),
  panNumber: z.string().max(50).optional(),
});

type InstructorFormData = z.infer<typeof instructorSchema> & {
  imageFile?: File | null;
  image?: string;
};

interface InstructorFormProps {
  instructor?: Instructor;
  onSubmit: (data: CreateInstructorData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const InstructorForm: React.FC<InstructorFormProps> = React.memo(({
  instructor,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    instructor?.image || null
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InstructorFormData>({
    resolver: zodResolver(instructorSchema),
    defaultValues: instructor
      ? {
          name: instructor.name,
          slug: instructor.slug,
          bio: instructor.bio || '',
          designation: instructor.designation || '',
          specialization: instructor.specialization || '',
          email: instructor.email || '',
          phone: instructor.phone || '',
          featured: instructor.featured || false,
          order: instructor.order || 0,
          commissionRate: instructor.commissionRate || 30,
          bankName: instructor.bankName || '',
          accountNumber: instructor.accountNumber || '',
          ifscCode: instructor.ifscCode || '',
          panNumber: instructor.panNumber || '',
        }
      : {
          featured: false,
          order: 0,
          commissionRate: 30,
        },
    mode: 'onBlur', // Changed from 'onChange' to 'onBlur' for better performance
  });

  const name = watch('name');
  const slug = watch('slug');

  // Auto-generate slug from name
  useEffect(() => {
    if (name && !slug && !instructor) {
      const generatedSlug = generateSlug(name);
      setValue('slug', generatedSlug, { shouldValidate: false });
    }
  }, [name, slug, instructor, setValue]);

  const handleFileChange = useCallback((file: File | null) => {
    setImageFile(file);
    if (file) {
      // Check file size (max 5MB for instructor images)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        console.error('Error reading file');
        setImagePreview(null);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(instructor?.image || null);
    }
  }, [instructor?.image]);

  const handleFileRemove = () => {
    setImageFile(null);
    setImagePreview(instructor?.image || null);
  };

  const onFormSubmit = useCallback(async (data: InstructorFormData) => {
    const submitData: CreateInstructorData = {
      name: data.name,
      slug: data.slug,
      bio: data.bio || undefined,
      designation: data.designation || undefined,
      specialization: data.specialization || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      featured: data.featured || false,
      order: data.order || 0,
      commissionRate: data.commissionRate || 30,
      bankName: data.bankName || undefined,
      accountNumber: data.accountNumber || undefined,
      ifscCode: data.ifscCode || undefined,
      panNumber: data.panNumber || undefined,
      imageFile: imageFile || undefined,
      image: imagePreview && !imageFile ? imagePreview : undefined,
    };

    await onSubmit(submitData);
  }, [imageFile, imagePreview, onSubmit]);

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
                placeholder="Enter instructor name"
              />

              <Input
                label="Slug"
                {...register('slug')}
                error={errors.slug?.message}
                helperText="URL-friendly identifier (auto-generated from name)"
                placeholder="instructor-slug"
              />

              <Textarea
                label="Bio"
                {...register('bio')}
                error={errors.bio?.message}
                rows={4}
                placeholder="Instructor biography..."
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Designation"
                  {...register('designation')}
                  error={errors.designation?.message}
                  placeholder="e.g., Senior Vastu Expert"
                />

                <Input
                  label="Specialization"
                  {...register('specialization')}
                  error={errors.specialization?.message}
                  placeholder="e.g., Vastu, Numerology"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                  placeholder="instructor@example.com"
                />

                <Input
                  label="Phone"
                  type="tel"
                  {...register('phone')}
                  error={errors.phone?.message}
                  placeholder="+91 1234567890"
                />
              </div>

              <FileUpload
                label="Profile Image"
                accept="image/*"
                maxSize={5}
                value={imagePreview || imageFile}
                onChange={handleFileChange}
                onRemove={handleFileRemove}
                helperText="Upload instructor profile image (max 5MB)"
              />
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  {...register('featured')}
                  className="rounded-none"
                />
                <label htmlFor="featured" className="text-sm font-medium text-[var(--foreground)]">
                  Featured Instructor
                </label>
              </div>

              <Input
                label="Display Order"
                type="number"
                min="0"
                {...register('order', { valueAsNumber: true })}
                error={errors.order?.message}
                helperText="Lower numbers appear first"
                placeholder="0"
              />

              <Input
                label="Commission Rate (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('commissionRate', { valueAsNumber: true })}
                error={errors.commissionRate?.message}
                helperText="Percentage of course sales as commission"
                placeholder="30.00"
              />
            </div>
          </Card>
        </div>

        {/* Right Column - Bank Details */}
        <div className="lg:col-span-1">
          <Card padding="lg">
            <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Bank Details</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Required for salary payments
            </p>
            
            <div className="space-y-4">
              <Input
                label="Bank Name"
                {...register('bankName')}
                error={errors.bankName?.message}
                placeholder="Bank Name"
              />

              <Input
                label="Account Number"
                {...register('accountNumber')}
                error={errors.accountNumber?.message}
                placeholder="Account Number"
              />

              <Input
                label="IFSC Code"
                {...register('ifscCode')}
                error={errors.ifscCode?.message}
                placeholder="IFSC0000000"
              />

              <Input
                label="PAN Number"
                {...register('panNumber')}
                error={errors.panNumber?.message}
                placeholder="ABCDE1234F"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-[var(--border)]">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isLoading} isLoading={isLoading}>
          {instructor ? 'Update Instructor' : 'Create Instructor'}
        </Button>
      </div>
    </form>
  );
});

