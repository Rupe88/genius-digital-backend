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
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { CurriculumBuilder } from './CurriculumBuilder';
import { Course } from '@/lib/types/course';
import { Category } from '@/lib/types/course';
import { Instructor } from '@/lib/api/instructors';
import { CreateCourseData } from '@/lib/api/courses';
import { generateSlug } from '@/lib/utils/helpers';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const courseSchema = z.object({
  // Step 1
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  slug: z.string().optional(),
  instructorId: z.string().min(1, 'Instructor is required').uuid('Invalid instructor'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  
  // Step 2
  shortDescription: z.string().max(500, 'Short description must be less than 500 characters').optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive').optional(),
  originalPrice: z.number().min(0, 'Original price must be positive').optional(),
  isFree: z.boolean().optional(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  duration: z.number().min(0, 'Duration must be positive').optional(),
  language: z.string().optional(),
  tags: z.string().optional(),
  learningOutcomes: z.string().optional(), // JSON string or newline-separated
  skills: z.string().optional(), // JSON string or comma-separated
  
  // Step 3
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'ONGOING']).optional(),
  featured: z.boolean().optional(),
  isOngoing: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema> & {
  thumbnailFile?: File | null;
  thumbnail?: string;
};

interface CourseFormProps {
  course?: Course;
  categories: Category[];
  instructors: Instructor[];
  onSubmit: (data: CreateCourseData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const CourseForm: React.FC<CourseFormProps> = ({
  course,
  categories,
  instructors,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    course?.thumbnail || null
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
    trigger,
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: course
      ? {
          title: course.title,
          slug: course.slug,
          instructorId: course.instructorId,
          categoryId: course.categoryId || '',
          shortDescription: course.shortDescription || '',
          description: course.description || '',
          price: course.price,
          isFree: course.isFree,
          level: course.level || undefined,
          duration: course.duration || undefined,
          language: course.language || 'en',
          tags: course.tags || '',
          originalPrice: course.originalPrice || undefined,
          learningOutcomes: Array.isArray(course.learningOutcomes) 
            ? course.learningOutcomes.join('\n') 
            : course.learningOutcomes || '',
          skills: Array.isArray(course.skills) 
            ? course.skills.join(', ') 
            : course.skills || '',
          status: course.status,
          featured: course.featured,
          isOngoing: course.isOngoing,
          startDate: course.startDate ? course.startDate.split('T')[0] : '',
          endDate: course.endDate ? course.endDate.split('T')[0] : '',
        }
      : {
          language: 'en',
          status: 'DRAFT',
          isFree: false,
          featured: false,
          isOngoing: false,
        },
    mode: 'onChange',
  });

  const title = watch('title');
  const slug = watch('slug');
  const isFree = watch('isFree');
  const price = watch('price');

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !slug && !course) {
      const generatedSlug = generateSlug(title);
      setValue('slug', generatedSlug, { shouldValidate: false });
    }
  }, [title, slug, course, setValue]);

  const handleFileChange = (file: File | null) => {
    setThumbnailFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setThumbnailPreview(course?.thumbnail || null);
    }
  };

  const handleFileRemove = () => {
    setThumbnailFile(null);
    setThumbnailPreview(course?.thumbnail || null);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    let fields: (keyof CourseFormData)[] = [];

    if (step === 1) {
      fields = ['title', 'instructorId'];
    } else if (step === 2) {
      // Only require price if course is not free
      const baseFields: (keyof CourseFormData)[] = ['shortDescription', 'description', 'level', 'duration', 'language', 'tags'];
      if (!isFree) {
        baseFields.push('price');
      }
      fields = baseFields;
    } else if (step === 4) {
      fields = ['status', 'featured', 'isOngoing', 'startDate', 'endDate'];
    }

    const result = await trigger(fields as any);
    return result;
  };

  const handleNext = async () => {
    // Skip validation for curriculum step (step 3)
    if (currentStep === 3) {
      setCurrentStep(4);
      return;
    }
    
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onFormSubmit = async (data: CourseFormData) => {
    // Parse learning outcomes (newline-separated or JSON)
    let learningOutcomes: string[] | undefined;
    if (data.learningOutcomes) {
      try {
        const parsed = JSON.parse(data.learningOutcomes);
        learningOutcomes = Array.isArray(parsed) ? parsed : [data.learningOutcomes];
      } catch {
        // If not JSON, split by newlines
        learningOutcomes = data.learningOutcomes.split('\n').filter(line => line.trim());
      }
    }

    // Parse skills (comma-separated or JSON)
    let skills: string[] | undefined;
    if (data.skills) {
      try {
        const parsed = JSON.parse(data.skills);
        skills = Array.isArray(parsed) ? parsed : data.skills.split(',').map(s => s.trim()).filter(s => s);
      } catch {
        skills = data.skills.split(',').map(s => s.trim()).filter(s => s);
      }
    }

    const submitData: CreateCourseData = {
      title: data.title,
      slug: data.slug,
      instructorId: data.instructorId,
      categoryId: data.categoryId || undefined,
      shortDescription: data.shortDescription || undefined,
      description: data.description || undefined,
      price: data.price !== undefined ? Number(data.price) : undefined,
      originalPrice: data.originalPrice !== undefined ? Number(data.originalPrice) : undefined,
      isFree: data.isFree || false,
      status: data.status || 'DRAFT',
      level: data.level || undefined,
      duration: data.duration !== undefined ? Number(data.duration) : undefined,
      language: data.language || 'en',
      featured: data.featured || false,
      isOngoing: data.isOngoing || false,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      tags: data.tags || undefined,
      learningOutcomes,
      skills,
      thumbnailFile: thumbnailFile || undefined,
      thumbnail: thumbnailPreview && !thumbnailFile ? thumbnailPreview : undefined,
    };

    await onSubmit(submitData);
  };

  // Handle course creation success to show curriculum builder
  useEffect(() => {
    if (course && currentStep === 2) {
      // Auto-advance to curriculum after course is created
      setCurrentStep(3);
    }
  }, [course]);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step
                      ? 'bg-[var(--primary-700)] text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                <span className="mt-2 text-xs text-[var(--muted-foreground)] text-center">
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Details'}
                  {step === 3 && 'Curriculum'}
                  {step === 4 && 'Publish'}
                </span>
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    currentStep > step ? 'bg-[var(--primary-700)]' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <Card padding="lg">
          <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Basic Information</h2>
          
          <div className="space-y-4">
            <Input
              label="Course Title *"
              {...register('title')}
              error={errors.title?.message}
              placeholder="Enter course title"
            />

            <Input
              label="Slug"
              {...register('slug')}
              error={errors.slug?.message}
              helperText="URL-friendly identifier (auto-generated from title)"
              placeholder="course-slug"
            />

            <Select
              label="Instructor *"
              {...register('instructorId', { required: 'Instructor is required' })}
              error={errors.instructorId?.message}
              options={[
                { value: '', label: 'Select an instructor' },
                ...instructors.map((inst) => ({ value: inst.id, label: inst.name })),
              ]}
            />

            <Select
              label="Category"
              {...register('categoryId')}
              error={errors.categoryId?.message}
              options={[
                { value: '', label: 'Select a category (optional)' },
                ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
              ]}
            />

            <FileUpload
              label="Thumbnail"
              accept="image/*"
              maxSize={10}
              value={thumbnailPreview || thumbnailFile}
              onChange={handleFileChange}
              onRemove={handleFileRemove}
              error={errors.thumbnailFile?.message as string}
              helperText="Upload a course thumbnail image (max 10MB)"
            />
          </div>
        </Card>
      )}

      {/* Step 2: Details & Settings */}
      {currentStep === 2 && (
        <Card padding="lg">
          <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Details & Settings</h2>
          
          <div className="space-y-4">
            <Textarea
              label="Short Description"
              {...register('shortDescription')}
              error={errors.shortDescription?.message}
              helperText="Brief description (max 500 characters)"
              rows={3}
              placeholder="A short summary of the course"
            />

            <Textarea
              label="Full Description"
              {...register('description')}
              error={errors.description?.message}
              helperText="Detailed course description"
              rows={6}
              placeholder="Full course description..."
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    id="isFree"
                    {...register('isFree')}
                    className="rounded"
                  />
                  <label htmlFor="isFree" className="text-sm font-medium text-[var(--foreground)]">
                    Free Course
                  </label>
                </div>
                <Input
                  label="Price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price', { valueAsNumber: true })}
                  error={errors.price?.message}
                  disabled={isFree}
                  placeholder="0.00"
                />
                <Input
                  label="Original Price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('originalPrice', { valueAsNumber: true })}
                  error={errors.originalPrice?.message}
                  disabled={isFree}
                  placeholder="0.00"
                  helperText="Original price to show discount"
                />
              </div>

              <Select
                label="Level"
                {...register('level')}
                error={errors.level?.message}
                options={[
                  { value: '', label: 'Select level (optional)' },
                  { value: 'Beginner', label: 'Beginner' },
                  { value: 'Intermediate', label: 'Intermediate' },
                  { value: 'Advanced', label: 'Advanced' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Duration (minutes)"
                type="number"
                min="0"
                {...register('duration', { valueAsNumber: true })}
                error={errors.duration?.message}
                placeholder="60"
              />

              <Input
                label="Language"
                {...register('language')}
                error={errors.language?.message}
                placeholder="en"
              />
            </div>

            <Input
              label="Tags"
              {...register('tags')}
              error={errors.tags?.message}
              helperText="Comma-separated tags"
              placeholder="tag1, tag2, tag3"
            />

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Learning Outcomes
              </label>
              <Textarea
                {...register('learningOutcomes')}
                error={errors.learningOutcomes?.message}
                helperText="Enter one learning outcome per line or as JSON array"
                rows={6}
                placeholder="What you'll learn...&#10;One outcome per line"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Skills You'll Gain
              </label>
              <Input
                {...register('skills')}
                error={errors.skills?.message}
                helperText="Comma-separated skills or one per line"
                placeholder="Skill 1, Skill 2, Skill 3"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Curriculum Builder */}
      {currentStep === 3 && (
        <Card padding="lg">
          <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Curriculum</h2>
          {course ? (
            <CurriculumBuilder courseId={course.id} />
          ) : (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <p>Please complete steps 1 and 2 first to create the course, then you can add chapters and lessons.</p>
              <Button
                variant="primary"
                onClick={async (e) => {
                  e.preventDefault();
                  const data = getValues();
                  const isValid = await validateStep(2);
                  if (isValid) {
                    // Save as draft first
                    await handleSubmit(onFormSubmit)(e);
                  }
                }}
                className="mt-4"
              >
                Save Course First
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 4: Publish & Schedule */}
      {currentStep === 4 && (
        <Card padding="lg">
          <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Publish & Schedule</h2>
          
          <div className="space-y-4">
            <Select
              label="Status"
              {...register('status')}
              error={errors.status?.message}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'ONGOING', label: 'Ongoing' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  {...register('featured')}
                  className="rounded"
                />
                <label htmlFor="featured" className="text-sm font-medium text-[var(--foreground)]">
                  Featured Course
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isOngoing"
                  {...register('isOngoing')}
                  className="rounded"
                />
                <label htmlFor="isOngoing" className="text-sm font-medium text-[var(--foreground)]">
                  Ongoing Course
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                {...register('startDate')}
                error={errors.startDate?.message}
              />

              <Input
                label="End Date"
                type="date"
                {...register('endDate')}
                error={errors.endDate?.message}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-[var(--border)]">
        <div>
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handlePrevious}>
              <HiChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} className="ml-2">
              Cancel
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep < 4 ? (
            <Button type="button" variant="primary" onClick={handleNext}>
              Next
              <HiChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <>
              <Button
                type="submit"
                variant="outline"
                onClick={async (e) => {
                  e.preventDefault();
                  setValue('status', 'DRAFT');
                  await handleSubmit(onFormSubmit)(e);
                }}
                disabled={isLoading}
              >
                Save as Draft
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading} isLoading={isLoading}>
                {course ? 'Update Course' : 'Create Course'}
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
};

