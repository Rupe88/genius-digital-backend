'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FileUpload } from '@/components/ui/FileUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

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
        videoFile,
        attachmentFile,
        unlockRequirement: unlockRequirement.length > 0 ? unlockRequirement : undefined,
      });
    } catch (error) {
      console.error('Error saving lesson:', error);
      const message = error instanceof Error ? error.message : 'Failed to save lesson';
      alert(message);
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Video URL *"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  helperText="YouTube, Vimeo, or direct video URL"
                />
              </div>
              <Input
                label="Duration (seconds)"
                type="number"
                min="0"
                value={lesson?.videoDuration?.toString() || ''}
                onChange={(e) => {
                  // Duration will be passed in save
                }}
                placeholder="e.g., 600 for 10 min"
                helperText="Auto-detected if YouTube/Vimeo"
              />
            </div>

            <div className="bg-[var(--muted)]/30 p-4 rounded-none border border-[var(--border)] border-dashed">
              <p className="text-sm font-medium text-[var(--foreground)] mb-3">Or Upload Video File</p>
              <FileUpload
                accept="video/*"
                onChange={setVideoFile}
                onRemove={() => setVideoFile(null)}
                value={videoFile}
                label="Select Video"
                helperText="MP4, WebM, OGG (Max 100MB)"
              />
              {videoFile && (
                <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-none animate-pulse"></span>
                  Ready to upload: {videoFile.name}
                </p>
              )}
            </div>

            {/* Video Preview */}
            {videoUrl && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Video Preview
                </label>
                <div className="border border-[var(--border)] rounded-none overflow-hidden bg-black aspect-video max-w-xl">
                  {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoUrl.includes('youtu.be')
                        ? videoUrl.split('youtu.be/')[1]?.split('?')[0]
                        : videoUrl.split('v=')[1]?.split('&')[0]
                        }`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : videoUrl.includes('vimeo.com') ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${videoUrl.split('vimeo.com/')[1]?.split('?')[0]}`}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">Direct video URL detected</p>
                        <p className="text-xs">Preview available after save</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {lessonType === 'TEXT' && (
          <div className="rounded-none border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Text Lesson:</strong> The content above will be displayed as the main lesson content.
              You can use rich text formatting to make it engaging.
            </p>
          </div>
        )}

        {(lessonType === 'PDF' || lessonType === 'ASSIGNMENT') && (
          <div className="space-y-4">
            <Input
              label="Attachment URL"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://example.com/document.pdf"
              helperText="Direct link to PDF or downloadable document"
            />

            <div className="bg-[var(--muted)]/30 p-4 rounded-none border border-[var(--border)] border-dashed">
              <p className="text-sm font-medium text-[var(--foreground)] mb-3">Or Upload Document</p>
              <FileUpload
                accept=".pdf,.doc,.docx,.txt"
                onChange={setAttachmentFile}
                onRemove={() => setAttachmentFile(null)}
                value={attachmentFile}
                label="Select Document"
                helperText="PDF, Word, TXT (Max 50MB)"
              />
              {attachmentFile && (
                <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-none animate-pulse"></span>
                  Ready to upload: {attachmentFile.name}
                </p>
              )}
            </div>
            {attachmentUrl && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-none">
                <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Attached Document</p>
                  <p className="text-xs text-gray-500 truncate">{attachmentUrl}</p>
                </div>
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Preview →
                </a>
              </div>
            )}
          </div>
        )}

        {lessonType === 'QUIZ' && (
          <div className="rounded-none border border-purple-200 bg-purple-50 p-4">
            <p className="text-sm text-purple-800">
              <strong>Quiz Lesson:</strong> After creating this lesson, you can add quiz questions
              using the Quiz Builder. The quiz will be automatically linked to this lesson.
            </p>
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
              className="rounded-none"
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
              className="rounded-none"
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
            <div className="space-y-2 max-h-40 overflow-y-auto border border-[var(--border)] rounded-none p-3">
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
                    className="rounded-none"
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

