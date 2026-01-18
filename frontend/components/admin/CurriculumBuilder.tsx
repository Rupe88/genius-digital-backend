'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lesson, CreateLessonData } from '@/lib/api/lessons';
import { Chapter, CreateChapterData } from '@/lib/api/chapters';
import { LessonEditor } from './LessonEditor';
import { QuizBuilder } from './QuizBuilder';
import * as lessonApi from '@/lib/api/lessons';
import * as chapterApi from '@/lib/api/chapters';
import * as quizApi from '@/lib/api/quizzes';
import { showSuccess, showError } from '@/lib/utils/toast';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiLockClosed,
  HiLockOpen,
  HiEye,
  HiEyeSlash,
  HiPlay,
  HiDocument,
  HiClipboard,
  HiBars3,
  HiChevronDown,
  HiChevronUp,
} from 'react-icons/hi2';

interface CurriculumBuilderProps {
  courseId: string;
  initialChapters?: Chapter[];
  initialLessons?: Lesson[];
  onSave?: () => void;
}

interface SortableChapterProps {
  chapter: Chapter & { lessons: Lesson[] };
  onEdit: (chapter: Chapter) => void;
  onDelete: (id: string) => void;
  onToggleLock: (id: string, isLocked: boolean) => void;
  onTogglePreview: (id: string, isPreview: boolean) => void;
  onAddLesson: (chapterId: string) => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
  onRefresh: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

interface SortableLessonProps {
  lesson: Lesson;
  onEdit: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onTogglePreview: () => void;
}

function SortableLesson({ lesson, onEdit, onDelete, onToggleLock, onTogglePreview }: SortableLessonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getLessonIcon = () => {
    switch (lesson.lessonType) {
      case 'VIDEO':
        return <HiPlay className="w-5 h-5 text-blue-600" />;
      case 'PDF':
        return <HiDocument className="w-5 h-5 text-red-600" />;
      case 'QUIZ':
      case 'ASSIGNMENT':
        return <HiClipboard className="w-5 h-5 text-purple-600" />;
      default:
        return <HiDocument className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-[var(--background)] ${
        isDragging ? 'shadow-lg' : 'border-[var(--border)]'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <HiBars3 className="w-5 h-5 rotate-90" />
      </div>
      {getLessonIcon()}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--foreground)] truncate">{lesson.title}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{lesson.lessonType}</p>
      </div>
      <div className="flex items-center gap-2">
        {lesson.isPreview && (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
            Preview
          </span>
        )}
        {lesson.isLocked ? (
          <HiLockClosed
            className="w-5 h-5 text-red-500 cursor-pointer"
            onClick={onToggleLock}
            title="Unlock"
          />
        ) : (
          <HiLockOpen
            className="w-5 h-5 text-green-500 cursor-pointer"
            onClick={onToggleLock}
            title="Lock"
          />
        )}
        {lesson.isPreview ? (
          <HiEye
            className="w-5 h-5 text-blue-500 cursor-pointer"
            onClick={onTogglePreview}
            title="Remove Preview"
          />
        ) : (
          <HiEyeSlash
            className="w-5 h-5 text-gray-400 cursor-pointer"
            onClick={onTogglePreview}
            title="Set as Preview"
          />
        )}
        <button
          onClick={onEdit}
          className="text-blue-500 hover:text-blue-700"
          title="Edit"
        >
          <HiPencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="text-red-500 hover:text-red-700"
          title="Delete"
        >
          <HiTrash className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SortableChapter({
  chapter,
  onEdit,
  onDelete,
  onToggleLock,
  onTogglePreview,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onRefresh,
  isExpanded,
  onToggleExpand,
}: SortableChapterProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg bg-[var(--background)] ${
        isDragging ? 'shadow-lg' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <HiBars3 className="w-5 h-5 rotate-90" />
        </div>
        <button
          onClick={onToggleExpand}
          className="flex-shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          {isExpanded ? (
            <HiChevronUp className="w-5 h-5" />
          ) : (
            <HiChevronDown className="w-5 h-5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--foreground)]">{chapter.title}</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            {chapter.lessons?.length || 0} lessons
          </p>
        </div>
        <div className="flex items-center gap-2">
          {chapter.isPreview && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
              Preview
            </span>
          )}
          {chapter.isLocked ? (
            <HiLockClosed
              className="w-5 h-5 text-red-500 cursor-pointer"
              onClick={() => onToggleLock(chapter.id, false)}
              title="Unlock"
            />
          ) : (
            <HiLockOpen
              className="w-5 h-5 text-green-500 cursor-pointer"
              onClick={() => onToggleLock(chapter.id, true)}
              title="Lock"
            />
          )}
          <button
            onClick={() => onEdit(chapter)}
            className="text-blue-500 hover:text-blue-700"
            title="Edit"
          >
            <HiPencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(chapter.id)}
            className="text-red-500 hover:text-red-700"
            title="Delete"
          >
            <HiTrash className="w-4 h-4" />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {chapter.lessons?.map((lesson) => (
            <SortableLesson
              key={lesson.id}
              lesson={lesson}
              onEdit={() => onEditLesson(lesson)}
              onDelete={() => onDeleteLesson(lesson.id)}
              onToggleLock={async () => {
                try {
                  await lessonApi.updateLesson(lesson.id, {
                    isLocked: !lesson.isLocked,
                  });
                  onRefresh();
                } catch (error: any) {
                  showError(error.message || 'Failed to toggle lock');
                }
              }}
              onTogglePreview={async () => {
                try {
                  await lessonApi.updateLesson(lesson.id, {
                    isPreview: !lesson.isPreview,
                  });
                  onRefresh();
                } catch (error: any) {
                  showError(error.message || 'Failed to toggle preview');
                }
              }}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddLesson(chapter.id)}
            className="w-full"
          >
            <HiPlus className="w-4 h-4 mr-2" />
            Add Lesson
          </Button>
        </div>
      )}
    </div>
  );
}

export const CurriculumBuilder: React.FC<CurriculumBuilderProps> = ({
  courseId,
  initialChapters = [],
  initialLessons = [],
  onSave,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCurriculum();
  }, [courseId]);

  const loadCurriculum = async () => {
    try {
      const [chaptersData, lessonsData] = await Promise.all([
        chapterApi.getCourseChapters(courseId),
        lessonApi.getCourseLessons(courseId),
      ]);
      setChapters(chaptersData);
      setLessons(lessonsData);
      // Expand all chapters by default
      setExpandedChapters(new Set(chaptersData.map((ch) => ch.id)));
    } catch (error: any) {
      showError(error.message || 'Failed to load curriculum');
    }
  };

  const handleChapterDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex((ch) => ch.id === active.id);
    const newIndex = chapters.findIndex((ch) => ch.id === over.id);
    const reordered = arrayMove(chapters, oldIndex, newIndex);

    setChapters(reordered);

    // Update order in backend
    try {
      await Promise.all(
        reordered.map((ch, index) =>
          chapterApi.reorderChapter(ch.id, index).catch(console.error)
        )
      );
      showSuccess('Chapters reordered successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to reorder chapters');
      loadCurriculum(); // Revert on error
    }
  };

  const handleCreateChapter = async (data: CreateChapterData & { createDefaultLessons?: boolean }) => {
    try {
      // Create the chapter first
      const chapterData = {
        title: data.title,
        description: data.description,
        isLocked: data.isLocked,
        isPreview: data.isPreview,
      };
      const createdChapter = await chapterApi.createChapter({ ...chapterData, courseId });

      // Create default lesson if requested
      if (data.createDefaultLessons && createdChapter.id) {
        const defaultLessonData = {
          courseId,
          chapterId: createdChapter.id,
          title: `${data.title} - Introduction`,
          description: `Introduction to ${data.title}`,
          lessonType: 'TEXT' as const,
          isPreview: true,
          order: 1,
        };
        await lessonApi.createLesson(defaultLessonData);
      }

      showSuccess('Chapter created successfully' + (data.createDefaultLessons ? ' with default lesson' : ''));
      setIsCreatingChapter(false);
      setSelectedChapter(null);
      loadCurriculum();
    } catch (error: any) {
      showError(error.message || 'Failed to create chapter');
    }
  };

  const handleUpdateChapter = async (id: string, data: Partial<CreateChapterData>) => {
    try {
      await chapterApi.updateChapter(id, data);
      showSuccess('Chapter updated successfully');
      setSelectedChapter(null);
      loadCurriculum();
    } catch (error: any) {
      showError(error.message || 'Failed to update chapter');
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chapter? All lessons in this chapter will be moved to uncategorized.')) {
      return;
    }
    try {
      await chapterApi.deleteChapter(id);
      showSuccess('Chapter deleted successfully');
      loadCurriculum();
    } catch (error: any) {
      showError(error.message || 'Failed to delete chapter');
    }
  };

  const handleCreateLesson = async (data: CreateLessonData) => {
    try {
      await lessonApi.createLesson({ ...data, courseId });
      showSuccess('Lesson created successfully');
      setIsCreatingLesson(false);
      setSelectedLesson(null);
      loadCurriculum();
    } catch (error: any) {
      showError(error.message || 'Failed to create lesson');
    }
  };

  const handleUpdateLesson = async (id: string, data: Partial<CreateLessonData>) => {
    try {
      await lessonApi.updateLesson(id, data);
      showSuccess('Lesson updated successfully');
      setSelectedLesson(null);
      loadCurriculum();
    } catch (error: any) {
      showError(error.message || 'Failed to update lesson');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }
    try {
      await lessonApi.deleteLesson(id);
      showSuccess('Lesson deleted successfully');
      loadCurriculum();
    } catch (error: any) {
      showError(error.message || 'Failed to delete lesson');
    }
  };

  const toggleChapterExpand = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  // Group lessons by chapter
  const chaptersWithLessons = chapters.map((chapter) => ({
    ...chapter,
    lessons: lessons.filter((lesson) => lesson.chapterId === chapter.id) || [],
  }));

  const uncategorizedLessons = lessons.filter((lesson) => !lesson.chapterId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Curriculum Builder</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCreatingChapter(true)}
          >
            <HiPlus className="w-4 h-4 mr-2" />
            Add Chapter
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsCreatingLesson(true)}
          >
            <HiPlus className="w-4 h-4 mr-2" />
            Add Lesson
          </Button>
        </div>
      </div>

      {/* Chapter/Lesson Editor */}
      {(isCreatingChapter || selectedChapter || isCreatingLesson || selectedLesson) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--background)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {isCreatingChapter || selectedChapter ? (
              <ChapterEditor
                chapter={selectedChapter || undefined}
                onSave={(data) => {
                  if (selectedChapter) {
                    handleUpdateChapter(selectedChapter.id, data);
                  } else {
                    handleCreateChapter({ ...data, courseId });
                  }
                }}
                onCancel={() => {
                  setIsCreatingChapter(false);
                  setSelectedChapter(null);
                }}
              />
            ) : (
              <LessonEditor
                courseId={courseId}
                chapters={chapters}
                lesson={selectedLesson || undefined}
                existingLessons={lessons}
                onSave={async (data) => {
                  // Use isCreatingLesson to determine if we're creating or updating
                  // selectedLesson might be set but without id when creating
                  if (!isCreatingLesson && selectedLesson && selectedLesson.id) {
                    await handleUpdateLesson(selectedLesson.id, data);
                  } else {
                    await handleCreateLesson(data);
                  }
                }}
                onCancel={() => {
                  setIsCreatingLesson(false);
                  setSelectedLesson(null);
                  setShowQuizBuilder(false);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Quiz Builder Modal */}
      {showQuizBuilder && selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--background)] rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
            <QuizBuilder
              lessonId={selectedLesson.id}
              quiz={null}
              onSave={async (quizData) => {
                try {
                  await quizApi.createQuiz(quizData);
                  showSuccess('Quiz created successfully');
                  setShowQuizBuilder(false);
                  setSelectedLesson(null);
                } catch (error: any) {
                  showError(error.message || 'Failed to create quiz');
                }
              }}
              onCancel={() => {
                setShowQuizBuilder(false);
                setSelectedLesson(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Chapters List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleChapterDragEnd}
      >
        <SortableContext
          items={[...chapters.map((ch) => ch.id), ...lessons.map((l) => l.id)]}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {chaptersWithLessons.map((chapter) => (
              <SortableChapter
                key={chapter.id}
                chapter={chapter}
                onEdit={(ch) => {
                  setSelectedChapter(ch);
                  setIsCreatingChapter(false);
                }}
                onDelete={handleDeleteChapter}
                onToggleLock={async (id, isLocked) => {
                  try {
                    await chapterApi.toggleChapterLock(id, isLocked);
                    loadCurriculum();
                  } catch (error: any) {
                    showError(error.message || 'Failed to toggle lock');
                  }
                }}
                onTogglePreview={async (id, isPreview) => {
                  try {
                    await chapterApi.toggleChapterPreview(id, isPreview);
                    loadCurriculum();
                  } catch (error: any) {
                    showError(error.message || 'Failed to toggle preview');
                  }
                }}
                onAddLesson={(chapterId) => {
                  setSelectedLesson({ ...({} as Lesson), chapterId } as Lesson);
                  setIsCreatingLesson(true);
                }}
                onEditLesson={(lesson) => {
                  setSelectedLesson(lesson);
                  setIsCreatingLesson(false);
                }}
                onDeleteLesson={handleDeleteLesson}
                onRefresh={loadCurriculum}
                isExpanded={expandedChapters.has(chapter.id)}
                onToggleExpand={() => toggleChapterExpand(chapter.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Uncategorized Lessons */}
      {uncategorizedLessons.length > 0 && (
        <Card padding="lg">
          <h3 className="font-semibold text-[var(--foreground)] mb-4">Uncategorized Lessons</h3>
          <div className="space-y-2">
            {uncategorizedLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
              >
                <HiBars3 className="w-5 h-5 text-[var(--muted-foreground)] rotate-90" />
                <span className="font-medium text-[var(--foreground)]">{lesson.title}</span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setIsCreatingLesson(false);
                    }}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <HiPencil className="w-4 h-4" />
                  </button>
                  {lesson.lessonType === 'QUIZ' && (
                    <button
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setShowQuizBuilder(true);
                      }}
                      className="text-purple-500 hover:text-purple-700"
                      title="Edit Quiz"
                    >
                      <HiClipboard className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteLesson(lesson.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// Simple Chapter Editor Component
const ChapterEditor: React.FC<{
  chapter?: Chapter;
  onSave: (data: Omit<CreateChapterData, 'courseId'> & { createDefaultLessons?: boolean }) => void;
  onCancel: () => void;
}> = ({ chapter, onSave, onCancel }) => {
  const [title, setTitle] = useState(chapter?.title || '');
  const [description, setDescription] = useState(chapter?.description || '');
  const [isLocked, setIsLocked] = useState(chapter?.isLocked || false);
  const [isPreview, setIsPreview] = useState(chapter?.isPreview || false);
  const [createDefaultLessons, setCreateDefaultLessons] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    onSave({
      title: title.trim(),
      description: description || undefined,
      isLocked,
      isPreview,
      createDefaultLessons,
    });
  };

  return (
    <Card padding="lg">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">
          {chapter ? 'Edit Chapter' : 'Create New Chapter'}
        </h3>
        <Input
          label="Chapter Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="chapterLocked"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
            />
            <label htmlFor="chapterLocked">Locked</label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="chapterPreview"
              checked={isPreview}
              onChange={(e) => setIsPreview(e.target.checked)}
            />
            <label htmlFor="chapterPreview">Preview</label>
          </div>
        </div>

        {!chapter && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="createDefaultLessons"
              checked={createDefaultLessons}
              onChange={(e) => setCreateDefaultLessons(e.target.checked)}
            />
            <label htmlFor="createDefaultLessons" className="text-sm">
              Create default lesson for this chapter
            </label>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {chapter ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

