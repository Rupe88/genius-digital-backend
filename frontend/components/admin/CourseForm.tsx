'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { TagInput } from '@/components/ui/TagInput';
import { CurriculumBuilder } from './CurriculumBuilder';
import { Course, Category, Instructor } from '@/lib/types/course';
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
  language: z.enum(['en', 'ne', 'hi', 'mr', 'bn', 'te', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'mai', 'bh']).optional(),
  tags: z.array(z.string()).optional(),
  learningOutcomes: z.string().optional(), // JSON string or newline-separated
  skills: z.array(z.string()).optional(),

  // Step 3
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'ONGOING']).optional(),
  featured: z.boolean().optional(),
  isOngoing: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema> & {
  thumbnailFile?: File | null;
  tags?: string[];
  skills?: string[];
};

interface CourseFormProps {
  course?: Course;
  categories: Category[];
  instructors: Instructor[];
  onSubmit: (data: CreateCourseData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const CourseForm: React.FC<CourseFormProps> = React.memo(({
  course,
  categories,
  instructors,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const searchParams = useSearchParams();
  const initialStep = parseInt(searchParams.get('step') || '1');
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    course?.thumbnail || null
  );

  // Curriculum state
  const [curriculumChapters, setCurriculumChapters] = useState<any[]>([]);
  const [curriculumLessons, setCurriculumLessons] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
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
        language: (course.language && ['en', 'ne', 'hi', 'mr', 'bn', 'te', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'mai', 'bh'].includes(course.language) ? course.language as 'en' | 'ne' | 'hi' | 'mr' | 'bn' | 'te' | 'ta' | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'as' | 'mai' | 'bh' : 'ne'),
        tags: course.tags ? (Array.isArray(course.tags) ? course.tags : course.tags.split(',').map(t => t.trim()).filter(Boolean)) : [],
        originalPrice: course.originalPrice || undefined,
        learningOutcomes: Array.isArray(course.learningOutcomes)
          ? course.learningOutcomes.join('\n')
          : course.learningOutcomes || '',
        skills: Array.isArray(course.skills)
          ? course.skills
          : (course.skills && typeof course.skills === 'string')
            ? (course.skills as string).split(',').map(s => s.trim()).filter(Boolean)
            : [],
        status: course.status,
        featured: course.featured,
        isOngoing: course.isOngoing,
        startDate: course.startDate ? course.startDate.split('T')[0] : '',
        endDate: course.endDate ? course.endDate.split('T')[0] : '',
      }
      : {
        language: 'ne',
        skills: [],
        tags: [],
        status: 'DRAFT',
        isFree: false,
        featured: false,
        isOngoing: false,
      },
    mode: 'onBlur', // Changed from onChange to onBlur to reduce re-renders
  });

  const title = watch('title');
  const slug = watch('slug');
  const isFree = watch('isFree');
  const price = watch('price');
  const watchTags = watch('tags');
  const watchSkills = watch('skills');

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !slug && !course) {
      const generatedSlug = generateSlug(title);
      setValue('slug', generatedSlug, { shouldValidate: false });
    }
  }, [title, slug, course, setValue]);

  const handleFileChange = useCallback((file: File | null) => {
    setThumbnailFile(file);
    if (file) {
      // Check file size before processing (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.onerror = () => {
        console.error('Error reading file');
        setThumbnailPreview(null);
      };
      reader.readAsDataURL(file);
    } else {
      setThumbnailPreview(course?.thumbnail || null);
    }
  }, [course?.thumbnail]);

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

    const result = await trigger(fields as (keyof CourseFormData)[]);
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
    // Prevent multiple submissions
    if (isSubmitting || isUploading) {
      return;
    }

    try {
      setIsSubmitting(true);
      setIsUploading(true);
      setUploadProgress(10);

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

      setUploadProgress(30);

      // Skills are already an array from TagInput
      const skills = data.skills;

      setUploadProgress(50);

      const submitData: CreateCourseData & { curriculumData?: { chapters: any[], lessons: any[] } } = {
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
        tags: data.tags && data.tags.length > 0 ? data.tags.join(',') : undefined,
        learningOutcomes,
        skills,
        thumbnailFile: thumbnailFile || undefined,
        onProgress: (progress: number) => {
          // Use requestAnimationFrame to avoid too many re-renders
          requestAnimationFrame(() => setUploadProgress(progress));
        },
      };

      // Add curriculum data if it exists
      if (curriculumChapters.length > 0) {
        submitData.curriculumData = {
          chapters: curriculumChapters,
          lessons: curriculumLessons,
        };
      }

      setUploadProgress(70);

      await onSubmit(submitData);

      setUploadProgress(100);
    } catch (error) {
      console.error('Form submission error:', error);
      throw error; // Re-throw to let parent handle error
    } finally {
      // Clean up state
      setIsSubmitting(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Removed automatic advance to ensure Step 2 (Details) remains accessible
  // when a course object is already present (e.g., on the Edit page).

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={async () => {
                  if (step < currentStep) {
                    setCurrentStep(step);
                  } else if (step > currentStep) {
                    const isValid = await validateStep(currentStep);
                    if (isValid) {
                      setCurrentStep(step);
                    }
                  }
                }}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all group-hover:scale-110 ${currentStep >= step
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
                  className={`flex-1 h-1 mx-4 ${currentStep > step ? 'bg-[var(--primary-700)]' : 'bg-gray-200'
                    }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Upload Progress Bar */}
        {(isUploading || isLoading) && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {isUploading ? 'Creating course...' : 'Processing...'}
              </span>
              <span className="text-sm text-[var(--muted-foreground)]">
                {isUploading ? `${uploadProgress}%` : 'Please wait...'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[var(--primary-700)] h-2 rounded-full transition-all duration-300"
                style={{ width: isUploading ? `${uploadProgress}%` : '100%' }}
              ></div>
            </div>
            {isUploading && (
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                {uploadProgress < 50 ? 'Validating data...' :
                  uploadProgress < 70 ? 'Processing files...' :
                    'Finalizing course creation...'}
              </p>
            )}
          </div>
        )}
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

              <Select
                label="Language"
                {...register('language')}
                error={errors.language?.message}
                options={[
                  { value: 'ne', label: 'Nepali (नेपाली)' },
                  { value: 'en', label: 'English' },
                  { value: 'hi', label: 'Hindi (हिन्दी)' },
                  { value: 'mr', label: 'Marathi (मराठी)' },
                  { value: 'bn', label: 'Bengali (বাংলা)' },
                  { value: 'te', label: 'Telugu (తెలుగు)' },
                  { value: 'ta', label: 'Tamil (தமிழ்)' },
                  { value: 'gu', label: 'Gujarati (ગુજરાતી)' },
                  { value: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
                  { value: 'ml', label: 'Malayalam (മലയാളം)' },
                  { value: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
                  { value: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
                  { value: 'as', label: 'Assamese (অসমীয়া)' },
                  { value: 'mai', label: 'Maithili (मैथिली)' },
                  { value: 'bh', label: 'Bhojpuri (भोजपुरी)' },
                ]}
              />
            </div>

            <TagInput
              label="Tags"
              value={watchTags}
              onChange={(tags) => setValue('tags', tags)}
              placeholder="Add course tags..."
              suggestions={[
                'Vastu Shastra',
                'Numerology',
                'Astrology',
                'Feng Shui',
                'Meditation',
                'Yoga',
                'Spiritual',
                'Wellness',
                'Healing',
                'Energy',
                'Architecture',
                'Design',
                'Construction',
                'Home',
                'Business',
                'Success',
                'Wealth',
                'Health',
                'Relationships',
                'Career',
              ]}
              maxTags={15}
              error={errors.tags?.message}
              helperText="Add relevant tags to help students find your course"
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


            <TagInput
              label="Skills You'll Gain"
              value={watchSkills}
              onChange={(skills) => setValue('skills', skills)}
              placeholder="Add skills you'll learn..."
              suggestions={[
                'Vastu Consultation',
                'Numerology Reading',
                'Astrological Analysis',
                'Feng Shui Principles',
                'Energy Healing',
                'Meditation Techniques',
                'Yoga Practice',
                'Crystal Healing',
                'Tarot Reading',
                'Palmistry',
                'Graphology',
                'Aura Reading',
                'Chakra Balancing',
                'Mantra Chanting',
                'Ritual Practices',
                'Space Harmonization',
                'Color Therapy',
                'Sound Therapy',
                'Herbal Remedies',
                'Spiritual Counseling',
                'Business Vastu',
                'Home Vastu',
                'Office Vastu',
                'Relationship Compatibility',
                'Career Guidance',
                'Wealth Attraction',
                'Health Analysis',
                'Remedial Measures',
                'Sacred Geometry',
                'Mandala Creation',
              ]}
              maxTags={20}
              error={errors.skills?.message}
              helperText="Add skills that students will gain from this course"
            />

            {/* Special button to save basic info and jump to curriculum */}
            {!course && (
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const isValid = await validateStep(2);
                    if (isValid) {
                      const data = getValues();
                      onFormSubmit(data);
                    }
                  }}
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  Save & Build Curriculum
                </Button>
              </div>
            )}
            {/* Curriculum placeholder removed from Step 2 for clarity */}
          </div>
        </Card>
      )}

      {/* Step 3: Curriculum Builder */}
      {currentStep === 3 && (
        <Card padding="lg">
          <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Curriculum</h2>
          {course ? (
            <>
              {/* Course Info Banner */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Course saved successfully!</p>
                    <p className="text-sm text-green-600">Now add chapters and lessons to your course.</p>
                  </div>
                </div>
              </div>
              <CurriculumBuilder courseId={course.id} />
            </>
          ) : (
            <div className="text-center py-12">
              {/* Visual Icon */}
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Save Your Course First</h3>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Before adding chapters and lessons, we need to save your course details.
                Click the button below to save and continue building your curriculum.
              </p>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
                <p className="text-sm text-blue-800">
                  <strong>What happens next:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Your course will be saved as a draft
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> You can add chapters and lessons
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Publish when you're ready
                  </li>
                </ul>
              </div>

              <Button
                variant="primary"
                size="lg"
                disabled={isLoading || isSubmitting}
                isLoading={isLoading || isSubmitting}
                onClick={async (e) => {
                  e.preventDefault();
                  // Validate Steps 1 and 2 first
                  const step1Valid = await trigger(['title', 'instructorId']);
                  if (!step1Valid) {
                    setCurrentStep(1);
                    return;
                  }
                  // Save as draft
                  setValue('status', 'DRAFT');
                  await handleSubmit(onFormSubmit)(e);
                }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Course & Build Curriculum
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 4: Publish & Schedule */}
      {currentStep === 4 && (
        <Card padding="lg">
          <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Publish & Schedule</h2>

          <div className="bg-[var(--muted)]/30 rounded-xl p-6 border border-[var(--border)] mb-8">
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Course Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Title</span>
                <span className="text-sm font-medium text-[var(--foreground)]">{getValues('title') || 'Not set'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Instructor</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {instructors.find(i => i.id === getValues('instructorId'))?.name || 'Not selected'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Price</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {getValues('isFree') ? 'Free' : `Rs. ${getValues('price') || 0}`}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Level</span>
                <span className="text-sm font-medium text-[var(--foreground)]">{getValues('level') || 'Not set'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Language</span>
                <span className="text-sm font-medium text-[var(--foreground)]">{getValues('language') || 'English'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Status</span>
                <span className="text-sm font-medium">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getValues('status') === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {getValues('status') || 'DRAFT'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Publishing Options</h3>
              <Select
                label="Publish Status"
                {...register('status')}
                error={errors.status?.message}
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PUBLISHED', label: 'Published' },
                  { value: 'ONGOING', label: 'Ongoing' },
                  { value: 'ARCHIVED', label: 'Archived' },
                ]}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    id="featured"
                    {...register('featured')}
                    className="w-4 h-4 rounded text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)]"
                  />
                  <label htmlFor="featured" className="ml-3 text-sm font-semibold text-[var(--foreground)]">
                    Featured Course
                  </label>
                </div>

                <div className="flex items-center p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    id="isOngoing"
                    {...register('isOngoing')}
                    className="w-4 h-4 rounded text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)]"
                  />
                  <label htmlFor="isOngoing" className="ml-3 text-sm font-semibold text-[var(--foreground)]">
                    Ongoing Course
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Availability Schedule</h3>
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
              <p className="text-xs text-[var(--muted-foreground)]">
                Leave dates empty if the course is always available. Start date is required for scheduled courses.
              </p>
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
                disabled={isLoading || isSubmitting}
              >
                Save as Draft
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading || isSubmitting} isLoading={isLoading || isSubmitting}>
                {course ? 'Update Course' : 'Create Course'}
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
});

