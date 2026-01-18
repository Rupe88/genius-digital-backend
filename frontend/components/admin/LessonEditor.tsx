'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FileUpload } from '@/components/ui/FileUpload';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Lesson, CreateLessonData } from '@/lib/api/lessons';
import { Chapter } from '@/lib/api/chapters';
import { generateSlug } from '@/lib/utils/helpers';

interface LessonEditorProps {
  courseId: string;
  chapters: Chapter[];
  lesson?: Lesson;
  existingLessons?: Lesson[];
  onSave: (data: CreateLessonData) => Promise<void>;
  onCancel?: () => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  courseId,
  chapters,
  lesson,
  existingLessons = [],
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(lesson?.title || '');
  const [slug, setSlug] = useState(lesson?.slug || '');
  const [description, setDescription] = useState(lesson?.description || '');
  const [content, setContent] = useState(lesson?.content || '');
  const [chapterId, setChapterId] = useState(lesson?.chapterId || '');
  const [lessonType, setLessonType] = useState<Lesson['lessonType']>(
    lesson?.lessonType || 'VIDEO'
  );
  const [order, setOrder] = useState(lesson?.order?.toString() || '');
  const [isPreview, setIsPreview] = useState(lesson?.isPreview || false);
  const [isLocked, setIsLocked] = useState(lesson?.isLocked || false);
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || '');
  const [attachmentUrl, setAttachmentUrl] = useState(lesson?.attachmentUrl || '');
  const [unlockRequirement, setUnlockRequirement] = useState<string[]>(
    Array.isArray(lesson?.unlockRequirement)
      ? lesson.unlockRequirement
      : lesson?.unlockRequirement
      ? [lesson.unlockRequirement]
      : []
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!lesson && !slug) {
      setSlug(generateSlug(value));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      await onSave({
        courseId,
        chapterId: chapterId || undefined,
        title: title.trim(),
        slug: slug || generateSlug(title),
        description: description || undefined,
        content: content || undefined,
        lessonType,
        order: order ? parseInt(order) : undefined,
        isPreview,
        isLocked,
        videoUrl: videoUrl || undefined,
        attachmentUrl: attachmentUrl || undefined,
        unlockRequirement: unlockRequirement.length > 0 ? unlockRequirement : undefined,
      });
    } catch (error: any) {
      console.error('Error saving lesson:', error);
      alert(error.message || 'Failed to save lesson');
    }
  };

  const availablePrerequisites = existingLessons.filter(
    (l) => l.id !== lesson?.id && l.lessonType !== 'QUIZ'
  );

  return (
    <Card padding="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-[var(--foreground)]">
            {lesson ? 'Edit Lesson' : 'Create New Lesson'}
          </h3>
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button variant="primary" onClick={handleSave}>
              {lesson ? 'Update Lesson' : 'Create Lesson'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Title *"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Lesson title"
            required
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="lesson-slug"
            helperText="Auto-generated from title if not provided"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Chapter (Optional)"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            options={[
              { value: '', label: 'No Chapter (Uncategorized)' },
              ...chapters.map((ch) => ({ value: ch.id, label: ch.title })),
            ]}
          />
          <Select
            label="Lesson Type *"
            value={lessonType}
            onChange={(e) => setLessonType(e.target.value as Lesson['lessonType'])}
            options={[
              { value: 'VIDEO', label: 'Video' },
              { value: 'TEXT', label: 'Text' },
              { value: 'PDF', label: 'PDF' },
              { value: 'QUIZ', label: 'Quiz' },
              { value: 'ASSIGNMENT', label: 'Assignment' },
            ]}
            required
          />
        </div>

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the lesson"
          rows={2}
        />

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Content
          </label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Lesson content (supports rich text formatting)"
          />
        </div>

        {lessonType === 'VIDEO' && (
          <div className="space-y-4">
            <Input
              label="Video URL (for preview)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              helperText="YouTube, Vimeo, or direct video URL for preview"
            />
          </div>
        )}

        {(lessonType === 'PDF' || lessonType === 'ASSIGNMENT') && (
          <div className="space-y-4">
            <Input
              label="Attachment URL (for preview)"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://example.com/document.pdf"
              helperText="Direct link to PDF or document for preview"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Order"
            type="number"
            min="0"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="Auto"
            helperText="Order within chapter/course"
          />
          <div className="flex items-center space-x-2 pt-8">
            <input
              type="checkbox"
              id="isPreview"
              checked={isPreview}
              onChange={(e) => setIsPreview(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isPreview" className="text-sm font-medium text-[var(--foreground)]">
              Preview Lesson
            </label>
          </div>
          <div className="flex items-center space-x-2 pt-8">
            <input
              type="checkbox"
              id="isLocked"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isLocked" className="text-sm font-medium text-[var(--foreground)]">
              Lock Lesson
            </label>
          </div>
        </div>

        {availablePrerequisites.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Prerequisites (Lessons that must be completed first)
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-[var(--border)] rounded-lg p-3">
              {availablePrerequisites.map((prereq) => (
                <div key={prereq.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`prereq-${prereq.id}`}
                    checked={unlockRequirement.includes(prereq.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUnlockRequirement([...unlockRequirement, prereq.id]);
                      } else {
                        setUnlockRequirement(unlockRequirement.filter((id) => id !== prereq.id));
                      }
                    }}
                    className="rounded"
                  />
                  <label
                    htmlFor={`prereq-${prereq.id}`}
                    className="text-sm text-[var(--foreground)] cursor-pointer"
                  >
                    {prereq.title}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

